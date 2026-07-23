from dataclasses import dataclass

from preferences.models import (
    UserCuisinePreference,
)


@dataclass(frozen=True)
class ProfileCompletionResult:
    percentage: int
    missing_sections: list[str]


def calculate_profile_completion(user) -> ProfileCompletionResult:
    profile = user.profile
    missing_sections: list[str] = []

    location_complete = bool(
        profile.default_location_label.strip()
        and profile.default_location_latitude is not None
        and profile.default_location_longitude is not None
    )

    cuisines_complete = (
        UserCuisinePreference.objects.filter(
            user=user,
        ).count()
        >= 5
    )

    if not cuisines_complete:
        missing_sections.append("cuisines")

    if not location_complete:
        missing_sections.append("location")

    if cuisines_complete and location_complete:
        percentage = 100
    elif cuisines_complete or location_complete:
        percentage = 50
    else:
        percentage = 0

    return ProfileCompletionResult(
        percentage=percentage,
        missing_sections=missing_sections,
    )
