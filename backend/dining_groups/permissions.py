from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import GroupRole


class IsDiningGroupMember(BasePermission):
    """Allow access only to active members of the group."""

    def has_object_permission(self, request, view, obj):
        return obj.memberships.filter(
            user=request.user,
            is_active=True,
        ).exists()


class IsDiningGroupOwnerOrAdmin(BasePermission):
    """Allow group changes only for owners and admins."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return obj.memberships.filter(
                user=request.user,
                is_active=True,
            ).exists()

        return obj.memberships.filter(
            user=request.user,
            is_active=True,
            role__in=(
                GroupRole.OWNER,
                GroupRole.ADMIN,
            ),
        ).exists()