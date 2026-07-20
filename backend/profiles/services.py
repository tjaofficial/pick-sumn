from dataclasses import dataclass

from preferences.models import (
    UserCuisinePreference,
    UserDietaryPreference,
    UserDiningStylePreference,
)


@dataclass(frozen=True)
class ProfileCompletionResult:
    percentage: int
    missing_sections: list[str]


SECTION_WEIGHTS = {
    "basic_profile": 15,
    "location": 10,
    "cuisines": 25,
    "dining_styles": 15,
    "dietary_preferences": 15,
    "default_settings": 10,
}


def calculate_profile_completion(user) -> ProfileCompletionResult:
    """Calculate completion using meaningful profile sections."""

    profile = user.profile
    completed_score = 0
    missing_sections: list[str] = []

    basic_profile_complete = bool(
        user.display_name.strip()
    )

    if basic_profile_complete:
        completed_score += SECTION_WEIGHTS["basic_profile"]
    else:
        missing_sections.append("basic_profile")

    location_complete = bool(
        profile.city.strip() and profile.state.strip()
    )

    if location_complete:
        completed_score += SECTION_WEIGHTS["location"]
    else:
        missing_sections.append("location")

    cuisines_complete = (
        UserCuisinePreference.objects.filter(
            user=user,
        ).count()
        >= 3
    )

    if cuisines_complete:
        completed_score += SECTION_WEIGHTS["cuisines"]
    else:
        missing_sections.append("cuisines")

    dining_styles_complete = (
        UserDiningStylePreference.objects.filter(
            user=user,
        ).exists()
    )

    if dining_styles_complete:
        completed_score += SECTION_WEIGHTS["dining_styles"]
    else:
        missing_sections.append("dining_styles")

    dietary_complete = (
        UserDietaryPreference.objects.filter(
            user=user,
        ).exists()
    )

    if dietary_complete:
        completed_score += SECTION_WEIGHTS[
            "dietary_preferences"
        ]
    else:
        missing_sections.append("dietary_preferences")


    defaults_complete = bool(
        profile.default_search_radius_miles
        and profile.default_price_min
        and profile.default_price_max
    )

    if defaults_complete:
        completed_score += SECTION_WEIGHTS["default_settings"]
    else:
        missing_sections.append("default_settings")

    return ProfileCompletionResult(
        percentage=min(completed_score, 100),
        missing_sections=missing_sections,
    )