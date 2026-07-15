import math
from dataclasses import dataclass, replace
from typing import Any, Iterable

import requests
from django.conf import settings


GOOGLE_NEARBY_SEARCH_URL = (
    "https://places.googleapis.com/v1/"
    "places:searchNearby"
)

GOOGLE_PLACES_BASE_URL = (
    "https://places.googleapis.com/v1"
)

METERS_PER_MILE = 1609.344
MAX_GOOGLE_RADIUS_METERS = 50000.0
MAX_GOOGLE_RESULTS_PER_REQUEST = 20
MAX_COMBINED_RESULTS = 100
MAX_PHOTOS_TO_RESOLVE = 25


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


def _is_restaurant_primary_type(
    primary_type: str,
) -> bool:
    normalized_type = (
        primary_type
        .strip()
        .lower()
    )

    if normalized_type == "restaurant":
        return True

    if normalized_type.endswith(
        "_restaurant"
    ):
        return True

    if normalized_type == "steak_house":
        return True

    return False


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

    if (
        not external_id
        or not name
        or not _is_restaurant_primary_type(
            primary_type
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
        types=[
            str(place_type)
            for place_type
            in place.get(
                "types",
                [],
            )
        ],
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

    for primary_type_group in (
        search_groups
    ):
        try:
            places = (
                _perform_nearby_request(
                    api_key=api_key,
                    latitude=latitude,
                    longitude=longitude,
                    radius_meters=(
                        radius_meters
                    ),
                    primary_types=(
                        primary_type_group
                    ),
                    max_results=(
                        per_request_count
                    ),
                )
            )

            successful_request_count += 1

        except GooglePlacesError as error:
            request_errors.append(
                str(error)
            )

            continue

        for place in places:
            restaurant = (
                _parse_restaurant(
                    place,
                    origin_latitude=(
                        latitude
                    ),
                    origin_longitude=(
                        longitude
                    ),
                )
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

            if (
                restaurant.external_id
                not in restaurants_by_id
            ):
                restaurants_by_id[
                    restaurant.external_id
                ] = restaurant

            if (
                len(restaurants_by_id)
                >= MAX_COMBINED_RESULTS
            ):
                break

        if (
            len(restaurants_by_id)
            >= MAX_COMBINED_RESULTS
        ):
            break

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