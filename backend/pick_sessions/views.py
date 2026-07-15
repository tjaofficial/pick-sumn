from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .google_places import (
    GooglePlacesError,
    search_nearby_restaurants,
)
from .matching import (
    get_session_google_primary_types,
    score_and_sort_restaurants,
)
from .models import (
    ParticipantStatus,
    PickSession,
    PickSessionParticipant,
    PickSessionStatus,
)
from .serializers import (
    PickSessionCreateSerializer,
    PickSessionDetailSerializer,
    PickSessionListSerializer,
    UpdateParticipantStatusSerializer,
)
from .services import refresh_pick_session_status


ACTIVE_SESSION_STATUSES = (
    PickSessionStatus.DRAFT,
    PickSessionStatus.WAITING,
    PickSessionStatus.READY,
    PickSessionStatus.MATCHING,
    PickSessionStatus.VOTING,
)


class PickSessionViewSet(viewsets.ModelViewSet):
    permission_classes = (
        IsAuthenticated,
    )

    lookup_field = "id"

    http_method_names = (
        "get",
        "post",
        "patch",
        "delete",
        "head",
        "options",
    )

    def get_queryset(self):
        return (
            PickSession.objects.filter(
                participants__user=self.request.user,
            )
            .select_related(
                "group",
                "created_by",
            )
            .prefetch_related(
                "participants__user",
                "cuisine_filters__cuisine",
            )
            .annotate(
                active_participant_count=Count(
                    "participants",
                    filter=Q(
                        participants__status__in=(
                            ParticipantStatus.INVITED,
                            ParticipantStatus.JOINED,
                            ParticipantStatus.READY,
                        ),
                    ),
                    distinct=True,
                ),
            )
            .distinct()
        )

    def get_serializer_class(self):
        if self.action == "create":
            return PickSessionCreateSerializer

        if self.action == "retrieve":
            return PickSessionDetailSerializer

        if self.action == "update_status":
            return UpdateParticipantStatusSerializer

        return PickSessionListSerializer

    @transaction.atomic
    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        serializer = PickSessionCreateSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True,
        )

        session = serializer.save()

        now = timezone.now()

        # First find the IDs through the participant table.
        # This avoids joining PickSession directly and therefore
        # avoids needing DISTINCT on a SELECT FOR UPDATE query.
        older_hosted_session_ids = list(
            PickSessionParticipant.objects
            .filter(
                user=request.user,
                is_host=True,
                session__status__in=(
                    ACTIVE_SESSION_STATUSES
                ),
            )
            .exclude(
                session_id=session.id,
            )
            .values_list(
                "session_id",
                flat=True,
            )
        )

        if older_hosted_session_ids:
            # Lock the PickSession rows directly. This query has
            # no DISTINCT clause, so PostgreSQL allows FOR UPDATE.
            locked_session_ids = list(
                PickSession.objects
                .select_for_update()
                .filter(
                    id__in=(
                        older_hosted_session_ids
                    ),
                )
                .values_list(
                    "id",
                    flat=True,
                )
            )

            PickSession.objects.filter(
                id__in=locked_session_ids,
            ).update(
                status=(
                    PickSessionStatus.CANCELLED
                ),
                completed_at=now,
                updated_at=now,
            )

        session = self.get_queryset().get(
            id=session.id,
        )

        response_serializer = (
            PickSessionDetailSerializer(
                session,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    def perform_destroy(
        self,
        instance,
    ):
        now = timezone.now()

        instance.status = (
            PickSessionStatus.CANCELLED
        )

        instance.completed_at = now

        instance.save(
            update_fields=(
                "status",
                "completed_at",
                "updated_at",
            ),
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs,
    ):
        session = self.get_object()

        is_host = (
            session.participants.filter(
                user=request.user,
                is_host=True,
            ).exists()
        )

        if not is_host:
            return Response(
                {
                    "detail": (
                        "Only the session host can cancel "
                        "this Pick Session."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        self.perform_destroy(
            session,
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="start-matching",
    )
    def start_matching(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        host_participant = (
            session.participants.filter(
                user=request.user,
                is_host=True,
            ).first()
        )

        if not host_participant:
            return Response(
                {
                    "detail": (
                        "Only the session host can "
                        "start matching."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if session.status in (
            PickSessionStatus.COMPLETED,
            PickSessionStatus.CANCELLED,
            PickSessionStatus.EXPIRED,
        ):
            return Response(
                {
                    "detail": (
                        "This Pick Session can no longer "
                        "start matching."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            session.status
            == PickSessionStatus.MATCHING
        ):
            return Response(
                {
                    "id": str(session.id),
                    "status": session.status,
                    "status_display": (
                        session.get_status_display()
                    ),
                },
            )

        session.status = (
            PickSessionStatus.MATCHING
        )

        if not session.started_at:
            session.started_at = (
                timezone.now()
            )

        session.save(
            update_fields=(
                "status",
                "started_at",
                "updated_at",
            ),
        )

        return Response(
            {
                "id": str(session.id),
                "status": session.status,
                "status_display": (
                    session.get_status_display()
                ),
            },
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="matches",
    )
    def matches(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        if session.status in (
            PickSessionStatus.COMPLETED,
            PickSessionStatus.CANCELLED,
            PickSessionStatus.EXPIRED,
        ):
            return Response(
                {
                    "detail": (
                        "Matches cannot be generated "
                        "for this session."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            session.latitude is None
            or session.longitude is None
        ):
            return Response(
                {
                    "detail": (
                        "This session does not have "
                        "coordinates. Use Current Location "
                        "when setting the filters."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            session.status
            != PickSessionStatus.MATCHING
        ):
            session.status = (
                PickSessionStatus.MATCHING
            )

            if not session.started_at:
                session.started_at = (
                    timezone.now()
                )

            session.save(
                update_fields=(
                    "status",
                    "started_at",
                    "updated_at",
                ),
            )

        preferred_primary_types = (
            get_session_google_primary_types(
                session
            )
        )

        if not preferred_primary_types:
            return Response(
                {
                    "detail": (
                        "No preferred cuisines could be "
                        "mapped to restaurant search types. "
                        "Add at least one supported cuisine "
                        "preference."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            nearby_restaurants = (
                search_nearby_restaurants(
                    latitude=float(
                        session.latitude
                    ),
                    longitude=float(
                        session.longitude
                    ),
                    radius_miles=(
                        session.search_radius_miles
                    ),
                    preferred_primary_types=(
                        preferred_primary_types
                    ),
                    open_now=session.open_now,
                    include_delivery=(
                        session.include_delivery
                    ),
                    include_drive_through=(
                        session
                        .include_drive_through
                    ),
                    max_results_per_type=20,
                    include_generic_fallback=False,
                )
            )
        except GooglePlacesError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=(
                    status.HTTP_502_BAD_GATEWAY
                ),
            )

        scored_restaurants = (
            score_and_sort_restaurants(
                restaurants=(
                    nearby_restaurants
                ),
                session=session,
            )
        )

        matches = [
            scored_restaurant.to_dict()
            for scored_restaurant
            in scored_restaurants
        ]

        return Response(
            {
                "session": {
                    "id": str(session.id),
                    "title": session.title,
                    "status": session.status,
                    "status_display": (
                        session
                        .get_status_display()
                    ),
                    "decision_mode": (
                        session.decision_mode
                    ),
                    "location_label": (
                        session.location_label
                    ),
                    "search_radius_miles": (
                        session
                        .search_radius_miles
                    ),
                },
                "search": {
                    "preferred_primary_types": (
                        preferred_primary_types
                    ),
                    "candidate_count": len(
                        nearby_restaurants
                    ),
                    "scored_match_count": len(
                        matches
                    ),
                },
                "match_count": len(matches),
                "matches": matches,
            },
        )

    @action(
        detail=False,
        methods=("get",),
        url_path="active",
    )
    def active(
        self,
        request,
    ):
        sessions = (
            self.get_queryset()
            .filter(
                status__in=(
                    ACTIVE_SESSION_STATUSES
                ),
            )
            .order_by(
                "-created_at",
            )
        )

        serializer = (
            PickSessionListSerializer(
                sessions,
                many=True,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            serializer.data,
        )

    @action(
        detail=False,
        methods=("get",),
        url_path="recent",
    )
    def recent(
        self,
        request,
    ):
        sessions = (
            self.get_queryset()
            .filter(
                status__in=(
                    PickSessionStatus.COMPLETED,
                    PickSessionStatus.CANCELLED,
                    PickSessionStatus.EXPIRED,
                ),
            )
            .order_by(
                "-completed_at",
                "-updated_at",
                "-created_at",
            )
        )

        serializer = (
            PickSessionListSerializer(
                sessions,
                many=True,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            serializer.data,
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="participant-status",
    )
    def update_status(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        serializer = (
            UpdateParticipantStatusSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        participant = get_object_or_404(
            PickSessionParticipant,
            session=session,
            user=request.user,
        )

        new_status = (
            serializer.validated_data[
                "status"
            ]
        )

        participant.status = new_status

        update_fields = [
            "status",
            "updated_at",
        ]

        if (
            new_status
            == ParticipantStatus.JOINED
        ):
            participant.joined_at = (
                timezone.now()
            )

            update_fields.append(
                "joined_at",
            )

        if (
            new_status
            == ParticipantStatus.READY
        ):
            if not participant.joined_at:
                participant.joined_at = (
                    timezone.now()
                )

                update_fields.append(
                    "joined_at",
                )

            participant.ready_at = (
                timezone.now()
            )

            update_fields.append(
                "ready_at",
            )

        participant.save(
            update_fields=update_fields,
        )

        refresh_pick_session_status(
            session,
        )

        session.refresh_from_db()

        return Response(
            {
                "participant": {
                    "status": participant.status,
                    "status_display": (
                        participant
                        .get_status_display()
                    ),
                },
                "session": {
                    "status": session.status,
                    "status_display": (
                        session
                        .get_status_display()
                    ),
                },
            },
        )