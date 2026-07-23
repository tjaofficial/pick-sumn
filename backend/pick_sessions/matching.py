from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Iterable

from django.contrib.auth import get_user_model

from preferences.models import (
    PreferenceLevel,
    UserCuisinePreference,
    UserDietaryPreference,
)

from .google_places import NearbyRestaurant
from .models import (
    PickSession,
    DietaryReportModerationStatus,
    RestaurantDietaryProfile,
    RestaurantDietaryReport,
)


User = get_user_model()

logger = logging.getLogger(__name__)


GOOGLE_TYPE_TO_CUISINE_SLUGS = {
    "african_restaurant": {
        "african",
    },
    "american_restaurant": {
        "american",
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
    "soul-food": set(),
    "southern": set(),
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


LOCAL_RESTAURANT_BAR_TAVERN_TYPES = {
    "restaurant",
    "american_restaurant",
    "bar",
    "bar_and_grill",
    "sports_bar",
    "brewpub",
    "bistro",
    "diner",
    "cafe",
}

BAR_TAVERN_TYPES = {
    "bar",
    "bar_and_grill",
    "sports_bar",
    "brewpub",
    "wine_bar",
    "cocktail_bar",
    "beer_garden",
    "brewery",
}

FOOD_FORWARD_BAR_TYPES = {
    "bar_and_grill",
    "sports_bar",
    "brewpub",
    "bistro",
    "diner",
    "cafe",
    "restaurant",
}


COFFEE_CAFE_TYPES = {
    "cafe",
    "coffee_shop",
    "tea_house",
    "bakery",
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


CUISINE_NAME_KEYWORDS = {
    "mexican": (
        " mexican ",
        " taqueria",
        " taco ",
        " tacos ",
        " birrieria",
        " cantina",
    ),
    "italian": (
        " italian ",
        " trattoria",
        " ristorante",
    ),
    "chinese": (
        " chinese ",
        " wonton",
        " szechuan",
        " sichuan",
    ),
    "japanese": (
        " japanese ",
        " sushi ",
        " ramen ",
        " hibachi",
    ),
    "soul-food": (
        " soul food",
        " soulfood",
    ),
    "southern": (
        " southern kitchen",
        " southern cooking",
        " southern cuisine",
    ),
    "african": (
        " african ",
        " nigerian",
        " ethiopian",
        " ghanaian",
        " senegalese",
    ),
}


@dataclass(frozen=True)
class ParticipantPreferenceSnapshot:
    user_id: int
    cuisine_levels: dict[str, int]
    cuisine_ranks: dict[str, int]
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
    dietary_evidence: list[dict]
    dietary_priority_tier: int
    dietary_priority_score: int

    def to_dict(self) -> dict:
        data = self.restaurant.to_dict()

        data["match_score"] = self.match_score
        data["cuisine_score"] = self.cuisine_score
        data["distance_score"] = self.distance_score
        data["rating_score"] = self.rating_score
        data["match_reasons"] = self.reasons
        data["match_warnings"] = self.warnings
        data["dietary_tags"] = self.dietary_tags
        data["dietary_evidence"] = (
            self.dietary_evidence
        )
        data["dietary_priority_tier"] = (
            self.dietary_priority_tier
        )
        data["dietary_priority_score"] = (
            self.dietary_priority_score
        )
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


def _canonical_dining_style_slug(
    value: str,
) -> str:
    normalized = _normalize_slug(
        value
    )

    if normalized in {
        "bar-tavern",
        "local-restaurant-bar-tavern",
    }:
        return "local-restaurant-bar-tavern"

    return normalized


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




def get_session_dietary_requirements(
    session: PickSession,
) -> tuple[list[str], list[str]]:
    participants = (
        get_session_participant_preferences(
            session
        )
    )

    required: set[str] = set()
    preferred: set[str] = set()

    for participant in participants:
        required.update(
            participant.required_dietary_slugs
        )
        preferred.update(
            participant.preferred_dietary_slugs
        )

    return (
        sorted(required),
        sorted(preferred - required),
    )



def get_session_requested_dietary_slugs(
    session: PickSession,
) -> list[str]:
    (
        required,
        preferred,
    ) = get_session_dietary_requirements(
        session
    )

    return [
        *required,
        *preferred,
    ]




def get_session_preferred_dining_style_slugs(
    session: PickSession,
) -> list[str]:
    return list(
        session.dining_style_filters
        .select_related("dining_style")
        .order_by("dining_style__name")
        .values_list(
            "dining_style__slug",
            flat=True,
        )
    )



def get_session_google_primary_types(
    session: PickSession,
) -> list[str]:
    cuisine_slugs = (
        get_session_preferred_cuisine_slugs(
            session
        )
    )

    dining_style_slugs = set(
        get_session_preferred_dining_style_slugs(
            session
        )
    )

    google_types: list[str] = []
    seen: set[str] = set()

    def add_type(
        google_type: str,
    ) -> None:
        if google_type in seen:
            return

        seen.add(google_type)
        google_types.append(
            google_type
        )

    for cuisine_slug in cuisine_slugs:
        for google_type in (
            CUISINE_SLUG_TO_GOOGLE_TYPES.get(
                cuisine_slug,
                set(),
            )
        ):
            add_type(
                google_type
            )

    style_type_map = {
        "bar-tavern": BAR_TAVERN_TYPES,
        "coffee-shop-cafe": COFFEE_CAFE_TYPES,
        "local-restaurant-bar-tavern": (
            LOCAL_RESTAURANT_BAR_TAVERN_TYPES
        ),
        "buffet": {
            "buffet_restaurant",
        },
        "casual-dining": {
            "restaurant",
            "american_restaurant",
            "diner",
        },
        "dine-in": {
            "restaurant",
            "american_restaurant",
            "diner",
        },
        "fast-casual": {
            "fast_food_restaurant",
            "restaurant",
        },
        "fast-food": {
            "fast_food_restaurant",
        },
        "fine-dining": {
            "restaurant",
        },
        "food-truck": {
            "food_truck",
        },
        "local-restaurant": {
            "restaurant",
            "american_restaurant",
        },
        "outdoor-dining": {
            "restaurant",
        },
        "carryout": {
            "restaurant",
            "fast_food_restaurant",
        },
        "delivery": {
            "restaurant",
            "fast_food_restaurant",
        },
        "drive-through": {
            "fast_food_restaurant",
        },
    }

    for style_slug in dining_style_slugs:
        for google_type in (
            style_type_map.get(
                style_slug,
                set(),
            )
        ):
            add_type(
                google_type
            )

    # A generic restaurant search is important for places whose Google
    # listing has only the broad "restaurant" classification.
    add_type("restaurant")

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

    normalized_name = (
        " "
        + " ".join(
            restaurant.name
            .strip()
            .lower()
            .split()
        )
        + " "
    )

    for cuisine_slug, keywords in (
        CUISINE_NAME_KEYWORDS.items()
    ):
        if any(
            keyword in normalized_name
            for keyword in keywords
        ):
            slugs.add(
                cuisine_slug
            )

    normalized_place_types = {
        _normalize_slug(
            place_type
        )
        for place_type in place_types
        if place_type
    }

    explicit_american_type = (
        "american-restaurant"
        in normalized_place_types
        or "hamburger-restaurant"
        in normalized_place_types
    )

    generic_bar_tavern_fallback = bool(
        _restaurant_matches_merged_bar_tavern_style(
            restaurant
        )
        and not slugs
    )

    if (
        explicit_american_type
        or generic_bar_tavern_fallback
    ):
        slugs.add(
            "american"
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


DIETARY_PHRASES = {
    "gluten-free": {
        "positive": (
            "gluten free",
            "gluten-free",
            "gf menu",
            "gf options",
            "celiac friendly",
            "celiac-friendly",
            "gluten free menu",
            "gluten-free menu",
        ),
        "strong": (
            "dedicated gluten free",
            "dedicated gluten-free",
            "100% gluten free",
            "100% gluten-free",
            "separate prep area",
            "separate preparation area",
            "dedicated fryer",
            "separate fryer",
            "changed gloves",
        ),
        "negative": (
            "not gluten free",
            "not gluten-free",
            "no gluten free",
            "no gluten-free",
            "cross contamination",
            "cross-contamination",
            "got sick",
            "made me sick",
            "celiac reaction",
        ),
    },
    "dairy-free": {
        "positive": (
            "dairy free",
            "dairy-free",
            "no dairy",
            "vegan cheese",
        ),
        "strong": (
            "dedicated dairy free",
            "dedicated dairy-free",
            "separate preparation area",
        ),
        "negative": (
            "contains dairy",
            "not dairy free",
            "not dairy-free",
            "cross contamination",
            "cross-contamination",
        ),
    },
    "vegan": {
        "positive": (
            "vegan menu",
            "vegan options",
            "fully vegan",
            "100% vegan",
        ),
        "strong": (
            "fully vegan",
            "100% vegan",
            "dedicated vegan",
        ),
        "negative": (
            "no vegan options",
            "not vegan",
        ),
    },
    "vegetarian": {
        "positive": (
            "vegetarian menu",
            "vegetarian options",
            "fully vegetarian",
        ),
        "strong": (
            "fully vegetarian",
            "dedicated vegetarian",
        ),
        "negative": (
            "no vegetarian options",
        ),
    },
    "nut-free": {
        "positive": (
            "nut free",
            "nut-free",
            "peanut free",
            "peanut-free",
        ),
        "strong": (
            "dedicated nut free",
            "dedicated nut-free",
            "allergy protocol",
            "separate preparation area",
        ),
        "negative": (
            "contains nuts",
            "cross contamination",
            "cross-contamination",
            "shared equipment",
        ),
    },
}


def _review_phrase_hits(
    review_texts: list[str],
    phrases: tuple[str, ...],
) -> list[str]:
    hits: list[str] = []

    for review_text in review_texts:
        normalized_text = (
            review_text.strip().lower()
        )

        if not normalized_text:
            continue

        for phrase in phrases:
            if phrase in normalized_text:
                hits.append(phrase)
                break

    return hits



def _get_relevant_contextual_snippets(
    *,
    review_texts: list[str],
    phrases: tuple[str, ...],
) -> list[str]:
    snippets: list[str] = []
    seen: set[str] = set()

    for review_text in review_texts:
        normalized_text = (
            review_text.strip()
        )

        if not normalized_text:
            continue

        lowered = normalized_text.lower()

        if not any(
            phrase in lowered
            for phrase in phrases
        ):
            continue

        compact = " ".join(
            normalized_text.split()
        )

        if len(compact) > 220:
            compact = (
                compact[:217].rstrip()
                + "..."
            )

        if compact.lower() in seen:
            continue

        seen.add(
            compact.lower()
        )
        snippets.append(compact)

        if len(snippets) >= 3:
            break

    return snippets



def _get_dietary_evidence_for_slug(
    *,
    dietary_slug: str,
    restaurant: NearbyRestaurant,
    confirmed_by_type: bool,
) -> dict:
    phrase_config = DIETARY_PHRASES.get(
        dietary_slug,
        {
            "positive": (
                dietary_slug.replace("-", " "),
            ),
            "strong": (),
            "negative": (),
        },
    )

    contextual_review_texts = (
        restaurant.contextual_review_texts
        or []
    )

    all_review_texts = [
        *contextual_review_texts,
        *restaurant.review_texts,
    ]

    positive_hits = _review_phrase_hits(
        all_review_texts,
        phrase_config["positive"],
    )
    strong_hits = _review_phrase_hits(
        all_review_texts,
        phrase_config["strong"],
    )
    negative_hits = _review_phrase_hits(
        all_review_texts,
        phrase_config["negative"],
    )

    contextual_positive_hits = (
        _review_phrase_hits(
            contextual_review_texts,
            phrase_config["positive"],
        )
    )

    contextual_strong_hits = (
        _review_phrase_hits(
            contextual_review_texts,
            phrase_config["strong"],
        )
    )

    contextual_snippets = (
        _get_relevant_contextual_snippets(
            review_texts=(
                contextual_review_texts
            ),
            phrases=(
                phrase_config["positive"]
                + phrase_config["strong"]
                + phrase_config["negative"]
            ),
        )
    )

    found_by_dietary_search = (
        dietary_slug
        in restaurant.dietary_search_slugs
    )

    dietary_search_match_count = (
        restaurant
        .dietary_search_match_counts
        .get(
            dietary_slug,
            0,
        )
    )

    official_profile = (
        RestaurantDietaryProfile.objects
        .filter(
            external_place_id=(
                restaurant.external_id
            ),
            dietary_slug=(
                dietary_slug
            ),
        )
        .prefetch_related("evidence")
        .first()
    )

    official_menu_items: list[str] = []
    official_source_url = ""
    official_last_checked_at = None
    official_claims: list[str] = []
    official_confidence_score = 0
    dedicated_facility = False

    if official_profile is not None:
        official_menu_items = [
            str(item)
            for item in (
                official_profile.menu_items
                or []
            )
            if str(item).strip()
        ][:12]

        official_source_url = (
            official_profile
            .official_source_url
        )

        official_last_checked_at = (
            official_profile
            .last_checked_at
        )

        official_confidence_score = (
            official_profile
            .confidence_score
        )

        dedicated_facility = (
            official_profile
            .dedicated_facility
        )

        official_claims = [
            evidence_item.summary
            for evidence_item
            in official_profile.evidence.all()
        ]

    community_reports = list(
        RestaurantDietaryReport.objects
        .filter(
            external_place_id=(
                restaurant.external_id
            ),
            dietary_slug=(
                dietary_slug
            ),
            moderation_status=(
                DietaryReportModerationStatus
                .VISIBLE
            ),
        )
    )

    positive_community_reports = [
        report
        for report in community_reports
        if report.outcome
        in (
            "accommodated",
            "partially_accommodated",
        )
    ]

    community_concern_reports = [
        report
        for report in community_reports
        if (
            report.cross_contact_concern
            or report
            .restaurant_could_not_accommodate
            or report.reaction_after_eating
        )
    ]

    score = 0
    evidence: list[str] = []
    concerns: list[str] = []

    if confirmed_by_type:
        score += 45
        evidence.append(
            "Google classifies this restaurant for this dietary need"
        )

    if found_by_dietary_search:
        dietary_search_score = min(
            38,
            18
            + max(
                dietary_search_match_count - 1,
                0,
            )
            * 7,
        )

        score += dietary_search_score

        if dietary_search_match_count >= 3:
            evidence.append(
                (
                    "Matched multiple targeted dietary "
                    "and cuisine searches"
                )
            )
        elif dietary_search_match_count == 2:
            evidence.append(
                (
                    "Matched more than one targeted "
                    "dietary search"
                )
            )
        else:
            evidence.append(
                "Appeared in a dedicated dietary restaurant search"
            )

    if official_profile is not None:
        score = max(
            score,
            official_confidence_score,
        )

        if dedicated_facility:
            evidence.append(
                "Official page describes a dedicated facility"
            )

        evidence.extend(
            official_claims
        )

    if restaurant.menu_uri:
        score += 8
        evidence.append(
            "Restaurant menu is available to review"
        )

    contextual_hit_count = (
        len(contextual_positive_hits)
        + len(contextual_strong_hits)
    )

    if contextual_hit_count:
        score += min(
            35,
            contextual_hit_count * 12,
        )
        evidence.append(
            (
                f"{contextual_hit_count} Google review"
                f"{'' if contextual_hit_count == 1 else 's'} "
                "relevant to the dietary search mention matching options"
            )
        )

    non_contextual_positive_count = max(
        len(positive_hits)
        - len(contextual_positive_hits),
        0,
    )

    if non_contextual_positive_count:
        score += min(
            18,
            non_contextual_positive_count * 5,
        )
        evidence.append(
            (
                f"{non_contextual_positive_count} additional Google review"
                f"{'' if non_contextual_positive_count == 1 else 's'} "
                "mention relevant options"
            )
        )

    if strong_hits:
        score += min(
            30,
            len(strong_hits) * 12,
        )

        strong_labels = {
            "dedicated fryer": "Dedicated fryer mentioned",
            "separate fryer": "Separate fryer mentioned",
            "separate prep area": "Separate prep area mentioned",
            "separate preparation area": (
                "Separate preparation area mentioned"
            ),
            "changed gloves": (
                "Staff changing gloves mentioned"
            ),
            "100% gluten free": (
                "Entire menu described as gluten-free"
            ),
            "100% gluten-free": (
                "Entire menu described as gluten-free"
            ),
        }

        for hit in strong_hits:
            evidence.append(
                strong_labels.get(
                    hit,
                    "Specific preparation evidence found in reviews",
                )
            )

    if negative_hits:
        score -= min(
            50,
            len(negative_hits) * 18,
        )
        concerns.append(
            (
                f"{len(negative_hits)} review"
                f"{'' if len(negative_hits) == 1 else 's'} "
                "mention a possible accommodation or "
                "cross-contact concern"
            )
        )

    if positive_community_reports:
        score += min(
            20,
            len(
                positive_community_reports
            ) * 4,
        )
        evidence.append(
            (
                f"{len(positive_community_reports)} "
                "Pick Sum’N community report"
                f"{'' if len(positive_community_reports) == 1 else 's'} "
                "describe successful accommodation"
            )
        )

    dedicated_fryer_reports = sum(
        report.dedicated_fryer
        for report in community_reports
    )

    separate_prep_reports = sum(
        report.separate_preparation_area
        for report in community_reports
    )

    if dedicated_fryer_reports:
        score += min(
            12,
            dedicated_fryer_reports * 3,
        )
        evidence.append(
            (
                f"Dedicated fryer reported by "
                f"{dedicated_fryer_reports} "
                "community member"
                f"{'' if dedicated_fryer_reports == 1 else 's'}"
            )
        )

    if separate_prep_reports:
        score += min(
            12,
            separate_prep_reports * 3,
        )
        evidence.append(
            (
                f"Separate preparation area reported by "
                f"{separate_prep_reports} "
                "community member"
                f"{'' if separate_prep_reports == 1 else 's'}"
            )
        )

    if community_concern_reports:
        score -= min(
            45,
            len(
                community_concern_reports
            ) * 9,
        )
        concerns.append(
            (
                f"{len(community_concern_reports)} "
                "Pick Sum’N community report"
                f"{'' if len(community_concern_reports) == 1 else 's'} "
                "include an accommodation or cross-contact concern"
            )
        )

    score = max(
        0,
        min(score, 100),
    )

    if score >= 70 and not negative_hits:
        confidence_level = "high"
    elif score >= 40:
        confidence_level = "moderate"
    elif score > 0:
        confidence_level = "low"
    else:
        confidence_level = "unknown"

    return {
        "slug": dietary_slug,
        "label": _display_slug(
            dietary_slug
        ),
        "confidence_level": confidence_level,
        "confidence_score": score,
        "evidence": _deduplicate_strings(
            evidence
        )[:5],
        "concerns": _deduplicate_strings(
            concerns
        )[:3],
        "review_mention_count": (
            len(positive_hits)
            + len(strong_hits)
        ),
        "contextual_review_mention_count": (
            contextual_hit_count
        ),
        "contextual_review_snippets": (
            contextual_snippets
        ),
        "negative_review_mention_count": (
            len(negative_hits)
        ),
        "found_by_dietary_search": (
            found_by_dietary_search
        ),
        "dietary_search_match_count": (
            dietary_search_match_count
        ),
        "menu_uri": restaurant.menu_uri,
        "official_menu_items": (
            official_menu_items
        ),
        "official_source_url": (
            official_source_url
        ),
        "official_last_checked_at": (
            official_last_checked_at.isoformat()
            if official_last_checked_at
            else None
        ),
        "dedicated_facility": (
            dedicated_facility
        ),
        "community_report_count": (
            len(community_reports)
        ),
        "community_positive_count": (
            len(
                positive_community_reports
            )
        ),
        "community_concern_count": (
            len(
                community_concern_reports
            )
        ),
    }


def _get_dietary_tags(
    restaurant: NearbyRestaurant,
    restaurant_cuisines: set[str],
    participants: list[
        ParticipantPreferenceSnapshot
    ],
) -> tuple[
    list[dict[str, str | bool]],
    list[dict],
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
    evidence_summaries: list[dict] = []

    for dietary_slug in sorted(
        requested_slugs
    ):
        confirmed_by_type = (
            dietary_slug
            in restaurant_cuisines
        )

        evidence_summary = (
            _get_dietary_evidence_for_slug(
                dietary_slug=dietary_slug,
                restaurant=restaurant,
                confirmed_by_type=(
                    confirmed_by_type
                ),
            )
        )

        evidence_summaries.append(
            evidence_summary
        )

        tags.append(
            {
                "slug": dietary_slug,
                "label": _display_slug(
                    dietary_slug
                ),
                "confirmed": (
                    evidence_summary[
                        "confidence_level"
                    ]
                    in ("high", "moderate")
                ),
            }
        )

    return tags, evidence_summaries



def _get_dietary_priority(
    *,
    dietary_evidence: list[dict],
    required_slugs: set[str],
    preferred_slugs: set[str],
) -> tuple[int, int]:
    """
    Lower tier values sort first.

    Required dietary needs define the tier. Preferred dietary needs only
    add a smaller score boost and never push an unknown required match
    above a restaurant with actual required-dietary evidence.
    """

    if not required_slugs:
        preferred_scores = [
            int(item.get(
                "confidence_score",
                0,
            ))
            for item in dietary_evidence
            if item.get("slug")
            in preferred_slugs
        ]

        return (
            0,
            max(
                preferred_scores,
                default=0,
            ),
        )

    required_items = {
        str(item.get("slug") or ""): item
        for item in dietary_evidence
        if item.get("slug")
        in required_slugs
    }

    tiers: list[int] = []
    scores: list[int] = []

    for required_slug in required_slugs:
        item = required_items.get(
            required_slug,
            {},
        )

        score = int(
            item.get(
                "confidence_score",
                0,
            )
            or 0
        )

        concerns = item.get(
            "concerns",
            [],
        ) or []

        negative_mentions = int(
            item.get(
                "negative_review_mention_count",
                0,
            )
            or 0
        )

        community_concerns = int(
            item.get(
                "community_concern_count",
                0,
            )
            or 0
        )

        has_serious_concern = bool(
            concerns
            or negative_mentions
            or community_concerns
        )

        if has_serious_concern:
            tier = 4
        elif score >= 70:
            tier = 0
        elif score >= 40:
            tier = 1
        elif score > 0:
            tier = 2
        else:
            tier = 3

        tiers.append(tier)
        scores.append(score)

    return (
        max(tiers, default=3),
        min(scores, default=0),
    )




def _get_normalized_place_types(
    restaurant: NearbyRestaurant,
) -> set[str]:
    return {
        _normalize_slug(
            place_type
        )
        for place_type in {
            restaurant.primary_type,
            *restaurant.types,
        }
        if place_type
    }


def _restaurant_has_bar_tavern_type(
    restaurant: NearbyRestaurant,
) -> bool:
    bar_tavern_types = {
        _normalize_slug(
            google_type
        )
        for google_type
        in BAR_TAVERN_TYPES
    }

    return bool(
        _get_normalized_place_types(
            restaurant
        ).intersection(
            bar_tavern_types
        )
    )


def _restaurant_is_food_forward_bar(
    restaurant: NearbyRestaurant,
) -> bool:
    food_forward_types = {
        _normalize_slug(
            google_type
        )
        for google_type
        in FOOD_FORWARD_BAR_TYPES
    }

    return bool(
        restaurant.dine_in is True
        or restaurant.takeout is True
        or _get_normalized_place_types(
            restaurant
        ).intersection(
            food_forward_types
        )
    )



def _restaurant_is_coffee_cafe(
    restaurant: NearbyRestaurant,
) -> bool:
    coffee_types = {
        _normalize_slug(
            google_type
        )
        for google_type
        in COFFEE_CAFE_TYPES
    }

    return bool(
        _get_normalized_place_types(
            restaurant
        ).intersection(
            coffee_types
        )
    )





BAR_TAVERN_NAME_KEYWORDS = (
    " bar ",
    " tavern",
    " pub ",
    " public house",
    " saloon",
    " taproom",
    " tap room",
    " tap house",
    " taphouse",
    " bar & grill",
    " bar and grill",
    " sports bar",
    " brewpub",
    " brew haus",
    " brewhaus",
    " brewhouse",
    " brew house",
    " alehouse",
    " ale house",
    " beer garden",
    " whiskey lounge",
    " whisky lounge",
)

FOOD_TRUCK_NAME_KEYWORDS = (
    "food truck",
    "foodtruck",
)


def _normalized_restaurant_name(
    restaurant: NearbyRestaurant,
) -> str:
    return (
        " "
        + " ".join(
            restaurant.name
            .strip()
            .lower()
            .replace("&", " & ")
            .split()
        )
        + " "
    )


def _restaurant_name_has_bar_signal(
    restaurant: NearbyRestaurant,
) -> bool:
    normalized_name = (
        _normalized_restaurant_name(
            restaurant
        )
    )

    return any(
        keyword in normalized_name
        for keyword
        in BAR_TAVERN_NAME_KEYWORDS
    )


def _restaurant_name_is_food_truck(
    restaurant: NearbyRestaurant,
) -> bool:
    normalized_name = (
        _normalized_restaurant_name(
            restaurant
        )
    )

    return any(
        keyword in normalized_name
        for keyword
        in FOOD_TRUCK_NAME_KEYWORDS
    )


def _restaurant_serves_alcohol(
    restaurant: NearbyRestaurant,
) -> bool:
    return any(
        value is True
        for value in (
            getattr(
                restaurant,
                "serves_beer",
                None,
            ),
            getattr(
                restaurant,
                "serves_wine",
                None,
            ),
            getattr(
                restaurant,
                "serves_cocktails",
                None,
            ),
        )
    )


def _restaurant_is_takeout_only(
    restaurant: NearbyRestaurant,
) -> bool:
    return bool(
        restaurant.dine_in is False
        and restaurant.takeout is True
    )


def _restaurant_is_low_confidence_listing(
    restaurant: NearbyRestaurant,
) -> bool:
    rating = (
        restaurant.rating
        if restaurant.rating is not None
        else 0.0
    )

    return bool(
        restaurant.user_rating_count <= 2
        and rating > 0
        and rating <= 2.5
        and not restaurant.website_uri
        and not restaurant.phone_number
    )


def _bar_tavern_search_match_count(
    restaurant: NearbyRestaurant,
) -> int:
    counts = (
        restaurant
        .dining_style_search_match_counts
        or {}
    )

    return max(
        int(
            counts.get(
                "local-restaurant-bar-tavern",
                0,
            )
            or 0
        ),
        int(
            counts.get(
                "bar-tavern",
                0,
            )
            or 0
        ),
    )


def _restaurant_matches_merged_bar_tavern_style(
    restaurant: NearbyRestaurant,
) -> bool:
    normalized_types = (
        _get_normalized_place_types(
            restaurant
        )
    )

    if (
        "food-truck"
        in normalized_types
        or _restaurant_name_is_food_truck(
            restaurant
        )
    ):
        return False

    if _restaurant_is_takeout_only(
        restaurant
    ):
        return False

    if (
        getattr(
            restaurant,
            "business_status",
            "",
        )
        == "CLOSED_PERMANENTLY"
    ):
        return False

    if _restaurant_is_low_confidence_listing(
        restaurant
    ):
        return False

    strong_evidence = bool(
        _restaurant_has_bar_tavern_type(
            restaurant
        )
        or _restaurant_name_has_bar_signal(
            restaurant
        )
        or _restaurant_serves_alcohol(
            restaurant
        )
    )

    if strong_evidence:
        return (
            restaurant.dine_in
            is not False
        )

    search_match_count = (
        _bar_tavern_search_match_count(
            restaurant
        )
    )

    if (
        restaurant.dine_in is True
        and search_match_count >= 3
    ):
        return True

    if (
        restaurant.dine_in is None
        and search_match_count >= 5
    ):
        return True

    return False

def _restaurant_matches_selected_dining_styles(
    restaurant: NearbyRestaurant,
    dining_style_slugs: set[str],
) -> bool:
    """
    Dining styles are hard eligibility filters.

    Bar / Tavern and Local Restaurant / Bar / Tavern are treated as one
    merged style. Text Search provenance is candidate evidence, not
    automatic proof of style eligibility.
    """

    if not dining_style_slugs:
        return True

    canonical_styles = {
        _canonical_dining_style_slug(
            style_slug
        )
        for style_slug
        in dining_style_slugs
    }

    normalized_types = (
        _get_normalized_place_types(
            restaurant
        )
    )

    supported_style_seen = False

    for style_slug in canonical_styles:
        if (
            style_slug
            == "local-restaurant-bar-tavern"
        ):
            supported_style_seen = True

            if (
                _restaurant_matches_merged_bar_tavern_style(
                    restaurant
                )
            ):
                return True

        elif style_slug == "coffee-shop-cafe":
            supported_style_seen = True

            if _restaurant_is_coffee_cafe(
                restaurant
            ):
                return True

        elif style_slug == "delivery":
            supported_style_seen = True

            if restaurant.delivery is True:
                return True

        elif style_slug == "carryout":
            supported_style_seen = True

            if restaurant.takeout is True:
                return True

        elif style_slug in {
            "dine-in",
            "casual-dining",
        }:
            supported_style_seen = True

            if restaurant.dine_in is True:
                return True

        elif style_slug in {
            "fast-food",
            "fast-casual",
        }:
            supported_style_seen = True

            if (
                "fast-food-restaurant"
                in normalized_types
            ):
                return True

        elif style_slug == "drive-through":
            supported_style_seen = True

            if (
                "drive-through"
                in normalized_types
            ):
                return True

        elif style_slug == "buffet":
            supported_style_seen = True

            if (
                "buffet-restaurant"
                in normalized_types
            ):
                return True

        elif style_slug == "food-truck":
            supported_style_seen = True

            if (
                "food-truck"
                in normalized_types
                or _restaurant_name_is_food_truck(
                    restaurant
                )
            ):
                return True

        elif style_slug == "fine-dining":
            supported_style_seen = True

            if (
                PRICE_LEVEL_MAP.get(
                    restaurant.price_level,
                    0,
                )
                >= 3
                and restaurant.dine_in is True
            ):
                return True

        elif style_slug == "local-restaurant":
            supported_style_seen = True

            if (
                "restaurant"
                in normalized_types
                and not _restaurant_name_is_food_truck(
                    restaurant
                )
            ):
                return True

    if not supported_style_seen:
        return True

    return False


def _get_dining_style_adjustment(
    restaurant: NearbyRestaurant,
    dining_style_slugs: set[str],
) -> float:
    """Give restaurants a session-specific dining-style boost."""

    dining_style_slugs = {
        _canonical_dining_style_slug(
            style_slug
        )
        for style_slug
        in dining_style_slugs
    }

    normalized_types = (
        _get_normalized_place_types(
            restaurant
        )
    )

    adjustment = 0.0

    if (
        "bar-tavern"
        in dining_style_slugs
        and _restaurant_has_bar_tavern_type(
            restaurant
        )
    ):
        adjustment = max(
            adjustment,
            10.0,
        )

    if (
        "local-restaurant-bar-tavern"
        in dining_style_slugs
        and _restaurant_has_bar_tavern_type(
            restaurant
        )
        and _restaurant_is_food_forward_bar(
            restaurant
        )
    ):
        adjustment = max(
            adjustment,
            9.0,
        )

    if (
        "coffee-shop-cafe"
        in dining_style_slugs
        and _restaurant_is_coffee_cafe(
            restaurant
        )
    ):
        adjustment = max(
            adjustment,
            9.0,
        )

    if (
        "delivery"
        in dining_style_slugs
        and restaurant.delivery is True
    ):
        adjustment = max(
            adjustment,
            9.0,
        )

    if (
        "carryout"
        in dining_style_slugs
        and restaurant.takeout is True
    ):
        adjustment = max(
            adjustment,
            8.0,
        )

    if (
        "dine-in"
        in dining_style_slugs
        and restaurant.dine_in is True
    ):
        adjustment = max(
            adjustment,
            8.0,
        )

    if (
        "casual-dining"
        in dining_style_slugs
        and restaurant.dine_in is True
    ):
        adjustment = max(
            adjustment,
            8.0,
        )

    if (
        "drive-through"
        in dining_style_slugs
        and "drive-through"
        in normalized_types
    ):
        adjustment = max(
            adjustment,
            10.0,
        )

    if (
        (
            "fast-food"
            in dining_style_slugs
            or "fast-casual"
            in dining_style_slugs
        )
        and "fast-food-restaurant"
        in normalized_types
    ):
        adjustment = max(
            adjustment,
            9.0,
        )

    if (
        "buffet"
        in dining_style_slugs
        and "buffet-restaurant"
        in normalized_types
    ):
        adjustment = max(
            adjustment,
            9.0,
        )

    if (
        "food-truck"
        in dining_style_slugs
        and "food-truck"
        in normalized_types
    ):
        adjustment = max(
            adjustment,
            9.0,
        )

    if (
        "local-restaurant"
        in dining_style_slugs
        and "restaurant"
        in normalized_types
    ):
        adjustment = max(
            adjustment,
            6.0,
        )

    if (
        "fine-dining"
        in dining_style_slugs
        and PRICE_LEVEL_MAP.get(
            restaurant.price_level,
            0,
        )
        >= 3
    ):
        adjustment = max(
            adjustment,
            7.0,
        )

    return adjustment



def _get_dining_style_reasons(
    restaurant: NearbyRestaurant,
    dining_style_slugs: set[str],
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
        available_styles.update(
            {
                "dine-in",
                "casual-dining",
            }
        )

    dining_style_slugs = {
        _canonical_dining_style_slug(
            style_slug
        )
        for style_slug
        in dining_style_slugs
    }

    normalized_types = (
        _get_normalized_place_types(
            restaurant
        )
    )

    if "fast-food-restaurant" in normalized_types:
        available_styles.update(
            {
                "fast-food",
                "fast-casual",
                "drive-through",
            }
        )

    if "buffet-restaurant" in normalized_types:
        available_styles.add(
            "buffet"
        )

    if "food-truck" in normalized_types:
        available_styles.add(
            "food-truck"
        )

    if _restaurant_matches_merged_bar_tavern_style(
        restaurant
    ):
        available_styles.add(
            "local-restaurant-bar-tavern"
        )

    if _restaurant_is_coffee_cafe(
        restaurant
    ):
        available_styles.add(
            "coffee-shop-cafe"
        )

    if "restaurant" in normalized_types:
        available_styles.add(
            "local-restaurant"
        )

    available_styles.update(
        {
            _normalize_slug(style_slug)
            for style_slug in (
                restaurant.dining_style_search_slugs
                or []
            )
        }
    )

    matching_styles = (
        available_styles
        .intersection(
            dining_style_slugs
        )
    )

    return [
        (
            "Session dining style: "
            f"{_display_slug(style_slug)}"
        )
        for style_slug
        in sorted(
            matching_styles
        )
    ]


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


def _is_don_jose_target(
    restaurant: NearbyRestaurant,
) -> bool:
    return (
        "don jose"
        in restaurant.name.strip().lower()
    )


def score_restaurant_for_session(
    *,
    restaurant: NearbyRestaurant,
    session: PickSession,
    participants: list[
        ParticipantPreferenceSnapshot
    ],
    dining_style_slugs: set[str],
) -> ScoredRestaurant | None:
    style_match = (
        _restaurant_matches_selected_dining_styles(
            restaurant,
            dining_style_slugs,
        )
    )

    if _is_don_jose_target(
        restaurant
    ):
        logger.warning(
            (
                "[DON-JOSE-MATCHING] STYLE "
                "name=%r styles=%s result=%s "
                "takeout=%s dine_in=%s types=%s"
            ),
            restaurant.name,
            sorted(dining_style_slugs),
            style_match,
            restaurant.takeout,
            restaurant.dine_in,
            restaurant.types,
        )

    if not style_match:
        return None

    restaurant_cuisines = (
        _get_restaurant_cuisine_slugs(
            restaurant
        )
    )

    if _is_don_jose_target(
        restaurant
    ):
        logger.warning(
            (
                "[DON-JOSE-MATCHING] CUISINES "
                "name=%r primary_type=%r types=%s "
                "inferred=%s"
            ),
            restaurant.name,
            restaurant.primary_type,
            restaurant.types,
            sorted(
                restaurant_cuisines
            ),
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

    if _is_don_jose_target(
        restaurant
    ):
        logger.warning(
            (
                "[DON-JOSE-MATCHING] CUISINE-SCORE "
                "name=%r score=%s reasons=%s "
                "warnings=%s"
            ),
            restaurant.name,
            cuisine_score,
            cuisine_reasons,
            cuisine_warnings,
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

    dietary_tags, dietary_evidence = (
        _get_dietary_tags(
            restaurant,
            restaurant_cuisines,
            participants,
        )
    )

    required_dietary_slugs: set[str] = set()
    preferred_dietary_slugs: set[str] = set()

    for participant in participants:
        required_dietary_slugs.update(
            participant.required_dietary_slugs
        )
        preferred_dietary_slugs.update(
            participant.preferred_dietary_slugs
        )

    preferred_dietary_slugs.difference_update(
        required_dietary_slugs
    )

    (
        dietary_priority_tier,
        dietary_priority_score,
    ) = _get_dietary_priority(
        dietary_evidence=dietary_evidence,
        required_slugs=(
            required_dietary_slugs
        ),
        preferred_slugs=(
            preferred_dietary_slugs
        ),
    )

    dining_style_reasons = (
        _get_dining_style_reasons(
            restaurant,
            dining_style_slugs,
        )
    )

    dining_style_adjustment = (
        _get_dining_style_adjustment(
            restaurant,
            dining_style_slugs,
        )
    )

    weighted_score = (
        cuisine_score
        * CUISINE_WEIGHT
        + distance_score
        * DISTANCE_WEIGHT
        + rating_score
        * RATING_WEIGHT
        + dining_style_adjustment
    )

    if required_dietary_slugs:
        dietary_adjustment = {
            0: 8.0,
            1: 5.0,
            2: 2.0,
            3: -8.0,
            4: -18.0,
        }.get(
            dietary_priority_tier,
            0.0,
        )

        weighted_score += (
            dietary_adjustment
        )
    elif preferred_dietary_slugs:
        weighted_score += min(
            dietary_priority_score
            * 0.05,
            4.0,
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
        ]
    )[:4]

    if _is_don_jose_target(
        restaurant
    ):
        logger.warning(
            (
                "[DON-JOSE-MATCHING] FINAL "
                "name=%r match=%s cuisine=%s "
                "distance=%s rating=%s reasons=%s"
            ),
            restaurant.name,
            final_score,
            cuisine_score,
            distance_score,
            rating_score,
            reasons,
        )

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
        dietary_evidence=dietary_evidence,
        dietary_priority_tier=(
            dietary_priority_tier
        ),
        dietary_priority_score=(
            dietary_priority_score
        ),
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

    dining_style_slugs = set(
        get_session_preferred_dining_style_slugs(
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
                dining_style_slugs=(
                    dining_style_slugs
                ),
            )
        )

        if scored_restaurant is None:
            continue

        scored_restaurants.append(
            scored_restaurant
        )

    required_dietary_slugs: set[str] = set()

    for participant in participants:
        required_dietary_slugs.update(
            participant.required_dietary_slugs
        )

    if required_dietary_slugs:
        scored_restaurants.sort(
            key=lambda item: (
                item.dietary_priority_tier,
                -item.dietary_priority_score,
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
    else:
        scored_restaurants.sort(
            key=lambda item: (
                -item.match_score,
                -item.cuisine_score,
                -item.dietary_priority_score,
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