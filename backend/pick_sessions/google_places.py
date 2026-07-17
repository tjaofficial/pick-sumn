import logging
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, replace
from typing import Any, Iterable

import requests
from django.conf import settings


GOOGLE_NEARBY_SEARCH_URL = (
    "https://places.googleapis.com/v1/"
    "places:searchNearby"
)

GOOGLE_TEXT_SEARCH_URL = (
    "https://places.googleapis.com/v1/"
    "places:searchText"
)

GOOGLE_PLACES_BASE_URL = (
    "https://places.googleapis.com/v1"
)

METERS_PER_MILE = 1609.344
MAX_GOOGLE_RADIUS_METERS = 50000.0
MAX_GOOGLE_RESULTS_PER_REQUEST = 20
MAX_COMBINED_RESULTS = 100
MAX_PHOTOS_TO_RESOLVE = 25
MAX_DIETARY_TEXT_RESULTS = 20
MAX_REVIEW_ENRICHMENTS = 20
MAX_TEXT_SEARCH_PAGES = 3
MAX_DIETARY_QUERIES_PER_SLUG = 10
MAX_GOOGLE_SEARCH_WORKERS = 6
GENERIC_NEARBY_SUBSEARCH_RADIUS_FACTOR = 0.55
GENERIC_NEARBY_SUBSEARCH_OFFSET_FACTOR = 0.72

logger = logging.getLogger(__name__)


class GooglePlacesError(Exception):
    """Raised when Google Places cannot return usable results."""


@dataclass(frozen=True)
class NearbyRestaurant:
    external_id: str
    name: str
    formatted_address: str

    latitude: float | None
    longitude: float | None

    primary_type: str
    primary_type_display_name: str
    types: list[str]

    rating: float | None
    user_rating_count: int

    price_level: str
    open_now: bool | None

    website_uri: str
    google_maps_uri: str

    phone_number: str
    menu_uri: str

    delivery: bool | None
    dine_in: bool | None
    takeout: bool | None

    distance_miles: float | None

    photo_name: str
    photo_url: str

    dietary_search_slugs: list[str]
    dietary_search_match_counts: dict[str, int]
    contextual_review_texts: list[str]
    review_texts: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "external_id": self.external_id,
            "name": self.name,
            "formatted_address": self.formatted_address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "primary_type": self.primary_type,
            "primary_type_display_name": (
                self.primary_type_display_name
            ),
            "types": self.types,
            "rating": self.rating,
            "user_rating_count": (
                self.user_rating_count
            ),
            "price_level": self.price_level,
            "open_now": self.open_now,
            "website_uri": self.website_uri,
            "google_maps_uri": (
                self.google_maps_uri
            ),
            "phone_number": self.phone_number,
            "menu_uri": self.menu_uri,
            "delivery": self.delivery,
            "dine_in": self.dine_in,
            "takeout": self.takeout,
            "distance_miles": (
                self.distance_miles
            ),
            "photo_url": self.photo_url,
            "dietary_search_slugs": [
                *self.dietary_search_slugs
            ],
            "dietary_search_match_counts": {
                **self.dietary_search_match_counts
            },
            "contextual_review_texts": [
                *self.contextual_review_texts
            ],
        }


def _get_api_key() -> str:
    api_key = getattr(
        settings,
        "GOOGLE_PLACES_API_KEY",
        "",
    )

    if not api_key:
        raise GooglePlacesError(
            "GOOGLE_PLACES_API_KEY is not configured."
        )

    return api_key


def _calculate_distance_miles(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> float:
    earth_radius_miles = 3958.7613

    origin_latitude_radians = math.radians(
        origin_latitude
    )

    destination_latitude_radians = math.radians(
        destination_latitude
    )

    latitude_difference = math.radians(
        destination_latitude
        - origin_latitude
    )

    longitude_difference = math.radians(
        destination_longitude
        - origin_longitude
    )

    haversine_value = (
        math.sin(
            latitude_difference / 2
        )
        ** 2
        + math.cos(
            origin_latitude_radians
        )
        * math.cos(
            destination_latitude_radians
        )
        * math.sin(
            longitude_difference / 2
        )
        ** 2
    )

    angular_distance = 2 * math.atan2(
        math.sqrt(haversine_value),
        math.sqrt(
            1 - haversine_value
        ),
    )

    return round(
        earth_radius_miles
        * angular_distance,
        2,
    )


def _get_location(
    place: dict[str, Any],
) -> tuple[
    float | None,
    float | None,
]:
    location = (
        place.get("location")
        or {}
    )

    latitude = location.get(
        "latitude"
    )

    longitude = location.get(
        "longitude"
    )

    if (
        latitude is None
        or longitude is None
    ):
        return None, None

    return (
        float(latitude),
        float(longitude),
    )


def _get_open_now(
    place: dict[str, Any],
) -> bool | None:
    current_hours = (
        place.get(
            "currentOpeningHours"
        )
        or {}
    )

    current_value = (
        current_hours.get(
            "openNow"
        )
    )

    if isinstance(
        current_value,
        bool,
    ):
        return current_value

    regular_hours = (
        place.get(
            "regularOpeningHours"
        )
        or {}
    )

    regular_value = (
        regular_hours.get(
            "openNow"
        )
    )

    if isinstance(
        regular_value,
        bool,
    ):
        return regular_value

    return None


def _get_localized_text(
    value: Any,
) -> str:
    if not isinstance(
        value,
        dict,
    ):
        return ""

    return str(
        value.get("text")
        or ""
    ).strip()


def _get_first_photo_name(
    place: dict[str, Any],
) -> str:
    photos = place.get(
        "photos"
    )

    if not isinstance(
        photos,
        list,
    ):
        return ""

    for photo in photos:
        if not isinstance(
            photo,
            dict,
        ):
            continue

        photo_name = str(
            photo.get("name")
            or ""
        ).strip()

        if photo_name:
            return photo_name

    return ""


FOOD_SERVICE_TYPES = {
    "restaurant",
    "bar",
    "bar_and_grill",
    "beer_garden",
    "bistro",
    "brewery",
    "brewpub",
    "cocktail_bar",
    "cafe",
    "cafeteria",
    "coffee_shop",
    "deli",
    "diner",
    "food",
    "sports_bar",
    "tea_house",
    "wine_bar",
}


def _is_restaurant_type(
    place_type: str,
) -> bool:
    normalized_type = (
        place_type.strip().lower()
    )

    if normalized_type in FOOD_SERVICE_TYPES:
        return True

    if normalized_type.endswith(
        "_restaurant"
    ):
        return True

    if normalized_type in (
        "steak_house",
        "bakery",
        "brewery",
    ):
        return True

    return False


def _is_restaurant_primary_type(
    primary_type: str,
) -> bool:
    return _is_restaurant_type(
        primary_type
    )


def _is_food_service_place(
    primary_type: str,
    place_types: list[str],
) -> bool:
    return any(
        _is_restaurant_type(
            place_type
        )
        for place_type in (
            primary_type,
            *place_types,
        )
    )




NON_FOOD_BUSINESS_TYPES = {
    "beauty_salon",
    "cosmetic_surgery",
    "dentist",
    "doctor",
    "fitness_center",
    "gym",
    "hair_salon",
    "health",
    "hospital",
    "massage",
    "medical_clinic",
    "nail_salon",
    "physiotherapist",
    "skin_care_clinic",
    "spa",
    "wellness_center",
}

NON_FOOD_NAME_KEYWORDS = (
    "beauty",
    "body contour",
    "body sculpt",
    "cosmetic",
    "dental",
    "dentist",
    "lashes",
    "massage",
    "med spa",
    "medical spa",
    "nail salon",
    "skin care",
    "spa",
    "tattoo",
    "wellness",
)


def _has_explicit_food_type(
    primary_type: str,
    place_types: list[str],
) -> bool:
    normalized_types = {
        str(place_type)
        .strip()
        .lower()
        for place_type in (
            primary_type,
            *place_types,
        )
        if str(place_type).strip()
    }

    if any(
        place_type.endswith(
            "_restaurant"
        )
        for place_type in normalized_types
    ):
        return True

    return bool(
        normalized_types.intersection(
            {
                "restaurant",
                "bar_and_grill",
                "brewpub",
                "cafe",
                "cafeteria",
                "coffee_shop",
                "deli",
                "diner",
                "food",
                "sports_bar",
                "tea_house",
            }
        )
    )


def _looks_like_non_food_business(
    *,
    name: str,
    primary_type: str,
    place_types: list[str],
) -> bool:
    normalized_types = {
        str(place_type)
        .strip()
        .lower()
        for place_type in (
            primary_type,
            *place_types,
        )
        if str(place_type).strip()
    }

    has_non_food_type = bool(
        normalized_types.intersection(
            NON_FOOD_BUSINESS_TYPES
        )
    )

    has_explicit_food_type = (
        _has_explicit_food_type(
            primary_type,
            place_types,
        )
    )

    normalized_name = (
        name.strip().lower()
    )

    has_non_food_name = any(
        keyword in normalized_name
        for keyword in (
            NON_FOOD_NAME_KEYWORDS
        )
    )

    return (
        has_non_food_type
        and not has_explicit_food_type
    ) or (
        has_non_food_name
        and not has_explicit_food_type
    )



def _parse_restaurant(
    place: dict[str, Any],
    *,
    origin_latitude: float,
    origin_longitude: float,
) -> NearbyRestaurant | None:
    external_id = str(
        place.get("id")
        or ""
    ).strip()

    name = _get_localized_text(
        place.get("displayName")
    )

    primary_type = str(
        place.get("primaryType")
        or ""
    ).strip()

    place_types = [
        str(place_type)
        for place_type
        in place.get(
            "types",
            [],
        )
    ]

    if (
        not external_id
        or not name
        or not _is_food_service_place(
            primary_type,
            place_types,
        )
        or _looks_like_non_food_business(
            name=name,
            primary_type=primary_type,
            place_types=place_types,
        )
    ):
        return None

    (
        latitude,
        longitude,
    ) = _get_location(
        place
    )

    distance_miles = None

    if (
        latitude is not None
        and longitude is not None
    ):
        distance_miles = (
            _calculate_distance_miles(
                origin_latitude,
                origin_longitude,
                latitude,
                longitude,
            )
        )

    rating_value = place.get(
        "rating"
    )

    rating = (
        float(rating_value)
        if rating_value is not None
        else None
    )

    delivery = place.get(
        "delivery"
    )

    dine_in = place.get(
        "dineIn"
    )

    takeout = place.get(
        "takeout"
    )

    return NearbyRestaurant(
        external_id=external_id,
        name=name,
        formatted_address=str(
            place.get(
                "formattedAddress"
            )
            or ""
        ),
        latitude=latitude,
        longitude=longitude,
        primary_type=primary_type,
        primary_type_display_name=(
            _get_localized_text(
                place.get(
                    "primaryTypeDisplayName"
                )
            )
        ),
        types=place_types,
        rating=rating,
        user_rating_count=int(
            place.get(
                "userRatingCount"
            )
            or 0
        ),
        price_level=str(
            place.get(
                "priceLevel"
            )
            or ""
        ),
        open_now=_get_open_now(
            place
        ),
        website_uri=str(
            place.get(
                "websiteUri"
            )
            or ""
        ),
        google_maps_uri=str(
            place.get(
                "googleMapsUri"
            )
            or ""
        ),
        phone_number=str(
            place.get(
                "nationalPhoneNumber"
            )
            or place.get(
                "internationalPhoneNumber"
            )
            or ""
        ).strip(),
        menu_uri="",
        delivery=(
            delivery
            if isinstance(
                delivery,
                bool,
            )
            else None
        ),
        dine_in=(
            dine_in
            if isinstance(
                dine_in,
                bool,
            )
            else None
        ),
        takeout=(
            takeout
            if isinstance(
                takeout,
                bool,
            )
            else None
        ),
        distance_miles=distance_miles,
        photo_name=_get_first_photo_name(
            place
        ),
        photo_url="",
        dietary_search_slugs=[],
        dietary_search_match_counts={},
        contextual_review_texts=[],
        review_texts=[],
    )


def _normalize_primary_types(
    primary_types: Iterable[str],
) -> list[str]:
    normalized_types: list[str] = []
    seen: set[str] = set()

    for primary_type in primary_types:
        normalized = (
            str(primary_type)
            .strip()
            .lower()
        )

        if not normalized:
            continue

        if normalized in seen:
            continue

        if not _is_restaurant_primary_type(
            normalized
        ):
            continue

        seen.add(
            normalized
        )

        normalized_types.append(
            normalized
        )

    return normalized_types


def _build_headers(
    api_key: str,
) -> dict[str, str]:
    return {
        "Content-Type": (
            "application/json"
        ),
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ",".join(
            (
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.location",
                "places.primaryType",
                "places.primaryTypeDisplayName",
                "places.types",
                "places.rating",
                "places.userRatingCount",
                "places.priceLevel",
                "places.regularOpeningHours",
                "places.currentOpeningHours",
                "places.websiteUri",
                "places.googleMapsUri",
                "places.nationalPhoneNumber",
                "places.internationalPhoneNumber",
                "places.delivery",
                "places.dineIn",
                "places.takeout",
                "places.photos",
            )
        ),
    }


def _build_request_body(
    *,
    latitude: float,
    longitude: float,
    radius_meters: float,
    primary_types: list[str],
    max_results: int,
) -> dict[str, Any]:
    return {
        "includedPrimaryTypes": (
            primary_types
        ),
        "maxResultCount": (
            max_results
        ),
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": latitude,
                    "longitude": longitude,
                },
                "radius": radius_meters,
            }
        },
        "rankPreference": "DISTANCE",
    }


def _read_google_error(
    response: requests.Response,
) -> str:
    try:
        payload = response.json()
    except ValueError:
        return (
            response.text
            or (
                "Google Places returned "
                "an error."
            )
        )

    return str(
        (
            payload.get("error")
            or {}
        ).get("message")
        or (
            "Google Places returned "
            "an error."
        )
    )


def _perform_nearby_request(
    *,
    api_key: str,
    latitude: float,
    longitude: float,
    radius_meters: float,
    primary_types: list[str],
    max_results: int,
) -> list[dict[str, Any]]:
    request_body = (
        _build_request_body(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            primary_types=primary_types,
            max_results=max_results,
        )
    )

    try:
        response = requests.post(
            GOOGLE_NEARBY_SEARCH_URL,
            json=request_body,
            headers=_build_headers(
                api_key
            ),
            timeout=15,
        )
    except requests.RequestException as error:
        raise GooglePlacesError(
            "Unable to connect to Google Places."
        ) from error

    if response.status_code >= 400:
        raise GooglePlacesError(
            _read_google_error(
                response
            )
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise GooglePlacesError(
            "Google Places returned invalid JSON."
        ) from error

    places = payload.get(
        "places",
        [],
    )

    if not isinstance(
        places,
        list,
    ):
        return []

    return [
        place
        for place in places
        if isinstance(
            place,
            dict,
        )
    ]



def _build_text_search_headers(
    api_key: str,
    *,
    include_contextual_content: bool,
) -> dict[str, str]:
    fields = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.regularOpeningHours",
        "places.currentOpeningHours",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.delivery",
        "places.dineIn",
        "places.takeout",
        "places.photos",
        "places.businessStatus",
        "places.movedPlace",
        "places.movedPlaceId",
        "nextPageToken",
    ]

    if include_contextual_content:
        fields.append(
            "contextualContents"
        )

    return {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ",".join(
            fields
        ),
    }



def _extract_contextual_review_texts(
    contextual_content: Any,
) -> list[str]:
    if not isinstance(
        contextual_content,
        dict,
    ):
        return []

    texts: list[str] = []

    reviews = contextual_content.get(
        "reviews",
        [],
    )

    if isinstance(reviews, list):
        for review in reviews:
            review_text = _get_review_text(
                review
            )

            if review_text:
                texts.append(
                    review_text
                )

    justifications = contextual_content.get(
        "justifications",
        [],
    )

    if isinstance(
        justifications,
        list,
    ):
        for justification in justifications:
            if not isinstance(
                justification,
                dict,
            ):
                continue

            review_justification = (
                justification.get(
                    "reviewJustification"
                )
                or {}
            )

            if not isinstance(
                review_justification,
                dict,
            ):
                continue

            highlighted_text = (
                review_justification.get(
                    "highlightedText"
                )
                or {}
            )

            if isinstance(
                highlighted_text,
                dict,
            ):
                text = str(
                    highlighted_text.get(
                        "text"
                    )
                    or ""
                ).strip()

                if text:
                    texts.append(text)

            review_text = _get_review_text(
                review_justification.get(
                    "review"
                )
            )

            if review_text:
                texts.append(
                    review_text
                )

    result: list[str] = []
    seen: set[str] = set()

    for text in texts:
        normalized = " ".join(
            text.split()
        )

        if (
            not normalized
            or normalized.lower()
            in seen
        ):
            continue

        seen.add(
            normalized.lower()
        )
        result.append(normalized)

    return result[:5]


def _perform_text_search_request_once(
    *,
    api_key: str,
    text_query: str,
    latitude: float,
    longitude: float,
    radius_meters: float,
    include_contextual_content: bool,
) -> list[dict[str, Any]]:
    base_request_body = {
        "textQuery": text_query,
        "pageSize": MAX_DIETARY_TEXT_RESULTS,
        "rankPreference": "RELEVANCE",
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": latitude,
                    "longitude": longitude,
                },
                "radius": radius_meters,
            }
        },
    }

    all_results: list[
        dict[str, Any]
    ] = []

    next_page_token = ""

    for page_index in range(
        MAX_TEXT_SEARCH_PAGES
    ):
        request_body = {
            **base_request_body,
        }

        if next_page_token:
            request_body[
                "pageToken"
            ] = next_page_token

        try:
            response = requests.post(
                GOOGLE_TEXT_SEARCH_URL,
                json=request_body,
                headers=_build_text_search_headers(
                    api_key,
                    include_contextual_content=(
                        include_contextual_content
                    ),
                ),
                timeout=20,
            )
        except requests.RequestException as error:
            if page_index == 0:
                raise GooglePlacesError(
                    "Unable to connect to Google Places Text Search."
                ) from error

            break

        if response.status_code >= 400:
            if page_index == 0:
                raise GooglePlacesError(
                    _read_google_error(
                        response
                    )
                )

            break

        try:
            payload = response.json()
        except ValueError as error:
            if page_index == 0:
                raise GooglePlacesError(
                    "Google Places Text Search returned invalid JSON."
                ) from error

            break

        places = payload.get(
            "places",
            [],
        )

        contextual_contents = payload.get(
            "contextualContents",
            [],
        )

        if not isinstance(
            places,
            list,
        ):
            places = []

        if not isinstance(
            contextual_contents,
            list,
        ):
            contextual_contents = []

        for index, place in enumerate(
            places
        ):
            if not isinstance(
                place,
                dict,
            ):
                continue

            contextual_content = (
                contextual_contents[index]
                if index
                < len(contextual_contents)
                else {}
            )

            all_results.append(
                {
                    **place,
                    "_contextualReviewTexts": (
                        _extract_contextual_review_texts(
                            contextual_content
                        )
                    ),
                }
            )

        next_page_token = str(
            payload.get(
                "nextPageToken"
            )
            or ""
        ).strip()

        if not next_page_token:
            break

    return all_results


def _perform_text_search_request(
    *,
    api_key: str,
    text_query: str,
    latitude: float,
    longitude: float,
    radius_meters: float,
) -> list[dict[str, Any]]:
    try:
        return _perform_text_search_request_once(
            api_key=api_key,
            text_query=text_query,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            include_contextual_content=True,
        )
    except GooglePlacesError as contextual_error:
        logger.warning(
            (
                "Text Search contextual content failed for %r: %s. "
                "Retrying without contextual content."
            ),
            text_query,
            contextual_error,
        )

    return _perform_text_search_request_once(
        api_key=api_key,
        text_query=text_query,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        include_contextual_content=False,
    )



def _get_review_text(
    review: Any,
) -> str:
    if not isinstance(review, dict):
        return ""

    text_value = review.get("text")

    if isinstance(text_value, dict):
        return str(
            text_value.get("text")
            or ""
        ).strip()

    return str(text_value or "").strip()


def _get_place_dietary_details(
    *,
    api_key: str,
    place_id: str,
) -> tuple[list[str], str]:
    try:
        response = requests.get(
            (
                f"{GOOGLE_PLACES_BASE_URL}/"
                f"places/{place_id}"
            ),
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": (
                    "reviews,menuUri"
                ),
            },
            timeout=12,
        )
    except requests.RequestException:
        return [], ""

    if response.status_code >= 400:
        return [], ""

    try:
        payload = response.json()
    except ValueError:
        return [], ""

    reviews = payload.get("reviews", [])
    review_texts: list[str] = []

    if isinstance(reviews, list):
        review_texts = [
            review_text
            for review_text in (
                _get_review_text(review)
                for review in reviews
            )
            if review_text
        ]

    return (
        review_texts,
        str(payload.get("menuUri") or "").strip(),
    )


def _normalize_search_label(
    value: str,
) -> str:
    return (
        value.strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
    )



DINING_STYLE_TEXT_QUERIES = {
    "local-restaurant-bar-tavern": (
        "local restaurants and taverns in {location}",
        "bar and grill in {location}",
        "taverns in {location}",
        "local restaurant bar in {location}",
        "pub and grill in {location}",
        "restaurants bars and taverns near {location}",
        "local pubs with food near {location}",
        "lakefront restaurants and taverns near {location}",
        "restaurants near {location}",
        "local restaurants near {location}",
    ),
    "bar-tavern": (
        "bars and taverns in {location}",
        "pubs in {location}",
        "sports bars in {location}",
        "brewpubs in {location}",
        "cocktail bars in {location}",
    ),
    "coffee-shop-cafe": (
        "coffee shops in {location}",
        "cafes in {location}",
        "tea houses in {location}",
        "local coffee shops in {location}",
    ),
}


def _build_dining_style_text_queries(
    *,
    dining_style_slugs: list[str],
    location_label: str,
) -> list[str]:
    clean_location = (
        location_label.strip()
        or "the selected area"
    )

    queries: list[str] = []
    seen: set[str] = set()

    for style_slug in dining_style_slugs:
        normalized_slug = (
            style_slug.strip()
            .lower()
            .replace("_", "-")
            .replace(" ", "-")
        )

        for template in (
            DINING_STYLE_TEXT_QUERIES.get(
                normalized_slug,
                ()
            )
        ):
            query = template.format(
                location=clean_location
            )

            key = query.lower()

            if key in seen:
                continue

            seen.add(key)
            queries.append(query)

    return queries


def search_dining_style_restaurants(
    *,
    latitude: float,
    longitude: float,
    radius_miles: int,
    dining_style_slugs: list[str],
    location_label: str = "",
    open_now: bool = True,
    include_delivery: bool = False,
    include_drive_through: bool = False,
) -> list[NearbyRestaurant]:
    if not dining_style_slugs:
        return []

    api_key = _get_api_key()

    radius_meters = min(
        max(
            float(radius_miles)
            * METERS_PER_MILE,
            1.0,
        ),
        MAX_GOOGLE_RADIUS_METERS,
    )

    queries = (
        _build_dining_style_text_queries(
            dining_style_slugs=(
                dining_style_slugs
            ),
            location_label=location_label,
        )
    )

    query_results: list[
        list[dict[str, Any]]
    ] = []

    with ThreadPoolExecutor(
        max_workers=min(
            MAX_GOOGLE_SEARCH_WORKERS,
            max(len(queries), 1),
        )
    ) as executor:
        future_to_query = {
            executor.submit(
                _perform_text_search_request,
                api_key=api_key,
                text_query=text_query,
                latitude=latitude,
                longitude=longitude,
                radius_meters=radius_meters,
            ): text_query
            for text_query in queries
        }

        for future in as_completed(
            future_to_query
        ):
            text_query = (
                future_to_query[future]
            )

            try:
                query_results.append(
                    future.result()
                )
            except GooglePlacesError as error:
                logger.warning(
                    (
                        "Dining-style Text Search failed "
                        "for %r: %s"
                    ),
                    text_query,
                    error,
                )

    restaurants_by_id: dict[
        str,
        NearbyRestaurant,
    ] = {}

    for places in query_results:
        for place in places:
            restaurant = _parse_restaurant(
                place,
                origin_latitude=latitude,
                origin_longitude=longitude,
            )

            if restaurant is None:
                continue

            if (
                restaurant.distance_miles
                is not None
                and restaurant.distance_miles
                > float(radius_miles)
            ):
                continue

            if not _passes_service_filters(
                restaurant,
                open_now=open_now,
                include_delivery=(
                    include_delivery
                ),
                include_drive_through=(
                    include_drive_through
                ),
            ):
                continue

            restaurants_by_id[
                restaurant.external_id
            ] = restaurant

    restaurants = list(
        restaurants_by_id.values()
    )

    restaurants.sort(
        key=lambda restaurant: (
            (
                restaurant.distance_miles
                if restaurant.distance_miles
                is not None
                else 9999
            ),
            -(
                restaurant.rating
                if restaurant.rating
                is not None
                else 0
            ),
            -restaurant.user_rating_count,
        )
    )

    return _add_photo_urls(
        restaurants=restaurants,
        api_key=api_key,
    )



def _build_dietary_text_queries(
    *,
    dietary_slug: str,
    preferred_cuisine_slugs: list[str],
    location_label: str,
) -> list[str]:
    dietary_label = _normalize_search_label(
        dietary_slug
    )

    clean_location = (
        location_label.strip()
        or "the selected area"
    )

    queries: list[str] = []

    for cuisine_slug in (
        preferred_cuisine_slugs[:3]
    ):
        cuisine_label = (
            _normalize_search_label(
                cuisine_slug
            )
        )

        if not cuisine_label:
            continue

        queries.extend(
            (
                (
                    f"{dietary_label} {cuisine_label} "
                    f"restaurants in {clean_location}"
                ),
                (
                    f"{cuisine_label} restaurants with "
                    f"{dietary_label} options in "
                    f"{clean_location}"
                ),
            )
        )

    queries.extend(
        (
            (
                f"{dietary_label} restaurants in "
                f"{clean_location}"
            ),
            (
                f"restaurants with {dietary_label} "
                f"menu in {clean_location}"
            ),
            (
                f"{dietary_label} options in "
                f"{clean_location}"
            ),
            (
                f"{dietary_label} dining in "
                f"{clean_location}"
            ),
            (
                f"{dietary_label} bar and grill in "
                f"{clean_location}"
            ),
            (
                f"{dietary_label} tavern in "
                f"{clean_location}"
            ),
        )
    )

    if dietary_slug == "gluten-free":
        top_cuisine = (
            _normalize_search_label(
                preferred_cuisine_slugs[0]
            )
            if preferred_cuisine_slugs
            else ""
        )

        if top_cuisine:
            queries.append(
                (
                    f"celiac friendly {top_cuisine} "
                    f"restaurants in {clean_location}"
                )
            )

        queries.append(
            (
                f"celiac friendly restaurants in "
                f"{clean_location}"
            )
        )

    deduplicated: list[str] = []
    seen: set[str] = set()

    for query in queries:
        normalized_query = (
            " ".join(query.split())
        )

        key = normalized_query.lower()

        if (
            not normalized_query
            or key in seen
        ):
            continue

        seen.add(key)
        deduplicated.append(
            normalized_query
        )

        if (
            len(deduplicated)
            >= MAX_DIETARY_QUERIES_PER_SLUG
        ):
            break

    return deduplicated


def search_dietary_restaurants(
    *,
    latitude: float,
    longitude: float,
    radius_miles: int,
    dietary_slugs: list[str],
    preferred_cuisine_slugs: list[str] | None = None,
    location_label: str = "",
    open_now: bool = True,
    include_delivery: bool = False,
    include_drive_through: bool = False,
) -> list[NearbyRestaurant]:
    api_key = _get_api_key()

    radius_meters = min(
        max(
            float(radius_miles) * METERS_PER_MILE,
            1.0,
        ),
        MAX_GOOGLE_RADIUS_METERS,
    )

    restaurants_by_id: dict[
        str,
        NearbyRestaurant,
    ] = {}

    for dietary_slug in dietary_slugs:
        normalized_slug = (
            dietary_slug.strip()
            .lower()
            .replace("_", "-")
            .replace(" ", "-")
        )

        if not normalized_slug:
            continue

        queries = _build_dietary_text_queries(
            dietary_slug=normalized_slug,
            preferred_cuisine_slugs=(
                preferred_cuisine_slugs
                or []
            ),
            location_label=location_label,
        )

        query_results: list[
            list[dict[str, Any]]
        ] = []

        with ThreadPoolExecutor(
            max_workers=min(
                MAX_GOOGLE_SEARCH_WORKERS,
                max(len(queries), 1),
            )
        ) as executor:
            future_to_query = {
                executor.submit(
                    _perform_text_search_request,
                    api_key=api_key,
                    text_query=text_query,
                    latitude=latitude,
                    longitude=longitude,
                    radius_meters=radius_meters,
                ): text_query
                for text_query in queries
            }

            for future in as_completed(
                future_to_query
            ):
                text_query = (
                    future_to_query[future]
                )

                try:
                    query_results.append(
                        future.result()
                    )
                except GooglePlacesError as error:
                    logger.warning(
                        (
                            "Dietary Text Search failed "
                            "for %r: %s"
                        ),
                        text_query,
                        error,
                    )

        for places in query_results:
            for place in places:
                    restaurant = _parse_restaurant(
                        place,
                        origin_latitude=latitude,
                        origin_longitude=longitude,
                    )

                    if restaurant is None:
                        continue

                    if (
                        restaurant.distance_miles is not None
                        and restaurant.distance_miles
                        > float(radius_miles)
                    ):
                        continue

                    if not _passes_service_filters(
                        restaurant,
                        open_now=open_now,
                        include_delivery=include_delivery,
                        include_drive_through=include_drive_through,
                    ):
                        continue

                    contextual_review_texts = [
                        str(text).strip()
                        for text in place.get(
                            "_contextualReviewTexts",
                            [],
                        )
                        if str(text).strip()
                    ]

                    existing = restaurants_by_id.get(
                        restaurant.external_id
                    )

                    search_slugs = {
                        normalized_slug,
                    }

                    match_counts = {
                        normalized_slug: 1,
                    }

                    if existing is not None:
                        search_slugs.update(
                            existing.dietary_search_slugs
                        )

                        contextual_review_texts = list(
                            dict.fromkeys(
                                [
                                    *existing
                                    .contextual_review_texts,
                                    *contextual_review_texts,
                                ]
                            )
                        )[:8]

                        match_counts = {
                            **existing
                            .dietary_search_match_counts
                        }

                        match_counts[
                            normalized_slug
                        ] = (
                            match_counts.get(
                                normalized_slug,
                                0,
                            )
                            + 1
                        )

                    restaurants_by_id[
                        restaurant.external_id
                    ] = replace(
                        existing or restaurant,
                        dietary_search_slugs=sorted(
                            search_slugs
                        ),
                        dietary_search_match_counts=(
                            match_counts
                        ),
                        contextual_review_texts=(
                            contextual_review_texts
                        ),
                    )

    restaurants = list(
        restaurants_by_id.values()
    )

    restaurants.sort(
        key=lambda restaurant: (
            -sum(
                restaurant
                .dietary_search_match_counts
                .values()
            ),
            -len(
                restaurant.dietary_search_slugs
            ),
            (
                restaurant.distance_miles
                if restaurant.distance_miles
                is not None
                else 9999
            ),
            -(
                restaurant.rating
                if restaurant.rating
                is not None
                else 0
            ),
        )
    )

    return _add_photo_urls(
        restaurants=restaurants,
        api_key=api_key,
    )



def merge_restaurant_results(
    *result_groups: list[NearbyRestaurant],
) -> list[NearbyRestaurant]:
    restaurants_by_id: dict[
        str,
        NearbyRestaurant,
    ] = {}

    for result_group in result_groups:
        for restaurant in result_group:
            existing = restaurants_by_id.get(
                restaurant.external_id
            )

            if existing is None:
                restaurants_by_id[
                    restaurant.external_id
                ] = restaurant
                continue

            dietary_search_slugs = sorted(
                {
                    *existing.dietary_search_slugs,
                    *restaurant.dietary_search_slugs,
                }
            )

            dietary_search_match_counts = {
                **existing
                .dietary_search_match_counts
            }

            contextual_review_texts = list(
                dict.fromkeys(
                    [
                        *existing
                        .contextual_review_texts,
                        *restaurant
                        .contextual_review_texts,
                    ]
                )
            )[:8]

            for (
                dietary_slug,
                match_count,
            ) in (
                restaurant
                .dietary_search_match_counts
                .items()
            ):
                dietary_search_match_counts[
                    dietary_slug
                ] = max(
                    dietary_search_match_counts.get(
                        dietary_slug,
                        0,
                    ),
                    match_count,
                )

            restaurants_by_id[
                restaurant.external_id
            ] = replace(
                existing,
                dietary_search_slugs=(
                    dietary_search_slugs
                ),
                dietary_search_match_counts=(
                    dietary_search_match_counts
                ),
                contextual_review_texts=(
                    contextual_review_texts
                ),
                photo_name=(
                    existing.photo_name
                    or restaurant.photo_name
                ),
                photo_url=(
                    existing.photo_url
                    or restaurant.photo_url
                ),
                menu_uri=(
                    existing.menu_uri
                    or restaurant.menu_uri
                ),
            )

    return list(
        restaurants_by_id.values()
    )


def enrich_restaurants_with_dietary_details(
    restaurants: list[NearbyRestaurant],
    *,
    limit: int = MAX_REVIEW_ENRICHMENTS,
) -> list[NearbyRestaurant]:
    api_key = _get_api_key()
    enriched: list[NearbyRestaurant] = []

    for index, restaurant in enumerate(
        restaurants
    ):
        if index >= max(0, limit):
            enriched.append(restaurant)
            continue

        review_texts, menu_uri = (
            _get_place_dietary_details(
                api_key=api_key,
                place_id=restaurant.external_id,
            )
        )

        enriched.append(
            replace(
                restaurant,
                review_texts=review_texts,
                menu_uri=(
                    menu_uri
                    or restaurant.menu_uri
                ),
            )
        )

    return enriched


def _resolve_photo_url(
    *,
    api_key: str,
    photo_name: str,
) -> str:
    if not photo_name:
        return ""

    photo_media_url = (
        f"{GOOGLE_PLACES_BASE_URL}/"
        f"{photo_name}/media"
    )

    try:
        response = requests.get(
            photo_media_url,
            params={
                "maxWidthPx": 800,
                "maxHeightPx": 600,
                "skipHttpRedirect": "true",
                "key": api_key,
            },
            timeout=12,
        )
    except requests.RequestException:
        return ""

    if response.status_code >= 400:
        return ""

    try:
        payload = response.json()
    except ValueError:
        return ""

    return str(
        payload.get(
            "photoUri"
        )
        or ""
    ).strip()


def _add_photo_urls(
    *,
    restaurants: list[
        NearbyRestaurant
    ],
    api_key: str,
) -> list[NearbyRestaurant]:
    resolved_restaurants: list[
        NearbyRestaurant
    ] = []

    for index, restaurant in enumerate(
        restaurants
    ):
        if (
            index >= MAX_PHOTOS_TO_RESOLVE
            or not restaurant.photo_name
        ):
            resolved_restaurants.append(
                restaurant
            )

            continue

        photo_url = _resolve_photo_url(
            api_key=api_key,
            photo_name=(
                restaurant.photo_name
            ),
        )

        resolved_restaurants.append(
            replace(
                restaurant,
                photo_url=photo_url,
            )
        )

    return resolved_restaurants


def _passes_service_filters(
    restaurant: NearbyRestaurant,
    *,
    open_now: bool,
    include_delivery: bool,
    include_drive_through: bool,
) -> bool:
    if (
        open_now
        and restaurant.open_now
        is False
    ):
        return False

    if (
        include_delivery
        and restaurant.delivery
        is not True
    ):
        return False

    if include_drive_through:
        has_drive_through = (
            "drive_through"
            in restaurant.types
        )

        if not has_drive_through:
            return False

    return True



def _offset_coordinates(
    *,
    latitude: float,
    longitude: float,
    distance_meters: float,
    bearing_degrees: float,
) -> tuple[float, float]:
    earth_radius_meters = 6371008.8

    angular_distance = (
        distance_meters
        / earth_radius_meters
    )

    bearing = math.radians(
        bearing_degrees
    )

    latitude_radians = math.radians(
        latitude
    )

    longitude_radians = math.radians(
        longitude
    )

    destination_latitude = math.asin(
        math.sin(latitude_radians)
        * math.cos(angular_distance)
        + math.cos(latitude_radians)
        * math.sin(angular_distance)
        * math.cos(bearing)
    )

    destination_longitude = (
        longitude_radians
        + math.atan2(
            math.sin(bearing)
            * math.sin(angular_distance)
            * math.cos(latitude_radians),
            math.cos(angular_distance)
            - math.sin(latitude_radians)
            * math.sin(destination_latitude),
        )
    )

    return (
        math.degrees(
            destination_latitude
        ),
        math.degrees(
            destination_longitude
        ),
    )


def _perform_generic_nearby_coverage(
    *,
    api_key: str,
    latitude: float,
    longitude: float,
    radius_meters: float,
    max_results: int,
) -> list[dict[str, Any]]:
    """
    Google Nearby Search returns at most 20 places for a circle.

    A single large generic restaurant circle can therefore omit nearby
    restaurants in a dense area. Search one center circle plus six
    overlapping offset circles and merge by Google Place ID.
    """

    sub_radius = max(
        min(
            radius_meters
            * GENERIC_NEARBY_SUBSEARCH_RADIUS_FACTOR,
            radius_meters,
        ),
        750.0,
    )

    offset_distance = (
        radius_meters
        * GENERIC_NEARBY_SUBSEARCH_OFFSET_FACTOR
    )

    search_centers = [
        (
            latitude,
            longitude,
        )
    ]

    for bearing in (
        0,
        60,
        120,
        180,
        240,
        300,
    ):
        search_centers.append(
            _offset_coordinates(
                latitude=latitude,
                longitude=longitude,
                distance_meters=(
                    offset_distance
                ),
                bearing_degrees=(
                    bearing
                ),
            )
        )

    places_by_id: dict[
        str,
        dict[str, Any],
    ] = {}

    with ThreadPoolExecutor(
        max_workers=min(
            MAX_GOOGLE_SEARCH_WORKERS,
            len(search_centers),
        )
    ) as executor:
        futures = [
            executor.submit(
                _perform_nearby_request,
                api_key=api_key,
                latitude=center_latitude,
                longitude=center_longitude,
                radius_meters=sub_radius,
                primary_types=[
                    "restaurant"
                ],
                max_results=max_results,
            )
            for (
                center_latitude,
                center_longitude,
            ) in search_centers
        ]

        for future in as_completed(
            futures
        ):
            try:
                places = future.result()
            except GooglePlacesError as error:
                logger.warning(
                    (
                        "Generic restaurant coverage "
                        "search failed: %s"
                    ),
                    error,
                )
                continue

            for place in places:
                place_id = str(
                    place.get("id")
                    or ""
                ).strip()

                if not place_id:
                    continue

                places_by_id[
                    place_id
                ] = place

    return list(
        places_by_id.values()
    )



def search_nearby_restaurants(
    *,
    latitude: float,
    longitude: float,
    radius_miles: int,
    preferred_primary_types: (
        list[str] | None
    ) = None,
    open_now: bool = True,
    include_delivery: bool = False,
    include_drive_through: bool = False,
    max_results_per_type: int = 20,
    include_generic_fallback: bool = True,
) -> list[NearbyRestaurant]:
    api_key = _get_api_key()

    radius_meters = min(
        max(
            float(radius_miles)
            * METERS_PER_MILE,
            1.0,
        ),
        MAX_GOOGLE_RADIUS_METERS,
    )

    per_request_count = min(
        max(
            int(max_results_per_type),
            1,
        ),
        MAX_GOOGLE_RESULTS_PER_REQUEST,
    )

    preferred_types = (
        _normalize_primary_types(
            preferred_primary_types
            or []
        )
    )

    search_groups = [
        [primary_type]
        for primary_type
        in preferred_types
    ]

    if (
        include_generic_fallback
        or not search_groups
    ):
        search_groups.append(
            ["restaurant"]
        )

    restaurants_by_id: dict[
        str,
        NearbyRestaurant,
    ] = {}

    successful_request_count = 0
    request_errors: list[str] = []

    with ThreadPoolExecutor(
        max_workers=min(
            MAX_GOOGLE_SEARCH_WORKERS,
            max(len(search_groups), 1),
        )
    ) as executor:
        future_to_group = {}

        for primary_type_group in (
            search_groups
        ):
            if primary_type_group == [
                "restaurant"
            ]:
                future = executor.submit(
                    _perform_generic_nearby_coverage,
                    api_key=api_key,
                    latitude=latitude,
                    longitude=longitude,
                    radius_meters=radius_meters,
                    max_results=(
                        per_request_count
                    ),
                )
            else:
                future = executor.submit(
                    _perform_nearby_request,
                    api_key=api_key,
                    latitude=latitude,
                    longitude=longitude,
                    radius_meters=radius_meters,
                    primary_types=(
                        primary_type_group
                    ),
                    max_results=(
                        per_request_count
                    ),
                )

            future_to_group[
                future
            ] = primary_type_group

        for future in as_completed(
            future_to_group
        ):
            primary_type_group = (
                future_to_group[future]
            )

            try:
                places = future.result()
                successful_request_count += 1
            except GooglePlacesError as error:
                request_errors.append(
                    str(error)
                )
                continue

            for place in places:
                restaurant = _parse_restaurant(
                    place,
                    origin_latitude=(
                        latitude
                    ),
                    origin_longitude=(
                        longitude
                    ),
                )

                if restaurant is None:
                    continue

                if not _passes_service_filters(
                    restaurant,
                    open_now=open_now,
                    include_delivery=(
                        include_delivery
                    ),
                    include_drive_through=(
                        include_drive_through
                    ),
                ):
                    continue

                restaurants_by_id[
                    restaurant.external_id
                ] = restaurant


    if (
        successful_request_count == 0
        and request_errors
    ):
        raise GooglePlacesError(
            request_errors[0]
        )

    restaurants = list(
        restaurants_by_id.values()
    )

    restaurants.sort(
        key=lambda restaurant: (
            (
                restaurant.distance_miles
                if restaurant.distance_miles
                is not None
                else 9999
            ),
            -(
                restaurant.rating
                if restaurant.rating
                is not None
                else 0
            ),
            -restaurant.user_rating_count,
        )
    )

    return _add_photo_urls(
        restaurants=restaurants,
        api_key=api_key,
    )