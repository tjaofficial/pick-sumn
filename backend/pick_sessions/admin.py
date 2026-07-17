from django.contrib import admin

from .models import (
    PickSession,
    PickSessionCuisineFilter,
    PickSessionParticipant,
    RestaurantDietaryEvidence,
    RestaurantDietaryProfile,
    RestaurantDietaryReport,
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

class RestaurantDietaryEvidenceInline(admin.TabularInline):
    model = RestaurantDietaryEvidence
    extra = 0
    readonly_fields = (
        "source_type",
        "claim_type",
        "summary",
        "source_url",
        "confidence",
        "observed_at",
        "expires_at",
        "created_at",
    )
    can_delete = False


@admin.register(RestaurantDietaryProfile)
class RestaurantDietaryProfileAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant_name",
        "external_place_id",
        "dietary_slug",
        "confidence_score",
        "dedicated_facility",
        "official_menu_found",
        "status",
        "last_checked_at",
        "expires_at",
    )

    list_filter = (
        "dietary_slug",
        "status",
        "dedicated_facility",
        "official_menu_found",
    )

    search_fields = (
        "restaurant_name",
        "external_place_id",
        "dietary_slug",
        "official_source_url",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    inlines = (
        RestaurantDietaryEvidenceInline,
    )


@admin.register(RestaurantDietaryEvidence)
class RestaurantDietaryEvidenceAdmin(admin.ModelAdmin):
    list_display = (
        "profile",
        "source_type",
        "claim_type",
        "confidence",
        "observed_at",
        "expires_at",
    )

    list_filter = (
        "source_type",
        "claim_type",
    )

    search_fields = (
        "profile__restaurant_name",
        "profile__external_place_id",
        "summary",
        "source_url",
    )

    autocomplete_fields = (
        "profile",
    )


@admin.register(RestaurantDietaryReport)
class RestaurantDietaryReportAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant_name",
        "dietary_slug",
        "user",
        "outcome",
        "cross_contact_concern",
        "reaction_after_eating",
        "moderation_status",
        "updated_at",
    )

    list_filter = (
        "dietary_slug",
        "outcome",
        "moderation_status",
        "items_clearly_labeled",
        "staff_understood",
        "dedicated_fryer",
        "separate_preparation_area",
        "cross_contact_concern",
        "reaction_after_eating",
    )

    search_fields = (
        "restaurant_name",
        "external_place_id",
        "dietary_slug",
        "user__email",
        "user__display_name",
        "notes",
    )

    autocomplete_fields = (
        "user",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )
