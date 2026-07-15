from django.db import transaction

from .models import (
    DiningGroup,
    DiningGroupMember,
    GroupRole,
)


@transaction.atomic
def create_dining_group(
    *,
    created_by,
    name,
    description="",
    group_type="permanent",
    expires_at=None,
):
    """Create a dining group and add its creator as owner."""

    group = DiningGroup.objects.create(
        created_by=created_by,
        name=name,
        description=description,
        group_type=group_type,
        expires_at=expires_at,
    )

    DiningGroupMember.objects.create(
        group=group,
        user=created_by,
        role=GroupRole.OWNER,
    )

    return group