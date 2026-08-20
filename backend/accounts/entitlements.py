from __future__ import annotations

from typing import Any


FREE_MAX_PARTICIPANTS = 3
FREE_MAX_SEARCH_RADIUS_MILES = 10
FREE_MAX_SAVED_RESTAURANTS = 5
PLUS_MAX_SEARCH_RADIUS_MILES = 50


def user_has_plus_access(user) -> bool:
    return bool(
        getattr(
            user,
            "has_plus_access",
            False,
        )
    )


def get_user_entitlements(user) -> dict[str, Any]:
    is_plus = user_has_plus_access(user)

    return {
        "plan": "plus" if is_plus else "free",
        "is_plus": is_plus,
        "max_participants": (
            None if is_plus else FREE_MAX_PARTICIPANTS
        ),
        "max_search_radius_miles": (
            PLUS_MAX_SEARCH_RADIUS_MILES
            if is_plus
            else FREE_MAX_SEARCH_RADIUS_MILES
        ),
        "max_saved_restaurants": (
            None if is_plus else FREE_MAX_SAVED_RESTAURANTS
        ),
        "advanced_dining_filters": is_plus,
        "advanced_price_filter": is_plus,
        "enhanced_dietary_evidence": is_plus,
        "unlimited_group_sessions": is_plus,
        "subscription_status": getattr(
            user,
            "subscription_status",
            "inactive",
        ),
        "subscription_provider": getattr(
            user,
            "subscription_provider",
            "",
        ),
        "subscription_expires_at": (
            user.subscription_expires_at
            if getattr(
                user,
                "subscription_expires_at",
                None,
            )
            else None
        ),
    }
