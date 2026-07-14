from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "location_display",
        "default_search_radius_miles",
        "onboarding_completed",
        "updated_at",
    )

    search_fields = (
        "user__email",
        "user__display_name",
        "city",
        "state",
    )

    list_filter = (
        "onboarding_completed",
        "state",
    )