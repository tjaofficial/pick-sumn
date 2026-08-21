from __future__ import annotations

import base64
import os
import uuid
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime, timezone as dt_timezone
from typing import Any

from appstoreserverlibrary.api_client import (
    APIException,
    AppStoreServerAPIClient,
    GetTransactionHistoryVersion,
)
from appstoreserverlibrary.models.Environment import (
    Environment,
)
from appstoreserverlibrary.models.Status import (
    Status,
)
from appstoreserverlibrary.models.AutoRenewStatus import (
    AutoRenewStatus,
)
from appstoreserverlibrary.signed_data_verifier import (
    SignedDataVerifier,
    VerificationException,
)
from appstoreserverlibrary.models.TransactionHistoryRequest import (
    Order,
    ProductType,
    TransactionHistoryRequest,
)

from .models import (
    SubscriptionProvider,
    SubscriptionStatus,
    SubscriptionTier,
)


APPLE_BUNDLE_ID = "com.picksumn.app"
APPLE_APP_ID = 6794431236

_APPLE_ROOT_CERTIFICATE_NAMES = (
    "AppleIncRootCertificate.cer",
    "AppleRootCA-G2.cer",
    "AppleRootCA-G3.cer",
)

APPLE_PLUS_MONTHLY_PRODUCT_ID = (
    "com.picksumn.app.plus.monthly"
)

APPLE_PLUS_ANNUAL_PRODUCT_ID = (
    "com.picksumn.app.plus.annual"
)

APPLE_PLUS_PRODUCT_IDS = {
    APPLE_PLUS_MONTHLY_PRODUCT_ID,
    APPLE_PLUS_ANNUAL_PRODUCT_ID,
}

_APP_ACCOUNT_NAMESPACE = uuid.UUID(
    "4e5664ca-77e9-4f19-a7d2-4db3bd83d432"
)


class AppleSubscriptionError(Exception):
    pass


@dataclass(frozen=True)
class VerifiedAppleSubscription:
    transaction_id: str
    original_transaction_id: str
    product_id: str
    environment: str
    expires_at: datetime
    app_account_token: str
    status: str = SubscriptionStatus.ACTIVE


def get_apple_app_account_token(user) -> str:
    """
    Stable UUID used by StoreKit's appAccountToken.

    This ties a store purchase to the authenticated Pick Sum'N account
    without exposing email or other personal information.
    """

    return str(
        uuid.uuid5(
            _APP_ACCOUNT_NAMESPACE,
            f"picksumn-user:{user.pk}",
        )
    )


def _get_private_key() -> bytes:
    raw = os.environ.get(
        "APPLE_IAP_PRIVATE_KEY",
        "",
    ).strip()

    if raw:
        return raw.replace("\\n", "\n").encode("utf-8")

    encoded = os.environ.get(
        "APPLE_IAP_PRIVATE_KEY_BASE64",
        "",
    ).strip()

    if encoded:
        try:
            return base64.b64decode(encoded)
        except Exception as exc:
            raise AppleSubscriptionError(
                "APPLE_IAP_PRIVATE_KEY_BASE64 is invalid."
            ) from exc

    raise AppleSubscriptionError(
        "Apple IAP private key is not configured."
    )


def _get_apple_credentials():
    key_id = os.environ.get(
        "APPLE_IAP_KEY_ID",
        "",
    ).strip()

    issuer_id = os.environ.get(
        "APPLE_IAP_ISSUER_ID",
        "",
    ).strip()

    bundle_id = os.environ.get(
        "APPLE_IAP_BUNDLE_ID",
        APPLE_BUNDLE_ID,
    ).strip() or APPLE_BUNDLE_ID

    if not key_id or not issuer_id:
        raise AppleSubscriptionError(
            "Apple IAP key ID or issuer ID is not configured."
        )

    return (
        _get_private_key(),
        key_id,
        issuer_id,
        bundle_id,
    )


def _client(
    environment: Environment,
) -> AppStoreServerAPIClient:
    (
        private_key,
        key_id,
        issuer_id,
        bundle_id,
    ) = _get_apple_credentials()

    return AppStoreServerAPIClient(
        private_key,
        key_id,
        issuer_id,
        bundle_id,
        environment,
    )



def _get_apple_app_id() -> int:
    raw = os.environ.get(
        "APPLE_IAP_APP_APPLE_ID",
        str(APPLE_APP_ID),
    ).strip()

    try:
        return int(raw)
    except (TypeError, ValueError) as exc:
        raise AppleSubscriptionError(
            "APPLE_IAP_APP_APPLE_ID must be a numeric App Store app ID."
        ) from exc


def _load_apple_root_certificates() -> list[bytes]:
    cert_dir = (
        Path(__file__).resolve().parent
        / "apple_root_certs"
    )

    certificates = []
    missing = []

    for name in _APPLE_ROOT_CERTIFICATE_NAMES:
        path = cert_dir / name

        if not path.exists():
            missing.append(name)
            continue

        data = path.read_bytes()

        if not data:
            raise AppleSubscriptionError(
                f"Apple root certificate {name} is empty."
            )

        certificates.append(data)

    if missing:
        raise AppleSubscriptionError(
            (
                "Apple root certificates are missing: "
                + ", ".join(missing)
                + ". Run backend/scripts/"
                "download_apple_root_certs.py and deploy "
                "the generated certificate files."
            )
        )

    return certificates


def _verifier(
    environment: Environment,
) -> SignedDataVerifier:
    configured_bundle_id = (
        os.environ.get(
            "APPLE_IAP_BUNDLE_ID",
            APPLE_BUNDLE_ID,
        ).strip()
        or APPLE_BUNDLE_ID
    )

    app_apple_id = (
        _get_apple_app_id()
        if environment == Environment.PRODUCTION
        else None
    )

    return SignedDataVerifier(
        _load_apple_root_certificates(),
        True,
        environment,
        configured_bundle_id,
        app_apple_id,
    )


def _transaction_object_to_payload(
    transaction,
) -> dict[str, Any]:
    fields = (
        "transactionId",
        "originalTransactionId",
        "bundleId",
        "productId",
        "appAccountToken",
        "expiresDate",
        "revocationDate",
    )

    return {
        field: getattr(
            transaction,
            field,
            None,
        )
        for field in fields
    }


def _verify_apple_server_transaction_jws(
    signed_transaction: str,
    environment: Environment,
) -> dict[str, Any]:
    """
    Cryptographically verify a transaction JWS returned by Apple.

    Verification checks Apple's certificate chain, bundle identifier,
    environment, and (in production) App Store app ID using Apple's
    official App Store Server Library.
    """

    try:
        transaction = (
            _verifier(
                environment
            )
            .verify_and_decode_signed_transaction(
                signed_transaction
            )
        )
    except VerificationException as exc:
        raise AppleSubscriptionError(
            "Apple returned a transaction that could not be verified."
        ) from exc

    return _transaction_object_to_payload(
        transaction
    )


def _get_transaction_from_apple(
    transaction_id: str,
):
    last_error = None

    for environment in (
        Environment.PRODUCTION,
        Environment.SANDBOX,
    ):
        try:
            response = (
                _client(
                    environment
                )
                .get_transaction_info(
                    transaction_id
                )
            )

            signed = getattr(
                response,
                "signedTransactionInfo",
                None,
            )

            if not signed:
                raise AppleSubscriptionError(
                    "Apple returned no transaction information."
                )

            return (
                environment,
                _verify_apple_server_transaction_jws(
                    signed,
                    environment,
                ),
            )
        except APIException as exc:
            last_error = exc

    raise AppleSubscriptionError(
        "Apple could not find this transaction."
    ) from last_error


def _get_latest_transaction_history(
    *,
    original_transaction_id: str,
    environment: Environment,
) -> dict[str, Any]:
    request = TransactionHistoryRequest(
        sort=Order.DESCENDING,
        revoked=False,
        productTypes=[
            ProductType.AUTO_RENEWABLE,
        ],
    )

    revision = None
    best_payload = None
    best_expiration = -1

    while True:
        try:
            response = (
                _client(
                    environment
                )
                .get_transaction_history(
                    original_transaction_id,
                    revision,
                    request,
                    GetTransactionHistoryVersion.V2,
                )
            )
        except APIException as exc:
            raise AppleSubscriptionError(
                "Apple subscription history could not be loaded."
            ) from exc

        for signed in (
            getattr(
                response,
                "signedTransactions",
                None,
            )
            or []
        ):
            payload = (
                _verify_apple_server_transaction_jws(
                    signed,
                    environment,
                )
            )

            if (
                str(
                    payload.get(
                        "productId",
                        "",
                    )
                )
                not in APPLE_PLUS_PRODUCT_IDS
            ):
                continue

            expires_date = int(
                payload.get(
                    "expiresDate",
                    0,
                )
                or 0
            )

            if expires_date > best_expiration:
                best_expiration = (
                    expires_date
                )
                best_payload = payload

        if not bool(
            getattr(
                response,
                "hasMore",
                False,
            )
        ):
            break

        revision = getattr(
            response,
            "revision",
            None,
        )

        if not revision:
            break

    if best_payload is None:
        raise AppleSubscriptionError(
            "No Pick Sum'N Plus subscription was found."
        )

    return best_payload


def _validate_payload(
    *,
    user,
    payload: dict[str, Any],
    environment: Environment,
    expected_product_id: str | None = None,
) -> VerifiedAppleSubscription:
    product_id = str(
        payload.get(
            "productId",
            "",
        )
    ).strip()

    if product_id not in APPLE_PLUS_PRODUCT_IDS:
        raise AppleSubscriptionError(
            "This App Store product is not Pick Sum'N Plus."
        )

    if (
        expected_product_id
        and product_id
        != expected_product_id
    ):
        raise AppleSubscriptionError(
            "The App Store product does not match the purchase."
        )

    bundle_id = str(
        payload.get(
            "bundleId",
            "",
        )
    ).strip()

    configured_bundle_id = (
        os.environ.get(
            "APPLE_IAP_BUNDLE_ID",
            APPLE_BUNDLE_ID,
        ).strip()
        or APPLE_BUNDLE_ID
    )

    if bundle_id != configured_bundle_id:
        raise AppleSubscriptionError(
            "This transaction belongs to a different app."
        )

    expected_token = (
        get_apple_app_account_token(
            user
        )
    )

    app_account_token = str(
        payload.get(
            "appAccountToken",
            "",
        )
        or ""
    ).strip()

    if (
        not app_account_token
        or app_account_token.lower()
        != expected_token.lower()
    ):
        raise AppleSubscriptionError(
            (
                "This subscription belongs to a "
                "different Pick Sum'N account."
            )
        )

    if payload.get(
        "revocationDate"
    ):
        raise AppleSubscriptionError(
            "This App Store subscription was revoked."
        )

    transaction_id = str(
        payload.get(
            "transactionId",
            "",
        )
    ).strip()

    original_transaction_id = str(
        payload.get(
            "originalTransactionId",
            "",
        )
    ).strip()

    if (
        not transaction_id
        or not original_transaction_id
    ):
        raise AppleSubscriptionError(
            "Apple returned an incomplete transaction."
        )

    expires_ms = int(
        payload.get(
            "expiresDate",
            0,
        )
        or 0
    )

    if expires_ms <= 0:
        raise AppleSubscriptionError(
            "Apple did not return a subscription expiration date."
        )

    expires_at = datetime.fromtimestamp(
        expires_ms / 1000.0,
        tz=dt_timezone.utc,
    )

    if expires_at <= datetime.now(
        tz=dt_timezone.utc,
    ):
        raise AppleSubscriptionError(
            "This Pick Sum'N Plus subscription has expired."
        )

    environment_text = (
        "sandbox"
        if environment
        == Environment.SANDBOX
        else "production"
    )

    return VerifiedAppleSubscription(
        transaction_id=transaction_id,
        original_transaction_id=(
            original_transaction_id
        ),
        product_id=product_id,
        environment=environment_text,
        expires_at=expires_at,
        app_account_token=(
            app_account_token
        ),
    )


def _protect_subscription_ownership(
    *,
    user,
    original_transaction_id: str,
):
    UserModel = type(user)

    used_by_other_user = (
        UserModel.objects.filter(
            subscription_original_transaction_id=(
                original_transaction_id
            ),
        )
        .exclude(
            pk=user.pk,
        )
        .exists()
    )

    if used_by_other_user:
        raise AppleSubscriptionError(
            (
                "This Apple subscription is already linked "
                "to another Pick Sum'N account."
            )
        )


def _apply_verified_subscription(
    *,
    user,
    verified: VerifiedAppleSubscription,
):
    _protect_subscription_ownership(
        user=user,
        original_transaction_id=(
            verified
            .original_transaction_id
        ),
    )

    user.subscription_tier = (
        SubscriptionTier.PLUS
    )

    user.subscription_status = (
        verified.status
    )

    user.subscription_provider = (
        SubscriptionProvider.APPLE
    )

    user.subscription_product_id = (
        verified.product_id
    )

    user.subscription_expires_at = (
        verified.expires_at
    )

    user.subscription_transaction_id = (
        verified.transaction_id
    )

    user.subscription_original_transaction_id = (
        verified
        .original_transaction_id
    )

    user.subscription_environment = (
        verified.environment
    )

    user.save(
        update_fields=(
            "subscription_tier",
            "subscription_status",
            "subscription_provider",
            "subscription_product_id",
            "subscription_expires_at",
            "subscription_transaction_id",
            "subscription_original_transaction_id",
            "subscription_environment",
        )
    )

    return user



def _environment_text(
    environment: Environment,
) -> str:
    return (
        "sandbox"
        if environment == Environment.SANDBOX
        else "production"
    )


def _ms_to_datetime(
    value,
) -> datetime | None:
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


def _enum_int(
    value,
    raw_value=None,
) -> int | None:
    candidate = value

    if candidate is None:
        candidate = raw_value

    if candidate is None:
        return None

    enum_value = getattr(
        candidate,
        "value",
        candidate,
    )

    try:
        return int(enum_value)
    except (TypeError, ValueError):
        return None


def _decode_status_item(
    *,
    item,
    environment: Environment,
) -> dict[str, Any] | None:
    signed_transaction = getattr(
        item,
        "signedTransactionInfo",
        None,
    )

    if not signed_transaction:
        return None

    verifier = _verifier(
        environment
    )

    try:
        transaction = (
            verifier
            .verify_and_decode_signed_transaction(
                signed_transaction
            )
        )
    except VerificationException as exc:
        raise AppleSubscriptionError(
            (
                "Apple returned subscription status "
                "transaction data that could not be verified."
            )
        ) from exc

    product_id = str(
        getattr(
            transaction,
            "productId",
            "",
        )
        or ""
    ).strip()

    if product_id not in APPLE_PLUS_PRODUCT_IDS:
        return None

    renewal = None
    signed_renewal = getattr(
        item,
        "signedRenewalInfo",
        None,
    )

    if signed_renewal:
        try:
            renewal = (
                verifier
                .verify_and_decode_renewal_info(
                    signed_renewal
                )
            )
        except VerificationException as exc:
            raise AppleSubscriptionError(
                (
                    "Apple returned subscription renewal "
                    "data that could not be verified."
                )
            ) from exc

    return {
        "item": item,
        "transaction": transaction,
        "renewal": renewal,
        "status": _enum_int(
            getattr(
                item,
                "status",
                None,
            ),
            getattr(
                item,
                "rawStatus",
                None,
            ),
        ),
        "expires_at": _ms_to_datetime(
            getattr(
                transaction,
                "expiresDate",
                None,
            )
        ),
        "grace_expires_at": _ms_to_datetime(
            getattr(
                renewal,
                "gracePeriodExpiresDate",
                None,
            )
            if renewal is not None
            else None
        ),
    }


def _get_current_subscription_status(
    *,
    original_transaction_id: str,
    environment: Environment,
) -> dict[str, Any]:
    """
    Ask Apple's subscription-status endpoint for the customer's current state.

    Unlike transaction history, this endpoint distinguishes Active, Expired,
    Billing Retry, Billing Grace Period, and Revoked, and includes signed
    renewal information such as autoRenewStatus.
    """

    try:
        response = (
            _client(
                environment
            )
            .get_all_subscription_statuses(
                original_transaction_id
            )
        )
    except APIException as exc:
        raise AppleSubscriptionError(
            "Apple subscription status could not be loaded."
        ) from exc

    candidates: list[dict[str, Any]] = []

    for group in (
        getattr(
            response,
            "data",
            None,
        )
        or []
    ):
        for item in (
            getattr(
                group,
                "lastTransactions",
                None,
            )
            or []
        ):
            decoded = _decode_status_item(
                item=item,
                environment=environment,
            )

            if decoded is not None:
                candidates.append(
                    decoded
                )

    if not candidates:
        raise AppleSubscriptionError(
            "No Pick Sum'N Plus subscription status was found."
        )

    def candidate_key(
        candidate: dict[str, Any],
    ):
        # Prefer a state that can currently carry entitlement, then the
        # furthest valid paid/grace expiration.
        status_value = candidate.get(
            "status"
        )

        status_priority = {
            int(Status.ACTIVE): 5,
            int(Status.BILLING_GRACE_PERIOD): 4,
            int(Status.BILLING_RETRY): 3,
            int(Status.EXPIRED): 2,
            int(Status.REVOKED): 1,
        }.get(
            int(status_value or 0),
            0,
        )

        expiration = max(
            [
                value
                for value in (
                    candidate.get(
                        "expires_at"
                    ),
                    candidate.get(
                        "grace_expires_at"
                    ),
                )
                if value is not None
            ],
            default=datetime.min.replace(
                tzinfo=dt_timezone.utc
            ),
        )

        return (
            status_priority,
            expiration,
        )

    return max(
        candidates,
        key=candidate_key,
    )


def _verified_from_current_status(
    *,
    user,
    current: dict[str, Any],
    environment: Environment,
) -> VerifiedAppleSubscription:
    transaction = current[
        "transaction"
    ]

    renewal = current.get(
        "renewal"
    )

    payload = (
        _transaction_object_to_payload(
            transaction
        )
    )

    product_id = str(
        payload.get(
            "productId",
            "",
        )
        or ""
    ).strip()

    if product_id not in APPLE_PLUS_PRODUCT_IDS:
        raise AppleSubscriptionError(
            "This App Store product is not Pick Sum'N Plus."
        )

    bundle_id = str(
        payload.get(
            "bundleId",
            "",
        )
        or ""
    ).strip()

    configured_bundle_id = (
        os.environ.get(
            "APPLE_IAP_BUNDLE_ID",
            APPLE_BUNDLE_ID,
        ).strip()
        or APPLE_BUNDLE_ID
    )

    if bundle_id != configured_bundle_id:
        raise AppleSubscriptionError(
            "This transaction belongs to a different app."
        )

    transaction_id = str(
        payload.get(
            "transactionId",
            "",
        )
        or ""
    ).strip()

    original_transaction_id = str(
        payload.get(
            "originalTransactionId",
            "",
        )
        or ""
    ).strip()

    if (
        not transaction_id
        or not original_transaction_id
    ):
        raise AppleSubscriptionError(
            "Apple returned incomplete subscription status."
        )

    expected_token = (
        get_apple_app_account_token(
            user
        )
    )

    account_token = str(
        payload.get(
            "appAccountToken",
            "",
        )
        or getattr(
            renewal,
            "appAccountToken",
            "",
        )
        or ""
    ).strip()

    if (
        not account_token
        or account_token.lower()
        != expected_token.lower()
    ):
        raise AppleSubscriptionError(
            (
                "This subscription belongs to a "
                "different Pick Sum'N account."
            )
        )

    _protect_subscription_ownership(
        user=user,
        original_transaction_id=(
            original_transaction_id
        ),
    )

    now = datetime.now(
        tz=dt_timezone.utc
    )

    transaction_expiration = (
        current.get(
            "expires_at"
        )
    )

    grace_expiration = (
        current.get(
            "grace_expires_at"
        )
    )

    status_value = int(
        current.get(
            "status"
        )
        or 0
    )

    auto_renew_value = _enum_int(
        getattr(
            renewal,
            "autoRenewStatus",
            None,
        )
        if renewal is not None
        else None,
        getattr(
            renewal,
            "rawAutoRenewStatus",
            None,
        )
        if renewal is not None
        else None,
    )

    if status_value == int(
        Status.ACTIVE
    ):
        if (
            transaction_expiration is None
            or transaction_expiration <= now
        ):
            lifecycle_status = (
                SubscriptionStatus.EXPIRED
            )
        elif (
            auto_renew_value
            == int(
                AutoRenewStatus.OFF
            )
        ):
            lifecycle_status = (
                SubscriptionStatus.CANCELED
            )
        else:
            lifecycle_status = (
                SubscriptionStatus.ACTIVE
            )

        effective_expiration = (
            transaction_expiration
        )

    elif status_value == int(
        Status.BILLING_GRACE_PERIOD
    ):
        effective_expiration = max(
            [
                value
                for value in (
                    transaction_expiration,
                    grace_expiration,
                )
                if value is not None
            ],
            default=None,
        )

        lifecycle_status = (
            SubscriptionStatus.GRACE_PERIOD
            if (
                effective_expiration is not None
                and effective_expiration > now
            )
            else SubscriptionStatus.EXPIRED
        )

    else:
        # Billing Retry without grace, Expired, and Revoked do not carry
        # paid entitlement. Apple may continue retrying billing, but access
        # is only retained when Apple explicitly reports a grace period.
        lifecycle_status = (
            SubscriptionStatus.EXPIRED
        )
        effective_expiration = (
            transaction_expiration
            or grace_expiration
            or now
        )

    return VerifiedAppleSubscription(
        transaction_id=transaction_id,
        original_transaction_id=(
            original_transaction_id
        ),
        product_id=product_id,
        environment=_environment_text(
            environment
        ),
        expires_at=(
            effective_expiration
            or now
        ),
        app_account_token=(
            account_token
        ),
        status=lifecycle_status,
    )


def _apply_current_subscription_state(
    *,
    user,
    verified: VerifiedAppleSubscription,
):
    _protect_subscription_ownership(
        user=user,
        original_transaction_id=(
            verified
            .original_transaction_id
        ),
    )

    has_paid_access = (
        verified.status
        in (
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELED,
            SubscriptionStatus.GRACE_PERIOD,
        )
        and verified.expires_at
        > datetime.now(
            tz=dt_timezone.utc
        )
    )

    user.subscription_tier = (
        SubscriptionTier.PLUS
        if has_paid_access
        else SubscriptionTier.FREE
    )

    user.subscription_status = (
        verified.status
        if has_paid_access
        else SubscriptionStatus.EXPIRED
    )

    user.subscription_provider = (
        SubscriptionProvider.APPLE
    )

    user.subscription_product_id = (
        verified.product_id
    )

    user.subscription_expires_at = (
        verified.expires_at
    )

    user.subscription_transaction_id = (
        verified.transaction_id
    )

    user.subscription_original_transaction_id = (
        verified
        .original_transaction_id
    )

    user.subscription_environment = (
        verified.environment
    )

    user.save(
        update_fields=(
            "subscription_tier",
            "subscription_status",
            "subscription_provider",
            "subscription_product_id",
            "subscription_expires_at",
            "subscription_transaction_id",
            "subscription_original_transaction_id",
            "subscription_environment",
        )
    )

    return user


def verify_new_apple_purchase(
    *,
    user,
    transaction_id: str,
    expected_product_id: str,
):
    if (
        expected_product_id
        not in APPLE_PLUS_PRODUCT_IDS
    ):
        raise AppleSubscriptionError(
            "Unknown Pick Sum'N Plus product."
        )

    (
        environment,
        initial_payload,
    ) = _get_transaction_from_apple(
        transaction_id
    )

    initial_verified = (
        _validate_payload(
            user=user,
            payload=initial_payload,
            environment=environment,
            expected_product_id=(
                expected_product_id
            ),
        )
    )

    latest_payload = (
        _get_latest_transaction_history(
            original_transaction_id=(
                initial_verified
                .original_transaction_id
            ),
            environment=environment,
        )
    )

    latest_verified = (
        _validate_payload(
            user=user,
            payload=latest_payload,
            environment=environment,
        )
    )

    return _apply_verified_subscription(
        user=user,
        verified=latest_verified,
    )


def sync_existing_apple_subscription(
    *,
    user,
):
    original_transaction_id = str(
        getattr(
            user,
            "subscription_original_transaction_id",
            "",
        )
        or ""
    ).strip()

    environment_name = str(
        getattr(
            user,
            "subscription_environment",
            "",
        )
        or ""
    ).strip().lower()

    if not original_transaction_id:
        raise AppleSubscriptionError(
            "No Apple subscription is linked to this account."
        )

    environment = (
        Environment.SANDBOX
        if environment_name
        == "sandbox"
        else Environment.PRODUCTION
    )

    current = (
        _get_current_subscription_status(
            original_transaction_id=(
                original_transaction_id
            ),
            environment=environment,
        )
    )

    verified = (
        _verified_from_current_status(
            user=user,
            current=current,
            environment=environment,
        )
    )

    return _apply_current_subscription_state(
        user=user,
        verified=verified,
    )
