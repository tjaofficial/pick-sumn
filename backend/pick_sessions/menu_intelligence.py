from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from datetime import timedelta
from html.parser import HTMLParser
from typing import Iterable
from urllib.parse import urljoin, urlparse

import requests
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from django.db import transaction
from django.utils import timezone

from .google_places import NearbyRestaurant
from .models import (
    DietaryEvidenceSourceType,
    DietaryEvidenceStatus,
    RestaurantDietaryEvidence,
    RestaurantDietaryProfile,
)


MAX_OFFICIAL_MENU_ANALYSES = 8
MAX_REDIRECTS = 3
MAX_RESPONSE_BYTES = 4_000_000
MAX_PDF_PAGES = 35
MAX_PDF_TEXT_CHARACTERS = 300_000
CACHE_DAYS = 30
REQUEST_TIMEOUT_SECONDS = 12


DIETARY_ALIASES = {
    "gluten-free": (
        "gluten free",
        "gluten-free",
        "gf",
        "celiac",
    ),
    "dairy-free": (
        "dairy free",
        "dairy-free",
        "non-dairy",
        "no dairy",
    ),
    "vegan": (
        "vegan",
        "plant-based",
        "plant based",
    ),
    "vegetarian": (
        "vegetarian",
        "meatless",
    ),
    "nut-free": (
        "nut free",
        "nut-free",
        "peanut free",
        "peanut-free",
    ),
    "halal": (
        "halal",
    ),
    "kosher": (
        "kosher",
    ),
}


DEDICATED_PHRASES = {
    "gluten-free": (
        "100% gluten free",
        "100% gluten-free",
        "entirely gluten free",
        "entirely gluten-free",
        "dedicated gluten free",
        "dedicated gluten-free",
    ),
    "dairy-free": (
        "100% dairy free",
        "100% dairy-free",
        "entirely dairy free",
        "entirely dairy-free",
    ),
    "vegan": (
        "100% vegan",
        "fully vegan",
        "all vegan",
    ),
    "vegetarian": (
        "100% vegetarian",
        "fully vegetarian",
        "all vegetarian",
    ),
    "nut-free": (
        "100% nut free",
        "100% nut-free",
        "dedicated nut free",
        "dedicated nut-free",
    ),
}


PREPARATION_PHRASES = {
    "gluten-free": (
        "dedicated fryer",
        "separate fryer",
        "separate preparation area",
        "separate prep area",
        "change gloves",
        "changed gloves",
        "allergen protocol",
    ),
    "dairy-free": (
        "separate preparation area",
        "separate prep area",
        "allergen protocol",
    ),
    "nut-free": (
        "separate preparation area",
        "separate prep area",
        "allergen protocol",
        "peanut-free facility",
        "nut-free facility",
    ),
}


class OfficialMenuFetchError(Exception):
    """Raised when an official restaurant source cannot be fetched safely."""


class VisibleTextParser(HTMLParser):
    BLOCK_TAGS = {
        "article",
        "br",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "main",
        "p",
        "section",
        "td",
        "th",
        "tr",
    }

    SKIP_TAGS = {
        "script",
        "style",
        "noscript",
        "svg",
    }

    def __init__(self):
        super().__init__(
            convert_charrefs=True,
        )
        self._skip_depth = 0
        self._current_parts: list[str] = []
        self.lines: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs,
    ):
        normalized_tag = tag.lower()

        if normalized_tag in self.SKIP_TAGS:
            self._skip_depth += 1
            return

        if (
            self._skip_depth == 0
            and normalized_tag in self.BLOCK_TAGS
        ):
            self._flush()

    def handle_endtag(
        self,
        tag: str,
    ):
        normalized_tag = tag.lower()

        if normalized_tag in self.SKIP_TAGS:
            self._skip_depth = max(
                0,
                self._skip_depth - 1,
            )
            return

        if (
            self._skip_depth == 0
            and normalized_tag in self.BLOCK_TAGS
        ):
            self._flush()

    def handle_data(
        self,
        data: str,
    ):
        if self._skip_depth > 0:
            return

        normalized = re.sub(
            r"\s+",
            " ",
            data,
        ).strip()

        if normalized:
            self._current_parts.append(
                normalized
            )

    def close(self):
        super().close()
        self._flush()

    def _flush(self):
        if not self._current_parts:
            return

        line = " ".join(
            self._current_parts
        ).strip()

        self._current_parts = []

        if line:
            self.lines.append(line)


@dataclass(frozen=True)
class OfficialMenuFinding:
    source_url: str
    source_type: str
    confidence_score: int
    dedicated_facility: bool
    menu_items: list[str]
    claims: list[tuple[str, str, int]]


def _normalize_slug(
    value: str,
) -> str:
    return (
        value.strip()
        .lower()
        .replace("_", "-")
        .replace(" ", "-")
    )


def _is_public_ip(
    value: str,
) -> bool:
    try:
        address = ipaddress.ip_address(
            value
        )
    except ValueError:
        return False

    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )


def _validate_public_url(
    url: str,
) -> str:
    parsed = urlparse(url)

    if parsed.scheme not in (
        "http",
        "https",
    ):
        raise OfficialMenuFetchError(
            "Only HTTP and HTTPS menu URLs are supported."
        )

    hostname = (
        parsed.hostname
        or ""
    ).strip().lower()

    if not hostname:
        raise OfficialMenuFetchError(
            "The menu URL does not contain a hostname."
        )

    if hostname in (
        "localhost",
        "localhost.localdomain",
    ):
        raise OfficialMenuFetchError(
            "Local menu URLs are not allowed."
        )

    try:
        address_info = socket.getaddrinfo(
            hostname,
            parsed.port
            or (
                443
                if parsed.scheme == "https"
                else 80
            ),
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as error:
        raise OfficialMenuFetchError(
            "The official menu hostname could not be resolved."
        ) from error

    resolved_addresses = {
        item[4][0]
        for item in address_info
    }

    if (
        not resolved_addresses
        or any(
            not _is_public_ip(address)
            for address in resolved_addresses
        )
    ):
        raise OfficialMenuFetchError(
            "The menu URL resolved to a non-public network address."
        )

    return url


def _fetch_official_source(
    url: str,
) -> tuple[bytes, str, str]:
    current_url = _validate_public_url(
        url
    )

    headers = {
        "User-Agent": (
            "PickSumnMenuAnalyzer/1.1 "
            "(official-menu dietary analysis)"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,"
            "application/pdf,text/plain;q=0.9"
        ),
    }

    for _ in range(
        MAX_REDIRECTS + 1
    ):
        try:
            response = requests.get(
                current_url,
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
                allow_redirects=False,
                stream=True,
            )
        except requests.RequestException as error:
            raise OfficialMenuFetchError(
                "Unable to connect to the official restaurant source."
            ) from error

        if response.status_code in (
            301,
            302,
            303,
            307,
            308,
        ):
            location = response.headers.get(
                "Location",
                "",
            )

            if not location:
                raise OfficialMenuFetchError(
                    "The official source redirected without a destination."
                )

            current_url = _validate_public_url(
                urljoin(
                    current_url,
                    location,
                )
            )
            continue

        if response.status_code >= 400:
            raise OfficialMenuFetchError(
                (
                    "The official restaurant source returned "
                    f"HTTP {response.status_code}."
                )
            )

        content_type = (
            response.headers.get(
                "Content-Type",
                "",
            )
            .split(";", 1)[0]
            .strip()
            .lower()
        )

        allowed_types = (
            "text/html",
            "application/xhtml+xml",
            "text/plain",
            "application/pdf",
        )

        if content_type not in allowed_types:
            raise OfficialMenuFetchError(
                (
                    "The official source is not a supported "
                    "HTML, text, or PDF document."
                )
            )

        chunks: list[bytes] = []
        total_bytes = 0

        for chunk in response.iter_content(
            chunk_size=16_384,
        ):
            if not chunk:
                continue

            total_bytes += len(chunk)

            if total_bytes > MAX_RESPONSE_BYTES:
                raise OfficialMenuFetchError(
                    "The official source is too large to analyze."
                )

            chunks.append(chunk)

        return (
            b"".join(chunks),
            content_type,
            current_url,
        )

    raise OfficialMenuFetchError(
        "The official source redirected too many times."
    )


def _extract_pdf_lines(
    pdf_bytes: bytes,
) -> list[str]:
    from io import BytesIO

    try:
        reader = PdfReader(
            BytesIO(pdf_bytes),
            strict=False,
        )
    except (
        PdfReadError,
        ValueError,
        OSError,
    ) as error:
        raise OfficialMenuFetchError(
            "The official PDF could not be read."
        ) from error

    if reader.is_encrypted:
        try:
            unlocked = reader.decrypt("")
        except Exception as error:
            raise OfficialMenuFetchError(
                "The official PDF is encrypted."
            ) from error

        if not unlocked:
            raise OfficialMenuFetchError(
                "The official PDF is encrypted."
            )

    lines: list[str] = []
    total_characters = 0

    for page in reader.pages[
        :MAX_PDF_PAGES
    ]:
        try:
            page_text = (
                page.extract_text()
                or ""
            )
        except Exception:
            continue

        total_characters += len(
            page_text
        )

        if (
            total_characters
            > MAX_PDF_TEXT_CHARACTERS
        ):
            break

        for raw_line in page_text.splitlines():
            normalized = re.sub(
                r"\s+",
                " ",
                raw_line,
            ).strip()

            if normalized:
                lines.append(
                    normalized
                )

    if not lines:
        raise OfficialMenuFetchError(
            (
                "The official PDF did not contain extractable text. "
                "It may be a scanned document."
            )
        )

    return lines


def _extract_source_lines(
    *,
    source_bytes: bytes,
    content_type: str,
) -> list[str]:
    if content_type == "application/pdf":
        return _extract_pdf_lines(
            source_bytes
        )

    html = source_bytes.decode(
        "utf-8",
        errors="replace",
    )

    return _extract_visible_lines(
        html
    )


def _extract_visible_lines(
    html: str,
) -> list[str]:
    parser = VisibleTextParser()

    try:
        parser.feed(html)
        parser.close()
    except Exception:
        return []

    result: list[str] = []
    seen: set[str] = set()

    for line in parser.lines:
        normalized = re.sub(
            r"\s+",
            " ",
            line,
        ).strip()

        if (
            not normalized
            or normalized in seen
        ):
            continue

        seen.add(normalized)
        result.append(normalized)

    return result


def _contains_alias(
    text: str,
    aliases: Iterable[str],
) -> bool:
    normalized_text = text.lower()

    for alias in aliases:
        normalized_alias = alias.lower()

        if normalized_alias == "gf":
            if re.search(
                r"(^|[^a-z])gf([^a-z]|$)",
                normalized_text,
            ):
                return True

            continue

        if normalized_alias in normalized_text:
            return True

    return False


def _clean_menu_item(
    line: str,
) -> str:
    cleaned = re.sub(
        r"\s+",
        " ",
        line,
    ).strip(" •|-–—\t")

    if len(cleaned) > 180:
        cleaned = (
            cleaned[:177].rstrip()
            + "..."
        )

    return cleaned


def _analyze_lines(
    *,
    source_url: str,
    source_type: str,
    dietary_slug: str,
    lines: list[str],
) -> OfficialMenuFinding:
    aliases = DIETARY_ALIASES.get(
        dietary_slug,
        (
            dietary_slug.replace(
                "-",
                " ",
            ),
        ),
    )

    dedicated_phrases = (
        DEDICATED_PHRASES.get(
            dietary_slug,
            (),
        )
    )

    preparation_phrases = (
        PREPARATION_PHRASES.get(
            dietary_slug,
            (),
        )
    )

    matching_lines = [
        line
        for line in lines
        if _contains_alias(
            line,
            aliases,
        )
    ]

    whole_text = "\n".join(
        lines
    ).lower()

    dedicated_facility = any(
        phrase in whole_text
        for phrase in dedicated_phrases
    )

    preparation_hits = [
        phrase
        for phrase in preparation_phrases
        if phrase in whole_text
    ]

    menu_items: list[str] = []
    seen_items: set[str] = set()

    for line in matching_lines:
        cleaned = _clean_menu_item(
            line
        )

        if (
            len(cleaned) < 3
            or cleaned.lower()
            in seen_items
        ):
            continue

        seen_items.add(
            cleaned.lower()
        )
        menu_items.append(cleaned)

        if len(menu_items) >= 12:
            break

    claims: list[
        tuple[str, str, int]
    ] = []

    if dedicated_facility:
        claims.append(
            (
                "dedicated_facility",
                (
                    "The official restaurant page describes "
                    "the operation as dedicated to this "
                    "dietary need."
                ),
                95,
            )
        )

    if menu_items:
        claims.append(
            (
                "official_menu_items",
                (
                    f"{len(menu_items)} relevant official "
                    "menu label"
                    f"{'' if len(menu_items) == 1 else 's'} "
                    "were found."
                ),
                85,
            )
        )

    for phrase in preparation_hits:
        claims.append(
            (
                "preparation_practice",
                (
                    "The official page mentions: "
                    f"{phrase}."
                ),
                88,
            )
        )

    confidence_score = 0

    if dedicated_facility:
        confidence_score = 95
    elif preparation_hits and menu_items:
        confidence_score = 88
    elif menu_items:
        confidence_score = min(
            82,
            58 + len(menu_items) * 4,
        )

    return OfficialMenuFinding(
        source_url=source_url,
        source_type=source_type,
        confidence_score=(
            confidence_score
        ),
        dedicated_facility=(
            dedicated_facility
        ),
        menu_items=menu_items,
        claims=claims,
    )


def _get_source_url(
    restaurant: NearbyRestaurant,
) -> str:
    return (
        restaurant.menu_uri
        or restaurant.website_uri
    ).strip()


def _profile_is_fresh(
    profile: RestaurantDietaryProfile,
) -> bool:
    return bool(
        profile.expires_at
        and profile.expires_at
        > timezone.now()
    )


@transaction.atomic
def _save_finding(
    *,
    restaurant: NearbyRestaurant,
    dietary_slug: str,
    finding: OfficialMenuFinding,
) -> RestaurantDietaryProfile:
    now = timezone.now()
    expires_at = now + timedelta(
        days=CACHE_DAYS,
    )

    status = (
        DietaryEvidenceStatus.FOUND
        if finding.claims
        else DietaryEvidenceStatus.NOT_FOUND
    )

    profile, _ = (
        RestaurantDietaryProfile.objects
        .update_or_create(
            external_place_id=(
                restaurant.external_id
            ),
            dietary_slug=dietary_slug,
            defaults={
                "restaurant_name": (
                    restaurant.name
                ),
                "confidence_score": (
                    finding.confidence_score
                ),
                "dedicated_facility": (
                    finding.dedicated_facility
                ),
                "official_menu_found": bool(
                    finding.menu_items
                ),
                "official_source_url": (
                    finding.source_url
                ),
                "menu_items": (
                    finding.menu_items
                ),
                "status": status,
                "last_checked_at": now,
                "expires_at": expires_at,
                "last_error": "",
            },
        )
    )

    profile.evidence.all().delete()

    RestaurantDietaryEvidence.objects.bulk_create(
        [
            RestaurantDietaryEvidence(
                profile=profile,
                source_type=(
                    finding.source_type
                ),
                claim_type=claim_type,
                summary=summary,
                source_url=(
                    finding.source_url
                ),
                confidence=confidence,
                observed_at=now,
                expires_at=expires_at,
            )
            for (
                claim_type,
                summary,
                confidence,
            ) in finding.claims
        ]
    )

    return profile


def _save_failure(
    *,
    restaurant: NearbyRestaurant,
    dietary_slug: str,
    source_url: str,
    error: str,
) -> None:
    now = timezone.now()

    RestaurantDietaryProfile.objects.update_or_create(
        external_place_id=(
            restaurant.external_id
        ),
        dietary_slug=dietary_slug,
        defaults={
            "restaurant_name": (
                restaurant.name
            ),
            "confidence_score": 0,
            "dedicated_facility": False,
            "official_menu_found": False,
            "official_source_url": (
                source_url
            ),
            "menu_items": [],
            "status": (
                DietaryEvidenceStatus.ERROR
            ),
            "last_checked_at": now,
            "expires_at": (
                now
                + timedelta(days=1)
            ),
            "last_error": error[:500],
        },
    )


def analyze_official_menus(
    *,
    restaurants: list[NearbyRestaurant],
    dietary_slugs: list[str],
    limit: int = MAX_OFFICIAL_MENU_ANALYSES,
) -> None:
    """
    Analyze a limited number of official restaurant pages.

    This function intentionally stores only short findings and item labels.
    It does not store full page HTML or Google review text.
    """

    normalized_slugs = [
        _normalize_slug(slug)
        for slug in dietary_slugs
        if _normalize_slug(slug)
    ]

    if not normalized_slugs:
        return

    for restaurant in restaurants[
        :max(0, limit)
    ]:
        source_url = _get_source_url(
            restaurant
        )

        if not source_url:
            continue

        for dietary_slug in normalized_slugs:
            existing = (
                RestaurantDietaryProfile.objects
                .filter(
                    external_place_id=(
                        restaurant.external_id
                    ),
                    dietary_slug=(
                        dietary_slug
                    ),
                )
                .first()
            )

            if (
                existing is not None
                and _profile_is_fresh(
                    existing
                )
            ):
                continue

            try:
                (
                    source_bytes,
                    content_type,
                    final_url,
                ) = _fetch_official_source(
                    source_url
                )

                lines = _extract_source_lines(
                    source_bytes=source_bytes,
                    content_type=content_type,
                )

                finding = _analyze_lines(
                    source_url=final_url,
                    source_type=(
                        DietaryEvidenceSourceType.OFFICIAL_MENU
                        if content_type == "application/pdf"
                        else DietaryEvidenceSourceType.OFFICIAL_SITE
                    ),
                    dietary_slug=(
                        dietary_slug
                    ),
                    lines=lines,
                )

                _save_finding(
                    restaurant=restaurant,
                    dietary_slug=(
                        dietary_slug
                    ),
                    finding=finding,
                )
            except OfficialMenuFetchError as error:
                _save_failure(
                    restaurant=restaurant,
                    dietary_slug=(
                        dietary_slug
                    ),
                    source_url=(
                        source_url
                    ),
                    error=str(error),
                )
