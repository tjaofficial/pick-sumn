from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

from django.contrib.auth import get_user_model

from preferences.models import (
    PreferenceLevel,
    UserCuisinePreference,
    UserDietaryPreference,
    UserDiningStylePreference,
)

from .google_places import NearbyRestaurant
from .models import PickSession


User = get_user_model()


GOOGLE_TYPE_TO_CUISINE_SLUGS = {
    "african_restaurant": {
        "african",
    },
    "american_restaurant": {
        "american",
        "southern",
        "soul-food",
    },
    "barbecue_restaurant": {
        "barbecue",
        "bbq",
    },
    "breakfast_restaurant": {
        "breakfast",
        "brunch",
    },
    "brunch_restaurant": {
        "breakfast",
        "brunch",
    },
    "buffet_restaurant": {
        "buffet",
    },
    "caribbean_restaurant": {
        "caribbean",
    },
    "chinese_restaurant": {
        "chinese",
    },
    "fast_food_restaurant": {
        "fast-food",
    },
    "french_restaurant": {
        "french",
    },
    "greek_restaurant": {
        "greek",
        "mediterranean",
    },
    "hamburger_restaurant": {
        "american",
        "burgers",
    },
    "indian_restaurant": {
        "indian",
    },
    "italian_restaurant": {
        "italian",
    },
    "japanese_restaurant": {
        "japanese",
    },
    "korean_restaurant": {
        "korean",
    },
    "mediterranean_restaurant": {
        "mediterranean",
        "middle-eastern",
    },
    "mexican_restaurant": {
        "mexican",
    },
    "middle_eastern_restaurant": {
        "middle-eastern",
        "mediterranean",
    },
    "pizza_restaurant": {
        "pizza",
        "italian",
    },
    "ramen_restaurant": {
        "ramen",
        "japanese",
    },
    "seafood_restaurant": {
        "seafood",
    },
    "spanish_restaurant": {
        "spanish",
    },
    "steak_house": {
        "steak",
        "steakhouse",
    },
    "sushi_restaurant": {
        "sushi",
        "japanese",
    },
    "thai_restaurant": {
        "thai",
    },
    "vegan_restaurant": {
        "vegan",
    },
    "vegetarian_restaurant": {
        "vegetarian",
    },
    "vietnamese_restaurant": {
        "vietnamese",
    },
}


CUISINE_SLUG_TO_GOOGLE_TYPES = {
    "african": {
        "african_restaurant",
    },
    "american": {
        "american_restaurant",
    },
    "barbecue": {
        "barbecue_restaurant",
    },
    "bbq": {
        "barbecue_restaurant",
    },
    "caribbean": {
        "caribbean_restaurant",
    },
    "chinese": {
        "chinese_restaurant",
    },
    "french": {
        "french_restaurant",
    },
    "greek": {
        "greek_restaurant",
    },
    "indian": {
        "indian_restaurant",
    },
    "italian": {
        "italian_restaurant",
    },
    "japanese": {
        "japanese_restaurant",
        "sushi_restaurant",
        "ramen_restaurant",
    },
    "korean": {
        "korean_restaurant",
    },
    "mediterranean": {
        "mediterranean_restaurant",
        "greek_restaurant",
        "middle_eastern_restaurant",
    },
    "mexican": {
        "mexican_restaurant",
    },
    "middle-eastern": {
        "middle_eastern_restaurant",
        "mediterranean_restaurant",
    },
    "pizza": {
        "pizza_restaurant",
    },
    "seafood": {
        "seafood_restaurant",
    },
    "soul-food": {
        "american_restaurant",
    },
    "southern": {
        "american_restaurant",
    },
    "spanish": {
        "spanish_restaurant",
    },
    "thai": {
        "thai_restaurant",
    },
    "vegan": {
        "vegan_restaurant",
    },
    "vegetarian": {
        "vegetarian_restaurant",
    },
    "vietnamese": {
        "vietnamese_restaurant",
    },
}


PRICE_LEVEL_MAP = {
    "PRICE_LEVEL_FREE": 1,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}


CUISINE_WEIGHT = 0.45
DISTANCE_WEIGHT = 0.35
RATING_WEIGHT = 0.20


CUISINE_RANK_SCORES = {
    1: 100.0,
    2: 92.0,
    3: 84.0,
    4: 76.0,
    5: 68.0,
}


@dataclass(frozen=True)
class ParticipantPreferenceSnapshot:
    user_id: int
    cuisine_levels: dict[str, int]
    cuisine_ranks: dict[str, int]
    dining_style_levels: dict[str, int]
    required_dietary_slugs: set[str]
    preferred_dietary_slugs: set[str]


@dataclass(frozen=True)
class ScoredRestaurant:
    restaurant: NearbyRestaurant
    match_score: int
    cuisine_score: int
    distance_score: int
    rating_score: int
    reasons: list[str]
    warnings: list[str]
    dietary_tags: list[dict[str, str | bool]]

    def to_dict(self) -> dict:
        data = self.restaurant.to_dict()

        data["match_score"] = self.match_score
        data["cuisine_score"] = self.cuisine_score
        data["distance_score"] = self.distance_score
        data["rating_score"] = self.rating_score
        data["match_reasons"] = self.reasons
        data["match_warnings"] = self.warnings
        data["dietary_tags"] = self.dietary_tags
        data["price_number"] = PRICE_LEVEL_MAP.get(
            self.restaurant.price_level
        )

        return data


def _normalize_slug(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("_", "-")
        .replace(" ", "-")
    )


def _display_slug(value: str) -> str:
    return value.replace("-", " ").title()


def _build_participant_snapshot(
    user,
) -> ParticipantPreferenceSnapshot:
    cuisine_preferences = (
        UserCuisinePreference.objects
        .filter(user=user)
        .select_related("cuisine")
    )

    dining_style_preferences = (
        UserDiningStylePreference.objects
        .filter(user=user)
        .select_related("dining_style")
    )

    dietary_preferences = (
        UserDietaryPreference.objects
        .filter(user=user)
        .select_related("dietary_tag")
    )

    cuisine_levels = {
        _normalize_slug(
            preference.cuisine.slug
        ): int(preference.level)
        for preference in cuisine_preferences
    }

    cuisine_ranks = {
        _normalize_slug(
            preference.cuisine.slug
        ): int(preference.rank)
        for preference in cuisine_preferences
        if preference.rank is not None
    }

    dining_style_levels = {
        _normalize_slug(
            preference.dining_style.slug
        ): int(preference.level)
        for preference in dining_style_preferences
    }

    required_dietary_slugs = {
        _normalize_slug(
            preference.dietary_tag.slug
        )
        for preference in dietary_preferences
        if preference.is_required
    }

    preferred_dietary_slugs = {
        _normalize_slug(
            preference.dietary_tag.slug
        )
        for preference in dietary_preferences
        if not preference.is_required
    }

    return ParticipantPreferenceSnapshot(
        user_id=user.id,
        cuisine_levels=cuisine_levels,
        cuisine_ranks=cuisine_ranks,
        dining_style_levels=dining_style_levels,
        required_dietary_slugs=required_dietary_slugs,
        preferred_dietary_slugs=preferred_dietary_slugs,
    )


def get_session_participant_preferences(
    session: PickSession,
) -> list[ParticipantPreferenceSnapshot]:
    participant_users = (
        User.objects
        .filter(
            pick_session_participations__session=session,
        )
        .distinct()
    )

    return [
        _build_participant_snapshot(user)
        for user in participant_users
    ]


def get_session_preferred_cuisine_slugs(
    session: PickSession,
) -> list[str]:
    participants = (
        get_session_participant_preferences(
            session
        )
    )

    weighted_cuisines: dict[str, float] = {}

    for participant in participants:
        for cuisine_slug, level in (
            participant.cuisine_levels.items()
        ):
            if level <= PreferenceLevel.NEUTRAL:
                continue

            rank = participant.cuisine_ranks.get(
                cuisine_slug
            )

            if rank is not None:
                weight = {
                    1: 10.0,
                    2: 9.0,
                    3: 8.0,
                    4: 7.0,
                    5: 6.0,
                }.get(
                    rank,
                    5.0,
                )
            elif level == PreferenceLevel.LOVE:
                weight = 5.0
            else:
                weight = 3.0

            weighted_cuisines[cuisine_slug] = (
                weighted_cuisines.get(
                    cuisine_slug,
                    0.0,
                )
                + weight
            )

    ordered = sorted(
        weighted_cuisines.items(),
        key=lambda item: (
            -item[1],
            item[0],
        ),
    )

    return [
        cuisine_slug
        for cuisine_slug, _
        in ordered
    ]


def get_session_google_primary_types(
    session: PickSession,
) -> list[str]:
    cuisine_slugs = (
        get_session_preferred_cuisine_slugs(
            session
        )
    )

    google_types: list[str] = []
    seen: set[str] = set()

    for cuisine_slug in cuisine_slugs:
        for google_type in (
            CUISINE_SLUG_TO_GOOGLE_TYPES.get(
                cuisine_slug,
                set(),
            )
        ):
            if google_type in seen:
                continue

            seen.add(google_type)
            google_types.append(
                google_type
            )

    return google_types


def _get_restaurant_cuisine_slugs(
    restaurant: NearbyRestaurant,
) -> set[str]:
    slugs: set[str] = set()

    place_types = {
        restaurant.primary_type,
        *restaurant.types,
    }

    for place_type in place_types:
        slugs.update(
            GOOGLE_TYPE_TO_CUISINE_SLUGS.get(
                place_type,
                set(),
            )
        )

    return {
        _normalize_slug(slug)
        for slug in slugs
    }


def _get_participant_cuisine_score(
    restaurant_cuisines: set[str],
    participant: ParticipantPreferenceSnapshot,
) -> tuple[float | None, list[str]]:
    best_score: float | None = None
    reasons: list[str] = []

    for cuisine_slug in restaurant_cuisines:
        level = participant.cuisine_levels.get(
            cuisine_slug,
            PreferenceLevel.NEUTRAL,
        )

        if level == PreferenceLevel.NEVER:
            return None, [
                (
                    "A participant marked "
                    f"{_display_slug(cuisine_slug)} as Never"
                )
            ]

        if level == PreferenceLevel.DISLIKE:
            continue

        rank = participant.cuisine_ranks.get(
            cuisine_slug
        )

        if rank is not None:
            score = CUISINE_RANK_SCORES.get(
                rank,
                60.0,
            )

            reasons.append(
                (
                    f"Top {rank} cuisine: "
                    f"{_display_slug(cuisine_slug)}"
                )
            )

        elif level == PreferenceLevel.LOVE:
            score = 62.0

            reasons.append(
                f"Loves {_display_slug(cuisine_slug)}"
            )

        elif level == PreferenceLevel.LIKE:
            score = 55.0

            reasons.append(
                f"Likes {_display_slug(cuisine_slug)}"
            )

        else:
            continue

        if (
            best_score is None
            or score > best_score
        ):
            best_score = score

    return best_score, reasons


def _get_group_cuisine_score(
    restaurant_cuisines: set[str],
    participants: list[
        ParticipantPreferenceSnapshot
    ],
) -> tuple[float | None, list[str], list[str]]:
    participant_scores: list[float] = []
    reasons: list[str] = []
    warnings: list[str] = []

    for participant in participants:
        score, participant_reasons = (
            _get_participant_cuisine_score(
                restaurant_cuisines,
                participant,
            )
        )

        if score is None:
            if participant_reasons:
                warnings.extend(
                    participant_reasons
                )
                return None, reasons, warnings

            participant_scores.append(
                0.0
            )
            continue

        participant_scores.append(
            score
        )

        reasons.extend(
            participant_reasons
        )

    if not participant_scores:
        return None, reasons, warnings

    if max(participant_scores) <= 0:
        return None, reasons, warnings

    average_score = (
        sum(participant_scores)
        / len(participant_scores)
    )

    lowest_score = min(
        participant_scores
    )

    group_score = (
        average_score * 0.75
        + lowest_score * 0.25
    )

    return group_score, reasons, warnings


def _get_distance_score(
    restaurant: NearbyRestaurant,
    session: PickSession,
) -> tuple[float, list[str]]:
    if restaurant.distance_miles is None:
        return 35.0, [
            "Distance unavailable",
        ]

    radius = max(
        float(
            session.search_radius_miles
        ),
        1.0,
    )

    distance = max(
        restaurant.distance_miles,
        0.0,
    )

    normalized_distance = min(
        distance / radius,
        1.0,
    )

    score = (
        1.0
        - normalized_distance
    ) * 100.0

    if distance <= 1.0:
        reasons = ["About a mile away"]

    elif distance <= 2.0:
        reasons = ["Very close by"]

    elif distance <= 5.0:
        reasons = ["Convenient distance"]

    else:
        reasons = []

    return score, reasons


def _get_rating_score(
    restaurant: NearbyRestaurant,
) -> tuple[float, list[str]]:
    if restaurant.rating is None:
        return 40.0, [
            "Rating unavailable",
        ]

    rating = min(
        max(
            restaurant.rating,
            0.0,
        ),
        5.0,
    )

    review_count = max(
        restaurant.user_rating_count,
        0,
    )

    prior_rating = 3.8
    prior_weight = 40.0

    weighted_rating = (
        (
            rating
            * review_count
        )
        + (
            prior_rating
            * prior_weight
        )
    ) / (
        review_count
        + prior_weight
    )

    score = (
        weighted_rating / 5.0
    ) * 100.0

    reasons: list[str] = []

    if (
        weighted_rating >= 4.5
        and review_count >= 100
    ):
        reasons.append(
            "Excellent customer rating"
        )

    elif (
        weighted_rating >= 4.2
        and review_count >= 50
    ):
        reasons.append(
            "Highly rated"
        )

    elif weighted_rating >= 4.0:
        reasons.append(
            "Good customer rating"
        )

    return score, reasons


def _get_dietary_tags(
    restaurant_cuisines: set[str],
    participants: list[
        ParticipantPreferenceSnapshot
    ],
) -> tuple[
    list[dict[str, str | bool]],
    list[str],
]:
    requested_slugs: set[str] = set()

    for participant in participants:
        requested_slugs.update(
            participant.required_dietary_slugs
        )

        requested_slugs.update(
            participant.preferred_dietary_slugs
        )

    tags: list[
        dict[str, str | bool]
    ] = []

    warnings: list[str] = []

    for dietary_slug in sorted(
        requested_slugs
    ):
        confirmed = (
            dietary_slug
            in restaurant_cuisines
        )

        tags.append(
            {
                "slug": dietary_slug,
                "label": _display_slug(
                    dietary_slug
                ),
                "confirmed": confirmed,
            }
        )

        if not confirmed:
            warnings.append(
                (
                    f"{_display_slug(dietary_slug)} "
                    "options should be verified"
                )
            )

    return tags, warnings


def _get_dining_style_reasons(
    restaurant: NearbyRestaurant,
    participants: list[
        ParticipantPreferenceSnapshot
    ],
) -> list[str]:
    available_styles: set[str] = set()

    if restaurant.delivery is True:
        available_styles.add(
            "delivery"
        )

    if restaurant.takeout is True:
        available_styles.add(
            "carryout"
        )

    if restaurant.dine_in is True:
        available_styles.add(
            "dine-in"
        )

    if (
        restaurant.primary_type
        == "fast_food_restaurant"
        or "fast_food_restaurant"
        in restaurant.types
    ):
        available_styles.add(
            "fast-food"
        )

    reasons: list[str] = []

    for participant in participants:
        for style_slug in available_styles:
            level = (
                participant
                .dining_style_levels
                .get(
                    style_slug,
                    PreferenceLevel.NEUTRAL,
                )
            )

            if level in (
                PreferenceLevel.LIKE,
                PreferenceLevel.LOVE,
            ):
                reasons.append(
                    (
                        "Preferred dining style: "
                        f"{_display_slug(style_slug)}"
                    )
                )

    return reasons


def _deduplicate_strings(
    values: Iterable[str],
) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()

    for value in values:
        normalized = value.strip()

        if (
            not normalized
            or normalized in seen
        ):
            continue

        seen.add(normalized)
        result.append(normalized)

    return result


def score_restaurant_for_session(
    *,
    restaurant: NearbyRestaurant,
    session: PickSession,
    participants: list[
        ParticipantPreferenceSnapshot
    ],
) -> ScoredRestaurant | None:
    restaurant_cuisines = (
        _get_restaurant_cuisine_slugs(
            restaurant
        )
    )

    if not restaurant_cuisines:
        return None

    (
        cuisine_score,
        cuisine_reasons,
        cuisine_warnings,
    ) = _get_group_cuisine_score(
        restaurant_cuisines,
        participants,
    )

    if cuisine_score is None:
        return None

    (
        distance_score,
        distance_reasons,
    ) = _get_distance_score(
        restaurant,
        session,
    )

    (
        rating_score,
        rating_reasons,
    ) = _get_rating_score(
        restaurant
    )

    dietary_tags, dietary_warnings = (
        _get_dietary_tags(
            restaurant_cuisines,
            participants,
        )
    )

    dining_style_reasons = (
        _get_dining_style_reasons(
            restaurant,
            participants,
        )
    )

    weighted_score = (
        cuisine_score
        * CUISINE_WEIGHT
        + distance_score
        * DISTANCE_WEIGHT
        + rating_score
        * RATING_WEIGHT
    )

    final_score = int(
        round(
            max(
                1.0,
                min(
                    weighted_score,
                    99.0,
                ),
            )
        )
    )

    reasons = _deduplicate_strings(
        [
            *cuisine_reasons,
            *distance_reasons,
            *rating_reasons,
            *dining_style_reasons,
        ]
    )[:5]

    warnings = _deduplicate_strings(
        [
            *cuisine_warnings,
            *dietary_warnings,
        ]
    )[:4]

    return ScoredRestaurant(
        restaurant=restaurant,
        match_score=final_score,
        cuisine_score=int(
            round(cuisine_score)
        ),
        distance_score=int(
            round(distance_score)
        ),
        rating_score=int(
            round(rating_score)
        ),
        reasons=reasons,
        warnings=warnings,
        dietary_tags=dietary_tags,
    )


def score_and_sort_restaurants(
    *,
    restaurants: list[
        NearbyRestaurant
    ],
    session: PickSession,
) -> list[ScoredRestaurant]:
    participants = (
        get_session_participant_preferences(
            session
        )
    )

    scored_restaurants: list[
        ScoredRestaurant
    ] = []

    for restaurant in restaurants:
        scored_restaurant = (
            score_restaurant_for_session(
                restaurant=restaurant,
                session=session,
                participants=participants,
            )
        )

        if scored_restaurant is None:
            continue

        scored_restaurants.append(
            scored_restaurant
        )

    scored_restaurants.sort(
        key=lambda item: (
            -item.match_score,
            -item.cuisine_score,
            (
                item.restaurant.distance_miles
                if item.restaurant.distance_miles
                is not None
                else math.inf
            ),
            -item.rating_score,
            -item.restaurant.user_rating_count,
            item.restaurant.name.lower(),
        )
    )

    return scored_restaurants