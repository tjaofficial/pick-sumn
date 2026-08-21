from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_timezone

from appstoreserverlibrary.models.Environment import Environment
from appstoreserverlibrary.models.AutoRenewStatus import AutoRenewStatus
from appstoreserverlibrary.signed_data_verifier import VerificationException
from django.db import transaction as db_transaction

from .apple_subscriptions import (
    APPLE_PLUS_PRODUCT_IDS,
    AppleSubscriptionError,
    _verifier,
    get_apple_app_account_token,
)
from .models import (
    SubscriptionProvider,
    SubscriptionStatus,
    SubscriptionTier,
    User,
)


logger = logging.getLogger(__name__)


class AppleNotificationError(Exception):
    pass


def _enum_text(value, raw_value=None) -> str:
    if value is not None:
        enum_value = getattr(value, "value", None)

        if enum_value is not None:
            return str(enum_value)

        text = str(value)

        if "." in text:
            text = text.rsplit(".", 1)[-1]

        return text

    if raw_value is not None:
        return str(raw_value)

    return ""


def _environment_text(
    environment: Environment,
) -> str:
    return (
        "sandbox"
        if environment == Environment.SANDBOX
        else "production"
    )


def _verify_notification(
    signed_payload: str,
):
    last_error = None

    for environment in (
        Environment.PRODUCTION,
        Environment.SANDBOX,
    ):
        try:
            verifier = _verifier(
                environment
            )

            payload = (
                verifier
                .verify_and_decode_notification(
                    signed_payload
                )
            )

            return (
                environment,
                verifier,
                payload,
            )
        except VerificationException as exc:
            last_error = exc

    raise AppleNotificationError(
        "Apple notification signature verification failed."
    ) from last_error


def _verify_nested_data(
    *,
    verifier,
    data,
):
    transaction_info = None
    renewal_info = None

    signed_transaction = getattr(
        data,
        "signedTransactionInfo",
        None,
    )

    signed_renewal = getattr(
        data,
        "signedRenewalInfo",
        None,
    )

    if signed_transaction:
        try:
            transaction_info = (
                verifier
                .verify_and_decode_signed_transaction(
                    signed_transaction
                )
            )
        except VerificationException as exc:
            raise AppleNotificationError(
                "Apple transaction signature verification failed."
            ) from exc

    if signed_renewal:
        try:
            renewal_info = (
                verifier
                .verify_and_decode_renewal_info(
                    signed_renewal
                )
            )
        except VerificationException as exc:
            raise AppleNotificationError(
                "Apple renewal signature verification failed."
            ) from exc

    return transaction_info, renewal_info


def _ms_to_datetime(
    value,
):
    try:
        milliseconds = int(value or 0)
    except (TypeError, ValueError):
        return None

    if milliseconds <= 0:
        return None

    return datetime.fromtimestamp(
        milliseconds / 1000.0,
        tz=dt_timezone.utc,
    )


def _latest_expiration(
    *,
    transaction_info,
    renewal_info,
):
    transaction_expiration = (
        _ms_to_datetime(
            getattr(
                transaction_info,
                "expiresDate",
                None,
            )
        )
        if transaction_info is not None
        else None
    )

    grace_expiration = (
        _ms_to_datetime(
            getattr(
                renewal_info,
                "gracePeriodExpiresDate",
                None,
            )
        )
        if renewal_info is not None
        else None
    )

    candidates = [
        value
        for value in (
            transaction_expiration,
            grace_expiration,
        )
        if value is not None
    ]

    return max(candidates) if candidates else None


def _lookup_user(
    *,
    original_transaction_id: str,
):
    if not original_transaction_id:
        return None

    return (
        User.objects.filter(
            subscription_original_transaction_id=(
                original_transaction_id
            )
        )
        .first()
    )


def _validate_account_ownership(
    *,
    user,
    transaction_info,
    renewal_info,
):
    app_account_token = ""

    for source in (
        transaction_info,
        renewal_info,
    ):
        if source is None:
            continue

        candidate = str(
            getattr(
                source,
                "appAccountToken",
                "",
            )
            or ""
        ).strip()

        if candidate:
            app_account_token = candidate
            break

    if not app_account_token:
        return

    expected = get_apple_app_account_token(
        user
    )

    if (
        app_account_token.lower()
        != expected.lower()
    ):
        raise AppleNotificationError(
            (
                "Apple notification appAccountToken "
                "does not match the linked Pick Sum'N account."
            )
        )


def _set_active_state(
    *,
    user,
    expiration,
):
    now = datetime.now(
        tz=dt_timezone.utc
    )

    if (
        expiration is not None
        and expiration > now
    ):
        user.subscription_tier = (
            SubscriptionTier.PLUS
        )
        user.subscription_status = (
            SubscriptionStatus.ACTIVE
        )
    else:
        user.subscription_tier = (
            SubscriptionTier.FREE
        )
        user.subscription_status = (
            SubscriptionStatus.EXPIRED
        )


def _set_canceled_state(
    *,
    user,
    expiration,
):
    now = datetime.now(
        tz=dt_timezone.utc
    )

    if (
        expiration is not None
        and expiration > now
    ):
        # Cancellation means auto-renew is off, not immediate loss
        # of the already-paid subscription period.
        user.subscription_tier = (
            SubscriptionTier.PLUS
        )
        user.subscription_status = (
            SubscriptionStatus.CANCELED
        )
    else:
        user.subscription_tier = (
            SubscriptionTier.FREE
        )
        user.subscription_status = (
            SubscriptionStatus.EXPIRED
        )


def _set_grace_state(
    *,
    user,
    expiration,
):
    now = datetime.now(
        tz=dt_timezone.utc
    )

    if (
        expiration is not None
        and expiration > now
    ):
        user.subscription_tier = (
            SubscriptionTier.PLUS
        )
        user.subscription_status = (
            SubscriptionStatus.GRACE_PERIOD
        )
    else:
        user.subscription_tier = (
            SubscriptionTier.FREE
        )
        user.subscription_status = (
            SubscriptionStatus.EXPIRED
        )


def _set_expired_state(
    *,
    user,
):
    user.subscription_tier = (
        SubscriptionTier.FREE
    )
    user.subscription_status = (
        SubscriptionStatus.EXPIRED
    )



def _auto_renew_is_off(
    renewal_info,
) -> bool:
    if renewal_info is None:
        return False

    value = getattr(
        renewal_info,
        "autoRenewStatus",
        None,
    )

    raw_value = getattr(
        renewal_info,
        "rawAutoRenewStatus",
        None,
    )

    candidate = (
        getattr(
            value,
            "value",
            value,
        )
        if value is not None
        else raw_value
    )

    try:
        return int(candidate) == int(
            AutoRenewStatus.OFF
        )
    except (TypeError, ValueError):
        return False


@db_transaction.atomic
def process_apple_server_notification(
    signed_payload: str,
) -> dict:
    if not signed_payload:
        raise AppleNotificationError(
            "signedPayload is required."
        )

    (
        environment,
        verifier,
        payload,
    ) = _verify_notification(
        signed_payload
    )

    notification_type = _enum_text(
        getattr(
            payload,
            "notificationType",
            None,
        ),
        getattr(
            payload,
            "rawNotificationType",
            None,
        ),
    ).upper()

    subtype = _enum_text(
        getattr(
            payload,
            "subtype",
            None,
        ),
        getattr(
            payload,
            "rawSubtype",
            None,
        ),
    ).upper()

    notification_uuid = str(
        getattr(
            payload,
            "notificationUUID",
            "",
        )
        or ""
    )

    signed_date = int(
        getattr(
            payload,
            "signedDate",
            0,
        )
        or 0
    )

    if notification_type == "TEST":
        logger.info(
            "Verified Apple TEST notification %s (%s).",
            notification_uuid,
            _environment_text(
                environment
            ),
        )

        return {
            "processed": True,
            "notification_type": (
                notification_type
            ),
            "linked_user": False,
        }

    data = getattr(
        payload,
        "data",
        None,
    )

    if data is None:
        logger.info(
            (
                "Verified Apple notification %s "
                "without subscription data; no entitlement change."
            ),
            notification_type,
        )

        return {
            "processed": True,
            "notification_type": (
                notification_type
            ),
            "linked_user": False,
        }

    (
        transaction_info,
        renewal_info,
    ) = _verify_nested_data(
        verifier=verifier,
        data=data,
    )

    if (
        transaction_info is None
        and renewal_info is None
    ):
        return {
            "processed": True,
            "notification_type": (
                notification_type
            ),
            "linked_user": False,
        }

    original_transaction_id = ""

    for source in (
        transaction_info,
        renewal_info,
    ):
        if source is None:
            continue

        candidate = str(
            getattr(
                source,
                "originalTransactionId",
                "",
            )
            or ""
        ).strip()

        if candidate:
            original_transaction_id = (
                candidate
            )
            break

    user = _lookup_user(
        original_transaction_id=(
            original_transaction_id
        )
    )

    # SUBSCRIBED can arrive before the app's authenticated purchase
    # verification stores originalTransactionId on the user. The
    # purchase verification path will establish the entitlement, so
    # an unlinked initial notification is safe to acknowledge.
    if user is None:
        logger.warning(
            (
                "Verified Apple notification %s for unlinked "
                "originalTransactionId=%s."
            ),
            notification_type,
            original_transaction_id,
        )

        return {
            "processed": True,
            "notification_type": (
                notification_type
            ),
            "linked_user": False,
        }

    user = (
        User.objects.select_for_update()
        .get(pk=user.pk)
    )

    if (
        signed_date
        and signed_date
        <= int(
            user
            .subscription_last_notification_signed_at
            or 0
        )
    ):
        logger.info(
            (
                "Ignoring stale/duplicate Apple notification %s "
                "for user %s."
            ),
            notification_uuid,
            user.pk,
        )

        return {
            "processed": True,
            "notification_type": (
                notification_type
            ),
            "linked_user": True,
            "stale": True,
        }

    _validate_account_ownership(
        user=user,
        transaction_info=transaction_info,
        renewal_info=renewal_info,
    )

    product_id = ""

    for source in (
        transaction_info,
        renewal_info,
    ):
        if source is None:
            continue

        candidate = str(
            getattr(
                source,
                "productId",
                "",
            )
            or ""
        ).strip()

        if candidate:
            product_id = candidate
            break

    if (
        product_id
        and product_id
        not in APPLE_PLUS_PRODUCT_IDS
    ):
        logger.info(
            (
                "Ignoring verified non-Plus Apple product %s "
                "for user %s."
            ),
            product_id,
            user.pk,
        )

        return {
            "processed": True,
            "notification_type": (
                notification_type
            ),
            "linked_user": True,
        }

    expiration = _latest_expiration(
        transaction_info=transaction_info,
        renewal_info=renewal_info,
    )

    if product_id:
        user.subscription_product_id = (
            product_id
        )

    if expiration is not None:
        user.subscription_expires_at = (
            expiration
        )

    transaction_id = (
        str(
            getattr(
                transaction_info,
                "transactionId",
                "",
            )
            or ""
        ).strip()
        if transaction_info is not None
        else ""
    )

    if transaction_id:
        user.subscription_transaction_id = (
            transaction_id
        )

    user.subscription_provider = (
        SubscriptionProvider.APPLE
    )
    user.subscription_environment = (
        _environment_text(
            environment
        )
    )

    if signed_date:
        user.subscription_last_notification_signed_at = (
            signed_date
        )

    active_events = {
        "SUBSCRIBED",
        "DID_RENEW",
        "OFFER_REDEEMED",
        "RENEWAL_EXTENDED",
        "REFUND_REVERSED",
    }

    expired_events = {
        "EXPIRED",
        "GRACE_PERIOD_EXPIRED",
        "REFUND",
        "REVOKE",
    }

    if notification_type in active_events:
        if _auto_renew_is_off(
            renewal_info
        ):
            _set_canceled_state(
                user=user,
                expiration=expiration,
            )
        else:
            _set_active_state(
                user=user,
                expiration=expiration,
            )

    elif (
        notification_type
        == "DID_CHANGE_RENEWAL_STATUS"
    ):
        if subtype == "AUTO_RENEW_DISABLED":
            _set_canceled_state(
                user=user,
                expiration=expiration,
            )
        elif subtype == "AUTO_RENEW_ENABLED":
            _set_active_state(
                user=user,
                expiration=expiration,
            )

    elif notification_type == "DID_FAIL_TO_RENEW":
        if subtype == "GRACE_PERIOD":
            _set_grace_state(
                user=user,
                expiration=expiration,
            )
        else:
            _set_expired_state(
                user=user
            )

    elif notification_type in expired_events:
        _set_expired_state(
            user=user
        )

    # DID_CHANGE_RENEWAL_PREF and informational notification types
    # intentionally preserve the current entitlement state.

    user.save(
        update_fields=(
            "subscription_tier",
            "subscription_status",
            "subscription_provider",
            "subscription_product_id",
            "subscription_expires_at",
            "subscription_transaction_id",
            "subscription_environment",
            "subscription_last_notification_signed_at",
        )
    )

    logger.info(
        (
            "Processed Apple notification %s/%s for user %s; "
            "status=%s, tier=%s."
        ),
        notification_type,
        subtype or "-",
        user.pk,
        user.subscription_status,
        user.subscription_tier,
    )

    return {
        "processed": True,
        "notification_type": (
            notification_type
        ),
        "subtype": subtype,
        "linked_user": True,
    }
