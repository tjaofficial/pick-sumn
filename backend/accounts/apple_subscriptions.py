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
        SubscriptionStatus.ACTIVE
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

    try:
        latest_payload = (
            _get_latest_transaction_history(
                original_transaction_id=(
                    original_transaction_id
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
    except AppleSubscriptionError:
        raise

    return _apply_verified_subscription(
        user=user,
        verified=latest_verified,
    )
