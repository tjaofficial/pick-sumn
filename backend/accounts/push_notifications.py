import logging
from collections import defaultdict
from typing import Any, Iterable

import requests

from .models import PushDeviceToken


logger = logging.getLogger(__name__)

EXPO_PUSH_SEND_URL = (
    "https://exp.host/--/api/v2/push/send"
)

MAX_EXPO_MESSAGES_PER_REQUEST = 100


def _chunked(
    items: list[dict[str, Any]],
    size: int,
):
    for index in range(
        0,
        len(items),
        size,
    ):
        yield items[
            index:
            index + size
        ]


def send_push_messages(
    messages: Iterable[
        dict[str, Any]
    ],
) -> None:
    message_list = list(messages)

    if not message_list:
        return

    messages_by_user_id = defaultdict(
        list
    )

    for message in message_list:
        user_id = message.get(
            "user_id"
        )

        if not user_id:
            continue

        messages_by_user_id[
            user_id
        ].append(
            message
        )

    if not messages_by_user_id:
        return

    tokens = list(
        PushDeviceToken.objects
        .filter(
            user_id__in=(
                messages_by_user_id.keys()
            ),
            is_active=True,
        )
        .values(
            "expo_push_token",
            "user_id",
        )
    )

    if not tokens:
        return

    payloads: list[
        dict[str, Any]
    ] = []

    payload_tokens: list[str] = []

    for token_row in tokens:
        user_messages = (
            messages_by_user_id.get(
                token_row["user_id"],
                [],
            )
        )

        for message in user_messages:
            expo_push_token = (
                token_row[
                    "expo_push_token"
                ]
            )

            payloads.append(
                {
                    "to": expo_push_token,
                    "sound": "default",
                    "title": str(
                        message.get(
                            "title",
                            "",
                        )
                    ),
                    "body": str(
                        message.get(
                            "body",
                            "",
                        )
                    ),
                    "data": (
                        message.get(
                            "data"
                        )
                        or {}
                    ),
                }
            )

            payload_tokens.append(
                expo_push_token
            )

    if not payloads:
        return

    for payload_chunk in _chunked(
        payloads,
        MAX_EXPO_MESSAGES_PER_REQUEST,
    ):
        chunk_start = payloads.index(
            payload_chunk[0]
        )

        chunk_tokens = (
            payload_tokens[
                chunk_start:
                chunk_start
                + len(payload_chunk)
            ]
        )

        try:
            response = requests.post(
                EXPO_PUSH_SEND_URL,
                json=payload_chunk,
                headers={
                    "Accept": (
                        "application/json"
                    ),
                    "Accept-Encoding": (
                        "gzip, deflate"
                    ),
                    "Content-Type": (
                        "application/json"
                    ),
                },
                timeout=5,
            )
        except requests.RequestException as error:
            logger.warning(
                (
                    "Expo push request failed: %s"
                ),
                error,
            )
            continue

        if response.status_code >= 400:
            logger.warning(
                (
                    "Expo push request returned "
                    "HTTP %s: %s"
                ),
                response.status_code,
                response.text[:500],
            )
            continue

        try:
            payload = response.json()
        except ValueError:
            logger.warning(
                (
                    "Expo push request returned "
                    "invalid JSON."
                )
            )
            continue

        tickets = payload.get(
            "data",
            [],
        )

        if not isinstance(
            tickets,
            list,
        ):
            continue

        inactive_tokens = []

        for index, ticket in enumerate(
            tickets
        ):
            if not isinstance(
                ticket,
                dict,
            ):
                continue

            if ticket.get("status") != "error":
                continue

            details = (
                ticket.get("details")
                or {}
            )

            if (
                details.get("error")
                == "DeviceNotRegistered"
                and index
                < len(chunk_tokens)
            ):
                inactive_tokens.append(
                    chunk_tokens[index]
                )

        if inactive_tokens:
            PushDeviceToken.objects.filter(
                expo_push_token__in=(
                    inactive_tokens
                )
            ).update(
                is_active=False
            )


def send_push_notification(
    *,
    user,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    send_push_messages(
        [
            {
                "user_id": user.id,
                "title": title,
                "body": body,
                "data": data or {},
            }
        ]
    )
