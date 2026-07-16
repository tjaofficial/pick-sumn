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
    DecisionMode,
    ParticipantStatus,
    PickSession,
    PickSessionNotification,
    PickSessionNotificationKind,
    PickSessionParticipant,
    PickSessionRestaurantOption,
    PickSessionStatus,
    PickSessionVote,
)
from .serializers import (
    PickSessionCreateSerializer,
    PickSessionDetailSerializer,
    PickSessionParticipantSerializer,
    GroupVoteOptionSerializer,
    PickSessionListSerializer,
    PickSessionNotificationSerializer,
    SubmitGroupVoteSerializer,
    UpdateParticipantStatusSerializer,
)
from .services import (
    refresh_pick_session_status,
    set_current_pick_session,
)


ACTIVE_SESSION_STATUSES = (
    PickSessionStatus.DRAFT,
    PickSessionStatus.WAITING,
    PickSessionStatus.READY,
    PickSessionStatus.MATCHING,
    PickSessionStatus.VOTING,
)



def _get_group_vote_matches(
    session,
):
    if (
        session.latitude is None
        or session.longitude is None
    ):
        raise GooglePlacesError(
            "This session does not have coordinates."
        )

    preferred_primary_types = (
        get_session_google_primary_types(
            session
        )
    )

    if not preferred_primary_types:
        raise GooglePlacesError(
            "No preferred cuisines could be mapped "
            "to restaurant search types."
        )

    nearby_restaurants = search_nearby_restaurants(
        latitude=float(session.latitude),
        longitude=float(session.longitude),
        radius_miles=session.search_radius_miles,
        preferred_primary_types=(
            preferred_primary_types
        ),
        open_now=session.open_now,
        include_delivery=(
            session.include_delivery
        ),
        include_drive_through=(
            session.include_drive_through
        ),
        max_results_per_type=20,
        include_generic_fallback=False,
    )

    return score_and_sort_restaurants(
        restaurants=nearby_restaurants,
        session=session,
    )[:5]


def _prepare_group_vote_options(
    session,
):
    if session.vote_options.exists():
        if (
            session.status
            != PickSessionStatus.VOTING
        ):
            session.status = (
                PickSessionStatus.VOTING
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

        return

    scored_restaurants = (
        _get_group_vote_matches(
            session
        )
    )

    if not scored_restaurants:
        raise GooglePlacesError(
            "No eligible restaurants were found "
            "for this vote."
        )

    PickSessionRestaurantOption.objects.bulk_create(
        [
            PickSessionRestaurantOption(
                session=session,
                external_id=(
                    scored.restaurant.external_id
                ),
                name=(
                    scored.restaurant.name
                ),
                rank=index,
                match_score=(
                    scored.match_score
                ),
                restaurant_data=(
                    scored.to_dict()
                ),
            )
            for index, scored in enumerate(
                scored_restaurants,
                start=1,
            )
        ]
    )

    session.status = (
        PickSessionStatus.VOTING
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


def _create_group_vote_invites(
    session,
):
    host_name = (
        session.created_by.get_full_name()
        or getattr(
            session.created_by,
            "display_name",
            "",
        )
        or session.created_by.email
    )

    invitees = (
        session.participants.exclude(
            is_host=True,
        )
        .exclude(
            status__in=(
                ParticipantStatus.DECLINED,
                ParticipantStatus.LEFT,
            ),
        )
        .select_related(
            "user",
        )
    )

    PickSessionNotification.objects.bulk_create(
        [
            PickSessionNotification(
                user=participant.user,
                session=session,
                kind=(
                    PickSessionNotificationKind
                    .GROUP_VOTE_INVITE
                ),
                title="Group Vote Invitation",
                message=(
                    f"{host_name} invited you to vote "
                    "on where the group should eat."
                ),
            )
            for participant in invitees
        ],
        ignore_conflicts=True,
    )


def _serialize_group_vote_state(
    *,
    session,
    request,
):
    participants = list(
        session.participants.select_related(
            "user"
        )
    )

    current_participant = next(
        (
            participant
            for participant in participants
            if participant.user_id
            == request.user.id
        ),
        None,
    )

    options = (
        session.vote_options.annotate(
            vote_count=Count(
                "votes__participant",
                distinct=True,
            ),
        )
        .order_by(
            "rank",
        )
    )

    my_vote_option_id = None

    if current_participant:
        my_vote = (
            session.votes.filter(
                participant=current_participant,
            )
            .values_list(
                "option_id",
                flat=True,
            )
            .first()
        )

        if my_vote:
            my_vote_option_id = str(
                my_vote
            )

    active_participants = [
        participant
        for participant in participants
        if participant.status
        not in (
            ParticipantStatus.DECLINED,
            ParticipantStatus.LEFT,
        )
    ]

    total_votes = (
        session.votes.values(
            "participant_id",
        )
        .distinct()
        .count()
    )

    winner_option_id = None

    if (
        session.status
        == PickSessionStatus.COMPLETED
        and session.selected_restaurant_external_id
    ):
        winner = (
            session.vote_options.filter(
                external_id=(
                    session
                    .selected_restaurant_external_id
                ),
            )
            .values_list(
                "id",
                flat=True,
            )
            .first()
        )

        if winner:
            winner_option_id = str(
                winner
            )

    return {
        "session": (
            PickSessionDetailSerializer(
                session,
                context={
                    "request": request,
                },
            ).data
        ),
        "participants": (
            PickSessionParticipantSerializer(
                participants,
                many=True,
            ).data
        ),
        "options": (
            GroupVoteOptionSerializer(
                options,
                many=True,
            ).data
        ),
        "my_vote_option_id": (
            my_vote_option_id
        ),
        "total_votes": total_votes,
        "eligible_voter_count": len(
            active_participants
        ),
        "all_votes_submitted": (
            bool(active_participants)
            and total_votes
            >= len(active_participants)
        ),
        "winner_option_id": (
            winner_option_id
        ),
    }


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
        user = self.request.user

        # Hosts may access every session they created.
        # Non-hosts only receive shared Group Vote sessions.
        visible_session_ids = (
            PickSessionParticipant.objects.filter(
                Q(
                    user=user,
                    is_host=True,
                )
                | Q(
                    user=user,
                    session__decision_mode=(
                        DecisionMode.GROUP_VOTE
                    ),
                )
            )
            .exclude(
                status__in=(
                    ParticipantStatus.DECLINED,
                    ParticipantStatus.LEFT,
                ),
            )
            .values_list(
                "session_id",
                flat=True,
            )
        )

        return (
            PickSession.objects.filter(
                id__in=visible_session_ids,
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

        if (
            session.decision_mode
            == DecisionMode.GROUP_VOTE
        ):
            try:
                _prepare_group_vote_options(
                    session
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

            _create_group_vote_invites(
                session
            )

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

        session.participants.filter(
            is_current=True,
        ).update(
            is_current=False,
        )

        active_participants = (
            session.participants.exclude(
                status__in=(
                    ParticipantStatus.DECLINED,
                    ParticipantStatus.LEFT,
                ),
            )
            .select_related(
                "user",
            )
        )

        PickSessionNotification.objects.bulk_create(
            [
                PickSessionNotification(
                    user=participant.user,
                    session=session,
                    kind=(
                        PickSessionNotificationKind
                        .GROUP_VOTE_COMPLETED
                    ),
                    title="Group Vote Complete",
                    message=(
                        f"{winner.name} won the group vote."
                    ),
                )
                for participant in active_participants
            ],
            ignore_conflicts=True,
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
        detail=True,
        methods=("post",),
        url_path="prepare-vote",
    )
    @transaction.atomic
    def prepare_vote(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        if (
            session.decision_mode
            != DecisionMode.GROUP_VOTE
        ):
            return Response(
                {
                    "detail": (
                        "This session is not a "
                        "Group Vote."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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
                        "Only the host can start "
                        "the vote."
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
                        "This session can no longer "
                        "start voting."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if session.vote_options.exists():
            if (
                session.status
                != PickSessionStatus.VOTING
            ):
                session.status = (
                    PickSessionStatus.VOTING
                )

                session.save(
                    update_fields=(
                        "status",
                        "updated_at",
                    ),
                )

            return Response(
                _serialize_group_vote_state(
                    session=session,
                    request=request,
                ),
            )

        try:
            scored_restaurants = (
                _get_group_vote_matches(
                    session
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

        if not scored_restaurants:
            return Response(
                {
                    "detail": (
                        "No eligible restaurants "
                        "were found for this vote."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        PickSessionRestaurantOption.objects.bulk_create(
            [
                PickSessionRestaurantOption(
                    session=session,
                    external_id=(
                        scored.restaurant.external_id
                    ),
                    name=(
                        scored.restaurant.name
                    ),
                    rank=index,
                    match_score=(
                        scored.match_score
                    ),
                    restaurant_data=(
                        scored.to_dict()
                    ),
                )
                for index, scored in enumerate(
                    scored_restaurants,
                    start=1,
                )
            ]
        )

        session.status = (
            PickSessionStatus.VOTING
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
            _serialize_group_vote_state(
                session=session,
                request=request,
            ),
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=("get", "post"),
        url_path="vote",
    )
    @transaction.atomic
    def vote(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        if (
            session.decision_mode
            != DecisionMode.GROUP_VOTE
        ):
            return Response(
                {
                    "detail": (
                        "This session is not a "
                        "Group Vote."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant = get_object_or_404(
            PickSessionParticipant,
            session=session,
            user=request.user,
        )

        if request.method == "GET":
            return Response(
                _serialize_group_vote_state(
                    session=session,
                    request=request,
                ),
            )

        if (
            session.status
            != PickSessionStatus.VOTING
        ):
            return Response(
                {
                    "detail": (
                        "Voting is not currently open."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if participant.status in (
            ParticipantStatus.DECLINED,
            ParticipantStatus.LEFT,
        ):
            return Response(
                {
                    "detail": (
                        "You are no longer participating "
                        "in this vote."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            participant.status
            == ParticipantStatus.INVITED
        ):
            participant.status = (
                ParticipantStatus.JOINED
            )

            if not participant.joined_at:
                participant.joined_at = (
                    timezone.now()
                )

            participant.save(
                update_fields=(
                    "status",
                    "joined_at",
                    "updated_at",
                ),
            )

        serializer = SubmitGroupVoteSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        option = get_object_or_404(
            PickSessionRestaurantOption,
            id=(
                serializer.validated_data[
                    "option_id"
                ]
            ),
            session=session,
        )

        PickSessionVote.objects.update_or_create(
            session=session,
            participant=participant,
            defaults={
                "option": option,
            },
        )

        session.refresh_from_db()

        return Response(
            _serialize_group_vote_state(
                session=session,
                request=request,
            ),
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="finish-vote",
    )
    @transaction.atomic
    def finish_vote(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        if (
            session.decision_mode
            != DecisionMode.GROUP_VOTE
        ):
            return Response(
                {
                    "detail": (
                        "This session is not a "
                        "Group Vote."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_host = session.participants.filter(
            user=request.user,
            is_host=True,
        ).exists()

        if not is_host:
            return Response(
                {
                    "detail": (
                        "Only the host can finish "
                        "the vote."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if (
            session.status
            != PickSessionStatus.VOTING
        ):
            return Response(
                {
                    "detail": (
                        "Voting is not currently open."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        winner = (
            session.vote_options.annotate(
                vote_count=Count(
                    "votes__participant",
                    distinct=True,
                ),
            )
            .filter(
                vote_count__gt=0,
            )
            .order_by(
                "-vote_count",
                "-match_score",
                "rank",
            )
            .first()
        )

        if not winner:
            return Response(
                {
                    "detail": (
                        "At least one vote is required "
                        "before finishing."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.selected_restaurant_external_id = (
            winner.external_id
        )

        session.selected_restaurant_name = (
            winner.name
        )

        session.status = (
            PickSessionStatus.COMPLETED
        )

        session.completed_at = (
            timezone.now()
        )

        session.save(
            update_fields=(
                "selected_restaurant_external_id",
                "selected_restaurant_name",
                "status",
                "completed_at",
                "updated_at",
            ),
        )

        session.participants.filter(
            is_current=True,
        ).update(
            is_current=False,
        )

        return Response(
            _serialize_group_vote_state(
                session=session,
                request=request,
            ),
        )

    @action(
        detail=False,
        methods=("get",),
        url_path="notifications",
    )
    def notifications(
        self,
        request,
    ):
        notifications = (
            PickSessionNotification.objects
            .filter(
                user=request.user,
            )
            .select_related(
                "session",
            )
            .order_by(
                "-created_at",
            )[:100]
        )

        serializer = (
            PickSessionNotificationSerializer(
                notifications,
                many=True,
            )
        )

        return Response(
            {
                "unread_count": (
                    PickSessionNotification.objects
                    .filter(
                        user=request.user,
                        is_read=False,
                    )
                    .count()
                ),
                "notifications": (
                    serializer.data
                ),
            },
        )

    @action(
        detail=False,
        methods=("get",),
        url_path="notifications/unread",
    )
    def unread_notifications(
        self,
        request,
    ):
        notifications = (
            PickSessionNotification.objects
            .filter(
                user=request.user,
                is_read=False,
            )
            .select_related(
                "session",
            )
            .order_by(
                "-created_at",
            )
        )

        serializer = (
            PickSessionNotificationSerializer(
                notifications,
                many=True,
            )
        )

        return Response(
            {
                "unread_count": (
                    notifications.count()
                ),
                "notifications": (
                    serializer.data
                ),
            },
        )

    @action(
        detail=False,
        methods=("post",),
        url_path=(
            r"notifications/"
            r"(?P<notification_id>[^/.]+)/read"
        ),
    )
    def mark_notification_read(
        self,
        request,
        notification_id=None,
    ):
        notification = get_object_or_404(
            PickSessionNotification,
            id=notification_id,
            user=request.user,
        )

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = (
                timezone.now()
            )

            notification.save(
                update_fields=(
                    "is_read",
                    "read_at",
                ),
            )

        serializer = (
            PickSessionNotificationSerializer(
                notification,
            )
        )

        return Response(
            serializer.data,
        )

    @action(
        detail=False,
        methods=("post",),
        url_path="notifications/read-all",
    )
    def mark_all_notifications_read(
        self,
        request,
    ):
        now = timezone.now()

        PickSessionNotification.objects.filter(
            user=request.user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=now,
        )

        return Response(
            {
                "detail": (
                    "All notifications marked read."
                ),
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
        url_path="current",
    )
    def current(
        self,
        request,
    ):
        session = (
            self.get_queryset()
            .filter(
                status__in=(
                    ACTIVE_SESSION_STATUSES
                ),
                participants__user=request.user,
                participants__is_current=True,
            )
            .first()
        )

        if session is None:
            # Backfill a sensible current session for users who already
            # had active sessions before this feature was added.
            session = (
                self.get_queryset()
                .filter(
                    status__in=(
                        ACTIVE_SESSION_STATUSES
                    ),
                )
                .order_by(
                    "-created_at",
                )
                .first()
            )

            if session is not None:
                set_current_pick_session(
                    user=request.user,
                    session=session,
                )

        if session is None:
            return Response(
                {
                    "detail": (
                        "You do not have a current "
                        "active session."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            PickSessionDetailSerializer(
                session,
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
        url_path="make-current",
    )
    def make_current(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        try:
            set_current_pick_session(
                user=request.user,
                session=session,
            )
        except ValueError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = self.get_queryset().get(
            id=session.id,
        )

        serializer = (
            PickSessionDetailSerializer(
                session,
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

        if new_status in (
            ParticipantStatus.DECLINED,
            ParticipantStatus.LEFT,
        ) and participant.is_current:
            participant.is_current = False

            participant.save(
                update_fields=(
                    "is_current",
                    "updated_at",
                ),
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