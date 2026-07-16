from typing import Any
from urllib.parse import quote

import requests
from django.conf import settings


GOOGLE_AUTOCOMPLETE_URL = (
    "https://places.googleapis.com/v1/places:autocomplete"
)
GOOGLE_PLACE_DETAILS_URL = (
    "https://places.googleapis.com/v1/places/{place_id}"
)


class GoogleLocationSearchError(Exception):
    """Raised when Google cannot return usable location data."""


def _get_api_key() -> str:
    api_key = getattr(settings, "GOOGLE_PLACES_API_KEY", "")

    if not api_key:
        raise GoogleLocationSearchError(
            "GOOGLE_PLACES_API_KEY is not configured."
        )

    return api_key


def _read_google_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or "Google Places returned an error."

    return str(
        (payload.get("error") or {}).get("message")
        or "Google Places returned an error."
    )


def search_location_suggestions(
    input_text: str,
) -> list[dict[str, Any]]:
    normalized_input = input_text.strip()

    if len(normalized_input) < 2:
        return []

    api_key = _get_api_key()

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ",".join(
            (
                "suggestions.placePrediction.placeId",
                "suggestions.placePrediction.text.text",
                "suggestions.placePrediction.structuredFormat.mainText.text",
                "suggestions.placePrediction.structuredFormat.secondaryText.text",
                "suggestions.placePrediction.types",
            )
        ),
    }

    request_body = {
        "input": normalized_input,
        "languageCode": "en",
        "regionCode": "us",
        "includePureServiceAreaBusinesses": False,
    }

    try:
        response = requests.post(
            GOOGLE_AUTOCOMPLETE_URL,
            json=request_body,
            headers=headers,
            timeout=12,
        )
    except requests.RequestException as error:
        raise GoogleLocationSearchError(
            "Unable to connect to Google Places."
        ) from error

    if response.status_code >= 400:
        raise GoogleLocationSearchError(
            _read_google_error(response)
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise GoogleLocationSearchError(
            "Google Places returned invalid JSON."
        ) from error

    results: list[dict[str, Any]] = []

    for suggestion in payload.get("suggestions", []):
        if not isinstance(suggestion, dict):
            continue

        prediction = suggestion.get("placePrediction")

        if not isinstance(prediction, dict):
            continue

        place_id = str(prediction.get("placeId") or "").strip()
        full_text = str(
            ((prediction.get("text") or {}).get("text")) or ""
        ).strip()
        structured_format = prediction.get("structuredFormat") or {}
        main_text = str(
            ((structured_format.get("mainText") or {}).get("text"))
            or full_text
        ).strip()
        secondary_text = str(
            ((structured_format.get("secondaryText") or {}).get("text"))
            or ""
        ).strip()

        if not place_id or not full_text:
            continue

        results.append(
            {
                "place_id": place_id,
                "label": full_text,
                "main_text": main_text,
                "secondary_text": secondary_text,
                "types": [
                    str(place_type)
                    for place_type in prediction.get("types", [])
                ],
            }
        )

    return results


def get_location_details(place_id: str) -> dict[str, Any]:
    normalized_place_id = place_id.strip()

    if not normalized_place_id:
        raise GoogleLocationSearchError("A place ID is required.")

    api_key = _get_api_key()
    encoded_place_id = quote(normalized_place_id, safe="")
    url = GOOGLE_PLACE_DETAILS_URL.format(place_id=encoded_place_id)

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ",".join(
            (
                "id",
                "displayName",
                "formattedAddress",
                "location",
                "types",
            )
        ),
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            params={
                "languageCode": "en",
                "regionCode": "us",
            },
            timeout=12,
        )
    except requests.RequestException as error:
        raise GoogleLocationSearchError(
            "Unable to connect to Google Places."
        ) from error

    if response.status_code >= 400:
        raise GoogleLocationSearchError(
            _read_google_error(response)
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise GoogleLocationSearchError(
            "Google Places returned invalid JSON."
        ) from error

    location = payload.get("location") or {}
    latitude = location.get("latitude")
    longitude = location.get("longitude")

    if latitude is None or longitude is None:
        raise GoogleLocationSearchError(
            "Google Places did not return coordinates for this location."
        )

    formatted_address = str(payload.get("formattedAddress") or "").strip()
    display_name = str(
        ((payload.get("displayName") or {}).get("text")) or ""
    ).strip()
    label = formatted_address or display_name

    if not label:
        raise GoogleLocationSearchError(
            "Google Places did not return a readable location name."
        )

    return {
        "place_id": str(payload.get("id") or normalized_place_id),
        "label": label,
        "latitude": float(latitude),
        "longitude": float(longitude),
        "types": [str(value) for value in payload.get("types", [])],
    }
