from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from dining_groups.models import DiningGroupMember
from profiles.models import Profile

from .models import (
    ParticipantStatus,
    PickSession,
    PickSessionCuisineFilter,
    PickSessionParticipant,
)


User = get_user_model()


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

    PickSessionParticipant.objects.create(
        session=session,
        user=created_by,
        status=ParticipantStatus.READY,
        is_host=True,
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

        PickSessionParticipant.objects.bulk_create(
            [
                PickSessionParticipant(
                    session=session,
                    user=user,
                    status=ParticipantStatus.INVITED,
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

from django.db.models import Q

from .models import (
    ParticipantStatus,
    PickSession,
    PickSessionCuisineFilter,
    PickSessionParticipant,
    PickSessionStatus,
)


def refresh_pick_session_status(session: PickSession) -> PickSession:
    """
    Update a session based on its active participant statuses.
    """

    if session.status in (
        PickSessionStatus.COMPLETED,
        PickSessionStatus.CANCELLED,
        PickSessionStatus.EXPIRED,
    ):
        return session

    participants = session.participants.exclude(
        status__in=(
            ParticipantStatus.DECLINED,
            ParticipantStatus.LEFT,
        )
    )

    if not participants.exists():
        session.status = PickSessionStatus.CANCELLED

    elif participants.filter(
        status=ParticipantStatus.INVITED,
    ).exists():
        session.status = PickSessionStatus.WAITING

    elif participants.exclude(
        status=ParticipantStatus.READY,
    ).exists():
        session.status = PickSessionStatus.WAITING

    else:
        session.status = PickSessionStatus.READY

    session.save(
        update_fields=(
            "status",
            "updated_at",
        )
    )

    return session