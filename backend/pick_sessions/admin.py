from django.contrib import admin

from .models import (
    PickSession,
    PickSessionCuisineFilter,
    PickSessionParticipant,
)


class PickSessionParticipantInline(admin.TabularInline):
    model = PickSessionParticipant
    extra = 0
    autocomplete_fields = ("user",)


class PickSessionCuisineFilterInline(admin.TabularInline):
    model = PickSessionCuisineFilter
    extra = 0
    autocomplete_fields = ("cuisine",)


@admin.register(PickSession)
class PickSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "created_by",
        "group",
        "status",
        "decision_mode",
        "participant_count",
        "created_at",
    )

    list_filter = (
        "status",
        "decision_mode",
        "open_now",
        "something_new",
    )

    search_fields = (
        "title",
        "created_by__email",
        "created_by__display_name",
        "group__name",
        "location_label",
    )

    autocomplete_fields = (
        "created_by",
        "group",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    inlines = (
        PickSessionParticipantInline,
        PickSessionCuisineFilterInline,
    )


@admin.register(PickSessionParticipant)
class PickSessionParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "session",
        "user",
        "status",
        "is_host",
        "vetoes_used",
        "joined_at",
    )

    list_filter = (
        "status",
        "is_host",
    )

    search_fields = (
        "session__title",
        "user__email",
        "user__display_name",
    )

    autocomplete_fields = (
        "session",
        "user",
    )


@admin.register(PickSessionCuisineFilter)
class PickSessionCuisineFilterAdmin(admin.ModelAdmin):
    list_display = (
        "session",
        "cuisine",
    )

    autocomplete_fields = (
        "session",
        "cuisine",
    )