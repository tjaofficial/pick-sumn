from django.contrib import admin

from .models import (
    DiningGroup,
    DiningGroupInvitation,
    DiningGroupMember,
)


class DiningGroupMemberInline(admin.TabularInline):
    model = DiningGroupMember
    extra = 0
    autocomplete_fields = ("user",)


@admin.register(DiningGroup)
class DiningGroupAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "group_type",
        "created_by",
        "join_code",
        "is_active",
        "expires_at",
        "created_at",
    )

    list_filter = (
        "group_type",
        "is_active",
    )

    search_fields = (
        "name",
        "description",
        "join_code",
        "created_by__email",
        "created_by__display_name",
    )

    readonly_fields = (
        "id",
        "join_code",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "created_by",
    )

    inlines = (
        DiningGroupMemberInline,
    )


@admin.register(DiningGroupMember)
class DiningGroupMemberAdmin(admin.ModelAdmin):
    list_display = (
        "group",
        "user",
        "role",
        "nickname",
        "is_active",
        "joined_at",
    )

    list_filter = (
        "role",
        "is_active",
    )

    search_fields = (
        "group__name",
        "user__email",
        "user__display_name",
        "nickname",
    )

    autocomplete_fields = (
        "group",
        "user",
    )


@admin.register(DiningGroupInvitation)
class DiningGroupInvitationAdmin(admin.ModelAdmin):
    list_display = (
        "group",
        "invited_user",
        "invited_email",
        "status",
        "invited_by",
        "expires_at",
        "created_at",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "group__name",
        "invited_email",
        "invited_user__email",
        "invited_by__email",
    )

    autocomplete_fields = (
        "group",
        "invited_by",
        "invited_user",
    )

    readonly_fields = (
        "id",
        "token",
        "created_at",
        "responded_at",
    )