from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from dining_groups.models import DiningGroupMember
from profiles.models import Profile

from .models import (
    DecisionMode,
    ParticipantStatus,
    PickSession,
    PickSessionCuisineFilter,
    PickSessionParticipant,
    PickSessionStatus,
)


User = get_user_model()


ACTIVE_SESSION_STATUSES = (
    PickSessionStatus.DRAFT,
    PickSessionStatus.WAITING,
    PickSessionStatus.READY,
    PickSessionStatus.MATCHING,
    PickSessionStatus.VOTING,
)


@transaction.atomic
def set_current_pick_session(
    *,
    user,
    session,
):
    participation = (
        PickSessionParticipant.objects
        .select_for_update()
        .get(
            user=user,
            session=session,
        )
    )

    if participation.status in (
        ParticipantStatus.DECLINED,
        ParticipantStatus.LEFT,
    ):
        raise ValueError(
            "A session you left or declined cannot be made current."
        )

    if session.status not in ACTIVE_SESSION_STATUSES:
        raise ValueError(
            "Only an active session can be made current."
        )

    PickSessionParticipant.objects.filter(
        user=user,
        is_current=True,
    ).exclude(
        pk=participation.pk,
    ).update(
        is_current=False,
    )

    if not participation.is_current:
        participation.is_current = True
        participation.save(
            update_fields=(
                "is_current",
                "updated_at",
            ),
        )

    return participation


@transaction.atomic
def create_pick_session(
    *,
    created_by,
    group=None,
    title="",
    decision_mode="ranked",
    cuisine_filters=None,
    participant_users=None,
    **overrides,
):
    """Create a Pick Session and populate its participants."""

    profile, _ = Profile.objects.get_or_create(
        user=created_by,
    )

    session = PickSession.objects.create(
        created_by=created_by,
        group=group,
        title=title,
        decision_mode=decision_mode,
        search_radius_miles=overrides.get(
            "search_radius_miles",
            profile.default_search_radius_miles,
        ),
        price_min=overrides.get(
            "price_min",
            profile.default_price_min,
        ),
        price_max=overrides.get(
            "price_max",
            profile.default_price_max,
        ),
        exclude_recent_days=overrides.get(
            "exclude_recent_days",
            profile.exclude_recent_days,
        ),
        latitude=overrides.get("latitude"),
        longitude=overrides.get("longitude"),
        location_label=overrides.get(
            "location_label",
            "",
        ),
        open_now=overrides.get(
            "open_now",
            True,
        ),
        include_delivery=overrides.get(
            "include_delivery",
            False,
        ),
        include_drive_through=overrides.get(
            "include_drive_through",
            False,
        ),
        something_new=overrides.get(
            "something_new",
            False,
        ),
        vetoes_per_participant=overrides.get(
            "vetoes_per_participant",
            2,
        ),
        expires_at=overrides.get("expires_at"),
    )

    now = timezone.now()

    # A newly created session becomes current only for its host.
    PickSessionParticipant.objects.filter(
        user=created_by,
        is_current=True,
    ).update(
        is_current=False,
    )

    PickSessionParticipant.objects.create(
        session=session,
        user=created_by,
        status=ParticipantStatus.READY,
        is_host=True,
        is_current=True,
        joined_at=now,
        ready_at=now,
    )

    if group:
        if participant_users is None:
            memberships = (
                DiningGroupMember.objects
                .filter(
                    group=group,
                    is_active=True,
                )
                .exclude(user=created_by)
                .select_related("user")
            )

            participant_users = [
                membership.user
                for membership in memberships
            ]

        unique_participant_users = {
            user.id: user
            for user in participant_users
            if user.id != created_by.id
        }

        # Ranked and Surprise Me sessions use other members only as
        # preference contributors. Group Vote creates true invitations.
        participant_status = (
            ParticipantStatus.INVITED
            if decision_mode == DecisionMode.GROUP_VOTE
            else ParticipantStatus.READY
        )

        PickSessionParticipant.objects.bulk_create(
            [
                PickSessionParticipant(
                    session=session,
                    user=user,
                    status=participant_status,
                    is_current=False,
                    joined_at=(
                        None
                        if participant_status == ParticipantStatus.INVITED
                        else now
                    ),
                    ready_at=(
                        None
                        if participant_status == ParticipantStatus.INVITED
                        else now
                    ),
                )
                for user in unique_participant_users.values()
            ]
        )

    if cuisine_filters:
        PickSessionCuisineFilter.objects.bulk_create(
            [
                PickSessionCuisineFilter(
                    session=session,
                    cuisine=cuisine,
                )
                for cuisine in cuisine_filters
            ]
        )

    refresh_pick_session_status(session)

    return session


def refresh_pick_session_status(
    session: PickSession,
) -> PickSession:
    """Update a session based on relevant participant statuses."""

    if session.status in (
        PickSessionStatus.COMPLETED,
        PickSessionStatus.CANCELLED,
        PickSessionStatus.EXPIRED,
    ):
        return session

    # Group Vote begins immediately after its restaurant options
    # are prepared. Invitees do not need to join or mark ready first.
    if session.decision_mode == DecisionMode.GROUP_VOTE:
        if session.vote_options.exists():
            session.status = PickSessionStatus.VOTING
        else:
            session.status = PickSessionStatus.READY

        session.save(
            update_fields=(
                "status",
                "updated_at",
            )
        )

        return session

    session.status = PickSessionStatus.READY

    session.save(
        update_fields=(
            "status",
            "updated_at",
        )
    )

    return session

