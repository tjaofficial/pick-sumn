import logging
from concurrent.futures import ThreadPoolExecutor

from accounts.models import UserAppSettings

from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .google_places import (
    GooglePlacesError,
    enrich_restaurants_with_dietary_details,
    merge_restaurant_results,
    search_dietary_restaurants,
    search_dining_style_restaurants,
    search_nearby_restaurants,
)
from .menu_intelligence import (
    analyze_official_menus,
)
from .matching import (
    get_session_dietary_requirements,
    get_session_google_primary_types,
    get_session_preferred_cuisine_slugs,
    get_session_preferred_dining_style_slugs,
    get_session_requested_dietary_slugs,
    score_and_sort_restaurants,
)
from .models import (
    DecisionMode,
    ParticipantStatus,
    PickSession,
    PickSessionNotification,
    PickSessionAnalyticsEventType,
    PickSessionNotificationKind,
    PickSessionParticipant,
    PickSessionRestaurantOption,
    PickSessionStatus,
    SelectionMethod,
    PickSessionVote,
    DietaryReportModerationStatus,
    RestaurantDietaryProfile,
    RestaurantDietaryReport,
)
from .serializers import (
    PickSessionCreateSerializer,
    PickSessionDetailSerializer,
    PickSessionParticipantSerializer,
    GroupVoteOptionSerializer,
    PickSessionListSerializer,
    PickSessionNotificationSerializer,
    SelectRestaurantSerializer,
    SubmitGroupVoteSerializer,
    UpdateParticipantStatusSerializer,
    RestaurantDietaryReportSerializer,
)
from .services import (
    refresh_pick_session_status,
    set_current_pick_session,
    record_pick_session_event,
)


logger = logging.getLogger(__name__)


ACTIVE_SESSION_STATUSES = (
    PickSessionStatus.DRAFT,
    PickSessionStatus.WAITING,
    PickSessionStatus.READY,
    PickSessionStatus.MATCHING,
    PickSessionStatus.VOTING,
)




MATCH_SEARCH_CACHE_SECONDS = 30 * 60
MATCH_SEARCH_CACHE_VERSION = "v7"


def _get_session_search_cache_key(
    session,
) -> str:
    return (
        "pick-sumn:session-search:"
        f"{MATCH_SEARCH_CACHE_VERSION}:"
        f"{session.pk}"
    )


def _get_enriched_session_restaurants(
    session,
):
    if (
        session.latitude is None
        or session.longitude is None
    ):
        raise GooglePlacesError(
            "This session does not have coordinates."
        )

    cache_key = (
        _get_session_search_cache_key(
            session
        )
    )

    cached_result = cache.get(
        cache_key
    )

    if cached_result is not None:
        return cached_result

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

    dining_style_slugs = (
        get_session_preferred_dining_style_slugs(
            session
        )
    )

    dietary_slugs = (
        get_session_requested_dietary_slugs(
            session
        )
    )

    (
        required_dietary_slugs,
        preferred_dietary_slugs,
    ) = get_session_dietary_requirements(
        session
    )

    latitude = float(session.latitude)
    longitude = float(session.longitude)

    search_arguments = {
        "latitude": latitude,
        "longitude": longitude,
        "radius_miles": (
            session.search_radius_miles
        ),
        "open_now": session.open_now,
        "include_delivery": (
            session.include_delivery
        ),
        "include_drive_through": (
            session.include_drive_through
        ),
    }

    with ThreadPoolExecutor(
        max_workers=3
    ) as executor:
        nearby_future = executor.submit(
            search_nearby_restaurants,
            **search_arguments,
            preferred_primary_types=(
                preferred_primary_types
            ),
            max_results_per_type=20,
            include_generic_fallback=True,
        )

        dining_style_future = (
            executor.submit(
                search_dining_style_restaurants,
                **search_arguments,
                dining_style_slugs=(
                    dining_style_slugs
                ),
                location_label=(
                    session.location_label
                ),
            )
        )

        dietary_future = None

        if dietary_slugs:
            dietary_future = executor.submit(
                search_dietary_restaurants,
                **search_arguments,
                dietary_slugs=(
                    dietary_slugs
                ),
                preferred_cuisine_slugs=(
                    get_session_preferred_cuisine_slugs(
                        session
                    )
                ),
                location_label=(
                    session.location_label
                ),
            )

        nearby_restaurants = (
            nearby_future.result()
        )

        dining_style_restaurants = (
            dining_style_future.result()
        )

        dietary_restaurants = (
            dietary_future.result()
            if dietary_future is not None
            else []
        )

    merged_restaurants = (
        merge_restaurant_results(
            nearby_restaurants,
            dining_style_restaurants,
            dietary_restaurants,
        )
    )

    preliminary_scored = (
        score_and_sort_restaurants(
            restaurants=merged_restaurants,
            session=session,
        )
    )

    ordered_restaurants = [
        item.restaurant
        for item in preliminary_scored
    ]

    try:
        enriched_restaurants = (
            enrich_restaurants_with_dietary_details(
                ordered_restaurants,
                limit=15 if dietary_slugs else 0,
                max_workers=6,
            )
        )
    except Exception as error:
        logger.exception(
            (
                "Dietary review enrichment failed "
                "for pick session %s: %s"
            ),
            session.pk,
            error,
        )

        enriched_restaurants = (
            ordered_restaurants
        )

    if dietary_slugs:
        try:
            analyze_official_menus(
                restaurants=(
                    enriched_restaurants
                ),
                dietary_slugs=(
                    dietary_slugs
                ),
                limit=4,
                max_workers=4,
            )
        except Exception as error:
            logger.exception(
                (
                    "Official menu analysis failed "
                    "for pick session %s: %s"
                ),
                session.pk,
                error,
            )

    result = (
        enriched_restaurants,
        preferred_primary_types,
        dietary_slugs,
        required_dietary_slugs,
        preferred_dietary_slugs,
    )

    cache.set(
        cache_key,
        result,
        timeout=(
            MATCH_SEARCH_CACHE_SECONDS
        ),
    )

    return result


def _get_group_vote_matches(
    session,
):
    (
        restaurants,
        _preferred_primary_types,
        _dietary_slugs,
        _required_dietary_slugs,
        _preferred_dietary_slugs,
    ) = _get_enriched_session_restaurants(
        session
    )

    return score_and_sort_restaurants(
        restaurants=restaurants,
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


def _get_user_notification_settings(
    user,
):
    settings_object, _ = (
        UserAppSettings.objects.get_or_create(
            user=user,
        )
    )

    return settings_object


def _notification_enabled(
    *,
    user,
    field_name,
) -> bool:
    settings_object = (
        _get_user_notification_settings(
            user
        )
    )

    return bool(
        getattr(
            settings_object,
            field_name,
            True,
        )
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

    notification_rows = []

    for participant in invitees:
        if not _notification_enabled(
            user=participant.user,
            field_name=(
                "notification_pick_session_invites"
            ),
        ):
            continue

        notification_rows.append(
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
        )

    PickSessionNotification.objects.bulk_create(
        notification_rows,
        ignore_conflicts=True,
    )


def _create_group_vote_started_notifications(
    session,
):
    participants = (
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

    notification_rows = []

    for participant in participants:
        if not _notification_enabled(
            user=participant.user,
            field_name=(
                "notification_group_vote_started"
            ),
        ):
            continue

        notification_rows.append(
            PickSessionNotification(
                user=participant.user,
                session=session,
                kind=(
                    PickSessionNotificationKind
                    .GROUP_VOTE_STARTED
                ),
                title="Group Vote Started",
                message=(
                    "Your group vote is ready. "
                    "Cast your vote now."
                ),
            )
        )

    PickSessionNotification.objects.bulk_create(
        notification_rows,
        ignore_conflicts=True,
    )


def _create_group_vote_result_notifications(
    *,
    session,
    winner,
):
    participants = (
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

    notification_rows = []

    for participant in participants:
        if not _notification_enabled(
            user=participant.user,
            field_name=(
                "notification_session_results"
            ),
        ):
            continue

        notification_rows.append(
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
        )

    PickSessionNotification.objects.bulk_create(
        notification_rows,
        ignore_conflicts=True,
    )


def _create_restaurant_selected_notifications(
    session,
):
    participants = (
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

    rows = []

    for participant in participants:
        if not _notification_enabled(
            user=participant.user,
            field_name=(
                "notification_session_results"
            ),
        ):
            continue

        rows.append(
            PickSessionNotification(
                user=participant.user,
                session=session,
                kind=(
                    PickSessionNotificationKind
                    .RESTAURANT_SELECTED
                ),
                title="Restaurant Selected",
                message=(
                    f"{session.selected_restaurant_name} "
                    "is where your group is eating."
                ),
            )
        )

    PickSessionNotification.objects.bulk_create(
        rows,
        ignore_conflicts=True,
    )


def _record_search_and_impressions(
    *,
    session,
    user,
    matches,
):
    filter_data = {
        "latitude": (
            float(session.latitude)
            if session.latitude is not None
            else None
        ),
        "longitude": (
            float(session.longitude)
            if session.longitude is not None
            else None
        ),
        "location_label": (
            session.location_label
        ),
        "radius_miles": (
            session.search_radius_miles
        ),
        "price_min": session.price_min,
        "price_max": session.price_max,
        "open_now": session.open_now,
        "decision_mode": (
            session.decision_mode
        ),
        "participant_count": (
            session.participant_count
        ),
        "cuisines": (
            get_session_preferred_cuisine_slugs(
                session
            )
        ),
        "dining_styles": (
            get_session_preferred_dining_style_slugs(
                session
            )
        ),
        "dietary_requirements": (
            get_session_requested_dietary_slugs(
                session
            )
        ),
    }

    record_pick_session_event(
        session=session,
        user=user,
        event_type=(
            PickSessionAnalyticsEventType
            .SEARCH_STARTED
        ),
        event_data=filter_data,
        dedupe_key=(
            f"session:{session.id}:search"
        ),
    )

    for position, restaurant in enumerate(
        matches,
        start=1,
    ):
        record_pick_session_event(
            session=session,
            user=user,
            event_type=(
                PickSessionAnalyticsEventType
                .RESTAURANT_IMPRESSION
            ),
            restaurant_external_id=(
                restaurant.get(
                    "external_id",
                    "",
                )
            ),
            restaurant_name=(
                restaurant.get(
                    "name",
                    "",
                )
            ),
            event_data={
                "position": position,
                "match_score": (
                    restaurant.get(
                        "match_score"
                    )
                ),
                "distance_miles": (
                    restaurant.get(
                        "distance_miles"
                    )
                ),
            },
            dedupe_key=(
                f"session:{session.id}:"
                f"impression:"
                f"{restaurant.get('external_id', '')}"
            ),
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
            (
                enriched_restaurants,
                preferred_primary_types,
                dietary_slugs,
                required_dietary_slugs,
                preferred_dietary_slugs,
            ) = _get_enriched_session_restaurants(
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

        scored_restaurants = (
            score_and_sort_restaurants(
                restaurants=(
                    enriched_restaurants
                ),
                session=session,
            )
        )

        matches = [
            scored_restaurant.to_dict()
            for scored_restaurant
            in scored_restaurants
        ]

        target_positions = [
            {
                "position": index + 1,
                "name": match.get("name"),
                "match_score": match.get("match_score"),
                "external_id": match.get("external_id"),
            }
            for index, match in enumerate(matches)
            if "4th tavern"
            in str(
                match.get("name")
                or ""
            ).lower()
        ]

        logger.warning(
            (
                "[4TH-TAVERN-RESPONSE] session=%s "
                "decision_mode=%s match_count=%s "
                "target_positions=%s"
            ),
            session.id,
            session.decision_mode,
            len(matches),
            target_positions,
        )

        _record_search_and_impressions(
            session=session,
            user=request.user,
            matches=matches,
        )

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
                    "requested_dietary_slugs": (
                        dietary_slugs
                    ),
                    "required_dietary_slugs": (
                        required_dietary_slugs
                    ),
                    "preferred_dietary_slugs": (
                        preferred_dietary_slugs
                    ),
                },
                "search": {
                    "preferred_primary_types": (
                        preferred_primary_types
                    ),
                    "candidate_count": len(
                        enriched_restaurants
                    ),
                    "dietary_queries": (
                        dietary_slugs
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
        url_path="select-restaurant",
    )
    @transaction.atomic
    def select_restaurant(
        self,
        request,
        id=None,
    ):
        session = self.get_object()

        is_host = session.participants.filter(
            user=request.user,
            is_host=True,
        ).exists()

        if not is_host:
            return Response(
                {
                    "detail": (
                        "Only the session host can "
                        "select the restaurant."
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
                        "This Pick Session can no "
                        "longer be completed."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            session.decision_mode
            == DecisionMode.GROUP_VOTE
        ):
            return Response(
                {
                    "detail": (
                        "Group Vote sessions are completed "
                        "through the vote result."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SelectRestaurantSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        selection_method = (
            serializer.validated_data[
                "selection_method"
            ]
        )

        expected_method = (
            SelectionMethod.SURPRISE_ME
            if session.decision_mode
            == DecisionMode.PICK_FOR_US
            else SelectionMethod.RANKED_MANUAL
        )

        if selection_method != expected_method:
            return Response(
                {
                    "detail": (
                        "The selection method does not "
                        "match this session."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            (
                restaurants,
                _primary_types,
                _dietary_slugs,
                _required_dietary,
                _preferred_dietary,
            ) = _get_enriched_session_restaurants(
                session
            )
        except GooglePlacesError as error:
            return Response(
                {
                    "detail": str(error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        scored = score_and_sort_restaurants(
            restaurants=restaurants,
            session=session,
        )

        external_id = (
            serializer.validated_data[
                "external_id"
            ]
        )

        selected = next(
            (
                item
                for item in scored
                if item.restaurant.external_id
                == external_id
            ),
            None,
        )

        if selected is None:
            return Response(
                {
                    "detail": (
                        "That restaurant is not a current "
                        "match for this session."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        restaurant_data = selected.to_dict()
        now = timezone.now()

        session.selected_restaurant_external_id = (
            selected.restaurant.external_id
        )
        session.selected_restaurant_name = (
            selected.restaurant.name
        )
        session.selected_restaurant_data = (
            restaurant_data
        )
        session.selection_method = (
            selection_method
        )
        session.selected_by = (
            request.user
        )
        session.selected_at = now
        session.status = (
            PickSessionStatus.COMPLETED
        )
        session.completed_at = now

        session.save(
            update_fields=(
                "selected_restaurant_external_id",
                "selected_restaurant_name",
                "selected_restaurant_data",
                "selection_method",
                "selected_by",
                "selected_at",
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

        _create_restaurant_selected_notifications(
            session
        )

        record_pick_session_event(
            session=session,
            user=request.user,
            event_type=(
                PickSessionAnalyticsEventType
                .RESTAURANT_SELECTED
            ),
            restaurant_external_id=(
                session
                .selected_restaurant_external_id
            ),
            restaurant_name=(
                session
                .selected_restaurant_name
            ),
            event_data={
                "selection_method": (
                    selection_method
                ),
                "match_score": (
                    restaurant_data.get(
                        "match_score"
                    )
                ),
                "participant_count": (
                    session.participant_count
                ),
            },
            dedupe_key=(
                f"session:{session.id}:selected"
            ),
        )

        record_pick_session_event(
            session=session,
            user=request.user,
            event_type=(
                PickSessionAnalyticsEventType
                .SESSION_COMPLETED
            ),
            restaurant_external_id=(
                session
                .selected_restaurant_external_id
            ),
            restaurant_name=(
                session
                .selected_restaurant_name
            ),
            event_data={
                "selection_method": (
                    selection_method
                ),
            },
            dedupe_key=(
                f"session:{session.id}:completed"
            ),
        )

        refreshed = self.get_queryset().get(
            id=session.id,
        )

        return Response(
            PickSessionDetailSerializer(
                refreshed,
                context={
                    "request": request,
                },
            ).data,
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="restaurant-detail-view",
    )
    def restaurant_detail_view(
        self,
        request,
        id=None,
    ):
        session = self.get_object()
        external_id = str(
            request.data.get(
                "external_id",
                "",
            )
        ).strip()
        restaurant_name = str(
            request.data.get(
                "restaurant_name",
                "",
            )
        ).strip()

        if not external_id:
            return Response(
                {
                    "detail": (
                        "A restaurant ID is required."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        record_pick_session_event(
            session=session,
            user=request.user,
            event_type=(
                PickSessionAnalyticsEventType
                .RESTAURANT_DETAIL_VIEWED
            ),
            restaurant_external_id=(
                external_id
            ),
            restaurant_name=(
                restaurant_name
            ),
            event_data={
                "decision_mode": (
                    session.decision_mode
                ),
            },
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
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

                _create_group_vote_started_notifications(
                    session
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

        _create_group_vote_started_notifications(
            session
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

        record_pick_session_event(
            session=session,
            user=request.user,
            event_type=(
                PickSessionAnalyticsEventType
                .VOTE_CAST
            ),
            restaurant_external_id=(
                option.external_id
            ),
            restaurant_name=(
                option.name
            ),
            event_data={
                "option_id": str(
                    option.id
                ),
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

        session.selected_restaurant_data = (
            winner.restaurant_data
        )

        session.selection_method = (
            SelectionMethod.GROUP_VOTE
        )

        session.selected_by = (
            request.user
        )

        session.selected_at = (
            timezone.now()
        )

        session.status = (
            PickSessionStatus.COMPLETED
        )

        session.completed_at = (
            session.selected_at
        )

        session.save(
            update_fields=(
                "selected_restaurant_external_id",
                "selected_restaurant_name",
                "selected_restaurant_data",
                "selection_method",
                "selected_by",
                "selected_at",
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

        _create_group_vote_result_notifications(
            session=session,
            winner=winner,
        )

        record_pick_session_event(
            session=session,
            user=request.user,
            event_type=(
                PickSessionAnalyticsEventType
                .RESTAURANT_SELECTED
            ),
            restaurant_external_id=(
                winner.external_id
            ),
            restaurant_name=(
                winner.name
            ),
            event_data={
                "selection_method": (
                    SelectionMethod.GROUP_VOTE
                ),
                "vote_count": (
                    winner.vote_count
                ),
                "participant_count": (
                    session.participant_count
                ),
            },
            dedupe_key=(
                f"session:{session.id}:selected"
            ),
        )

        record_pick_session_event(
            session=session,
            user=request.user,
            event_type=(
                PickSessionAnalyticsEventType
                .SESSION_COMPLETED
            ),
            restaurant_external_id=(
                winner.external_id
            ),
            restaurant_name=(
                winner.name
            ),
            event_data={
                "selection_method": (
                    SelectionMethod.GROUP_VOTE
                ),
            },
            dedupe_key=(
                f"session:{session.id}:completed"
            ),
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
                status=(
                    PickSessionStatus.COMPLETED
                ),
                selected_restaurant_external_id__gt="",
            )
            .order_by(
                "-completed_at",
                "-updated_at",
                "-created_at",
            )[:20]
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

def _normalize_dietary_slug(
    value,
):
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("_", "-")
        .replace(" ", "-")
    )


def _serialize_official_dietary_profile(
    profile,
):
    if profile is None:
        return None

    return {
        "external_place_id": (
            profile.external_place_id
        ),
        "restaurant_name": (
            profile.restaurant_name
        ),
        "dietary_slug": (
            profile.dietary_slug
        ),
        "confidence_score": (
            profile.confidence_score
        ),
        "dedicated_facility": (
            profile.dedicated_facility
        ),
        "official_menu_found": (
            profile.official_menu_found
        ),
        "official_source_url": (
            profile.official_source_url
        ),
        "menu_items": (
            profile.menu_items
            or []
        ),
        "status": profile.status,
        "last_checked_at": (
            profile.last_checked_at
        ),
        "expires_at": (
            profile.expires_at
        ),
        "evidence": [
            {
                "id": evidence.id,
                "source_type": (
                    evidence.source_type
                ),
                "claim_type": (
                    evidence.claim_type
                ),
                "summary": evidence.summary,
                "source_url": (
                    evidence.source_url
                ),
                "confidence": (
                    evidence.confidence
                ),
                "observed_at": (
                    evidence.observed_at
                ),
                "expires_at": (
                    evidence.expires_at
                ),
            }
            for evidence
            in profile.evidence.all()
        ],
    }


def _get_community_summary(
    reports,
):
    report_list = list(reports)

    total_reports = len(
        report_list
    )

    accommodated_count = sum(
        report.outcome
        in (
            "accommodated",
            "partially_accommodated",
        )
        for report in report_list
    )

    concern_count = sum(
        report.cross_contact_concern
        or report.restaurant_could_not_accommodate
        or report.reaction_after_eating
        for report in report_list
    )

    return {
        "total_reports": (
            total_reports
        ),
        "accommodated_count": (
            accommodated_count
        ),
        "concern_count": (
            concern_count
        ),
        "items_clearly_labeled_count": sum(
            report.items_clearly_labeled
            for report in report_list
        ),
        "staff_understood_count": sum(
            report.staff_understood
            for report in report_list
        ),
        "dedicated_fryer_count": sum(
            report.dedicated_fryer
            for report in report_list
        ),
        "separate_preparation_area_count": sum(
            report.separate_preparation_area
            for report in report_list
        ),
        "gloves_changed_count": sum(
            report.gloves_changed
            for report in report_list
        ),
        "cross_contact_concern_count": sum(
            report.cross_contact_concern
            for report in report_list
        ),
        "could_not_accommodate_count": sum(
            report.restaurant_could_not_accommodate
            for report in report_list
        ),
        "reaction_count": sum(
            report.reaction_after_eating
            for report in report_list
        ),
    }


class RestaurantDietaryDetailView(
    APIView
):
    permission_classes = (
        IsAuthenticated,
    )

    def get(
        self,
        request,
        place_id,
    ):
        dietary_slug = (
            _normalize_dietary_slug(
                request.query_params.get(
                    "dietary_slug"
                )
            )
        )

        if not dietary_slug:
            return Response(
                {
                    "detail": (
                        "dietary_slug is required."
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        profile = (
            RestaurantDietaryProfile.objects
            .filter(
                external_place_id=place_id,
                dietary_slug=dietary_slug,
            )
            .prefetch_related(
                "evidence",
            )
            .first()
        )

        visible_reports = (
            RestaurantDietaryReport.objects
            .filter(
                external_place_id=place_id,
                dietary_slug=dietary_slug,
                moderation_status=(
                    DietaryReportModerationStatus
                    .VISIBLE
                ),
            )
            .select_related("user")
            .order_by("-updated_at")
        )

        report_list = list(
            visible_reports
        )

        my_report = next(
            (
                report
                for report in report_list
                if report.user_id
                == request.user.id
            ),
            None,
        )

        recent_reports = [
            report
            for report in report_list
            if report.user_id
            != request.user.id
        ][:10]

        restaurant_name = (
            profile.restaurant_name
            if profile
            else (
                my_report.restaurant_name
                if my_report
                else ""
            )
        )

        return Response(
            {
                "external_place_id": (
                    place_id
                ),
                "restaurant_name": (
                    restaurant_name
                ),
                "dietary_slug": (
                    dietary_slug
                ),
                "official": (
                    _serialize_official_dietary_profile(
                        profile
                    )
                ),
                "community_summary": (
                    _get_community_summary(
                        report_list
                    )
                ),
                "recent_reports": (
                    RestaurantDietaryReportSerializer(
                        recent_reports,
                        many=True,
                    ).data
                ),
                "my_report": (
                    RestaurantDietaryReportSerializer(
                        my_report,
                    ).data
                    if my_report
                    else None
                ),
            }
        )


class RestaurantDietaryReportView(
    APIView
):
    permission_classes = (
        IsAuthenticated,
    )

    @transaction.atomic
    def post(
        self,
        request,
        place_id,
    ):
        serializer = (
            RestaurantDietaryReportSerializer(
                data={
                    **request.data,
                    "external_place_id": (
                        place_id
                    ),
                },
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        dietary_slug = (
            serializer.validated_data[
                "dietary_slug"
            ]
        )

        defaults = {
            key: value
            for key, value
            in serializer.validated_data.items()
            if key
            not in (
                "external_place_id",
                "dietary_slug",
            )
        }

        report, created = (
            RestaurantDietaryReport.objects
            .update_or_create(
                user=request.user,
                external_place_id=(
                    place_id
                ),
                dietary_slug=(
                    dietary_slug
                ),
                defaults=defaults,
            )
        )

        response_serializer = (
            RestaurantDietaryReportSerializer(
                report
            )
        )

        return Response(
            response_serializer.data,
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )
