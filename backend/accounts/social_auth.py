import hashlib
import hmac

import jwt
import requests
from django.conf import settings
from django.db import transaction
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import SocialIdentity, User


class SocialAuthError(Exception):
    pass


_apple_jwk_client = jwt.PyJWKClient(
    "https://appleid.apple.com/auth/keys",
    cache_keys=True,
)

_facebook_jwk_client = jwt.PyJWKClient(
    "https://www.facebook.com/.well-known/oauth/openid/jwks/",
    cache_keys=True,
)


def _is_true(value):
    if value is True:
        return True

    if isinstance(value, str):
        return value.strip().lower() == "true"

    return False


def verify_google_identity_token(identity_token):
    allowed_audiences = tuple(
        value.strip()
        for value in settings.GOOGLE_OAUTH_CLIENT_IDS
        if value.strip()
    )

    if not allowed_audiences:
        raise SocialAuthError(
            "Google sign-in is not configured on the server."
        )

    try:
        claims = google_id_token.verify_oauth2_token(
            identity_token,
            google_requests.Request(),
            audience=None,
        )
    except Exception as exc:
        raise SocialAuthError(
            "Google could not verify this sign-in."
        ) from exc

    if claims.get("aud") not in allowed_audiences:
        raise SocialAuthError(
            "This Google sign-in was issued for a different app."
        )

    if claims.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise SocialAuthError(
            "Google returned an invalid issuer."
        )

    provider_user_id = str(
        claims.get("sub") or ""
    ).strip()
    email = str(
        claims.get("email") or ""
    ).strip().lower()

    if not provider_user_id:
        raise SocialAuthError(
            "Google did not return an account identifier."
        )

    if not email or not _is_true(
        claims.get("email_verified")
    ):
        raise SocialAuthError(
            "Google did not return a verified email address."
        )

    return {
        "provider_user_id": provider_user_id,
        "email": email,
        "first_name": str(
            claims.get("given_name") or ""
        ).strip(),
        "last_name": str(
            claims.get("family_name") or ""
        ).strip(),
        "display_name": str(
            claims.get("name") or ""
        ).strip(),
    }


def verify_apple_identity_token(identity_token):
    audiences = tuple(
        value.strip()
        for value in settings.APPLE_SIGN_IN_AUDIENCES
        if value.strip()
    )

    if not audiences:
        raise SocialAuthError(
            "Apple sign-in is not configured on the server."
        )

    try:
        signing_key = (
            _apple_jwk_client
            .get_signing_key_from_jwt(
                identity_token
            )
        )
        claims = jwt.decode(
            identity_token,
            signing_key.key,
            algorithms=("RS256",),
            audience=audiences,
            issuer="https://appleid.apple.com",
        )
    except Exception as exc:
        raise SocialAuthError(
            "Apple could not verify this sign-in."
        ) from exc

    provider_user_id = str(
        claims.get("sub") or ""
    ).strip()

    if not provider_user_id:
        raise SocialAuthError(
            "Apple did not return an account identifier."
        )

    email = str(
        claims.get("email") or ""
    ).strip().lower()

    if email and not _is_true(
        claims.get("email_verified")
    ):
        raise SocialAuthError(
            "Apple did not return a verified email address."
        )

    return {
        "provider_user_id": provider_user_id,
        "email": email,
        "first_name": "",
        "last_name": "",
        "display_name": "",
    }


def verify_facebook_oidc_token(
    identity_token,
    nonce,
):
    app_id = str(
        settings.FACEBOOK_APP_ID or ""
    ).strip()

    if not app_id:
        raise SocialAuthError(
            "Facebook sign-in is not configured on the server."
        )

    if not nonce:
        raise SocialAuthError(
            "Facebook sign-in nonce is missing."
        )

    try:
        signing_key = (
            _facebook_jwk_client
            .get_signing_key_from_jwt(
                identity_token
            )
        )
        claims = jwt.decode(
            identity_token,
            signing_key.key,
            algorithms=("RS256",),
            audience=app_id,
            issuer="https://www.facebook.com",
        )
    except Exception as exc:
        raise SocialAuthError(
            "Facebook could not verify this sign-in."
        ) from exc

    token_nonce = str(
        claims.get("nonce") or ""
    ).strip()

    if not hmac.compare_digest(
        token_nonce,
        nonce,
    ):
        raise SocialAuthError(
            "Facebook returned an invalid sign-in nonce."
        )

    provider_user_id = str(
        claims.get("sub") or ""
    ).strip()
    email = str(
        claims.get("email") or ""
    ).strip().lower()

    if not provider_user_id:
        raise SocialAuthError(
            "Facebook did not return an account identifier."
        )

    if not email:
        raise SocialAuthError(
            "Facebook did not provide an email address. "
            "Allow email access and try again."
        )

    return {
        "provider_user_id": provider_user_id,
        "email": email,
        "first_name": str(
            claims.get("given_name") or ""
        ).strip(),
        "last_name": str(
            claims.get("family_name") or ""
        ).strip(),
        "display_name": str(
            claims.get("name") or ""
        ).strip(),
    }


def verify_facebook_access_token(
    access_token,
):
    app_id = str(
        settings.FACEBOOK_APP_ID or ""
    ).strip()
    app_secret = str(
        settings.FACEBOOK_APP_SECRET or ""
    ).strip()

    if not app_id or not app_secret:
        raise SocialAuthError(
            "Facebook sign-in is not configured on the server."
        )

    app_access_token = (
        f"{app_id}|{app_secret}"
    )

    try:
        debug_response = requests.get(
            "https://graph.facebook.com/debug_token",
            params={
                "input_token": access_token,
                "access_token": app_access_token,
            },
            timeout=10,
        )
        debug_response.raise_for_status()
        debug_data = (
            debug_response.json()
            .get("data", {})
        )
    except Exception as exc:
        raise SocialAuthError(
            "Facebook could not verify this sign-in."
        ) from exc

    if not debug_data.get("is_valid"):
        raise SocialAuthError(
            "Facebook returned an invalid access token."
        )

    if str(
        debug_data.get("app_id") or ""
    ) != app_id:
        raise SocialAuthError(
            "This Facebook sign-in was issued for a different app."
        )

    provider_user_id = str(
        debug_data.get("user_id") or ""
    ).strip()

    if not provider_user_id:
        raise SocialAuthError(
            "Facebook did not return an account identifier."
        )

    try:
        profile_response = requests.get(
            "https://graph.facebook.com/me",
            params={
                "fields": (
                    "id,name,email,"
                    "first_name,last_name"
                ),
                "access_token": access_token,
            },
            timeout=10,
        )
        profile_response.raise_for_status()
        profile = profile_response.json()
    except Exception as exc:
        raise SocialAuthError(
            "Facebook could not load the signed-in profile."
        ) from exc

    email = str(
        profile.get("email") or ""
    ).strip().lower()

    if not email:
        raise SocialAuthError(
            "Facebook did not provide an email address. "
            "Allow email access and try again."
        )

    if str(
        profile.get("id") or ""
    ).strip() != provider_user_id:
        raise SocialAuthError(
            "Facebook returned inconsistent account information."
        )

    return {
        "provider_user_id": provider_user_id,
        "email": email,
        "first_name": str(
            profile.get("first_name") or ""
        ).strip(),
        "last_name": str(
            profile.get("last_name") or ""
        ).strip(),
        "display_name": str(
            profile.get("name") or ""
        ).strip(),
    }


def verify_social_identity(
    *,
    provider,
    identity_token,
    token_type="oidc",
    nonce="",
):
    if provider == "google":
        return verify_google_identity_token(
            identity_token
        )

    if provider == "apple":
        return verify_apple_identity_token(
            identity_token
        )

    if provider == "facebook":
        if token_type == "access":
            return verify_facebook_access_token(
                identity_token
            )

        return verify_facebook_oidc_token(
            identity_token,
            nonce,
        )

    raise SocialAuthError(
        "Unsupported sign-in provider."
    )


def _fallback_apple_email(provider_user_id):
    digest = hashlib.sha256(
        provider_user_id.encode("utf-8")
    ).hexdigest()[:24]

    return (
        f"apple_{digest}"
        "@signin.picksumn.invalid"
    )


def _clean_name(value, max_length):
    return str(value or "").strip()[:max_length]


@transaction.atomic
def get_or_create_social_user(
    *,
    provider,
    verified_identity,
    supplied_display_name="",
    supplied_first_name="",
    supplied_last_name="",
):
    provider_user_id = verified_identity[
        "provider_user_id"
    ]

    existing_identity = (
        SocialIdentity.objects
        .select_related("user")
        .filter(
            provider=provider,
            provider_user_id=provider_user_id,
        )
        .first()
    )

    verified_email = str(
        verified_identity.get("email") or ""
    ).strip().lower()

    if existing_identity:
        if (
            verified_email
            and existing_identity.provider_email
            != verified_email
        ):
            existing_identity.provider_email = (
                verified_email
            )
            existing_identity.save(
                update_fields=(
                    "provider_email",
                    "updated_at",
                )
            )

        return existing_identity.user

    first_name = _clean_name(
        supplied_first_name
        or verified_identity.get("first_name"),
        150,
    )
    last_name = _clean_name(
        supplied_last_name
        or verified_identity.get("last_name"),
        150,
    )
    display_name = _clean_name(
        supplied_display_name
        or verified_identity.get("display_name")
        or " ".join(
            value
            for value in (
                first_name,
                last_name,
            )
            if value
        ),
        100,
    )

    account_email = verified_email

    if not account_email:
        if provider != "apple":
            raise SocialAuthError(
                "A verified email address is required."
            )

        account_email = _fallback_apple_email(
            provider_user_id
        )

    user = (
        User.objects
        .filter(
            email__iexact=account_email,
        )
        .first()
    )

    if user is None:
        user = User(
            email=account_email,
            display_name=(
                display_name
                or account_email.split("@", 1)[0]
            ),
            first_name=first_name,
            last_name=last_name,
        )
        user.set_unusable_password()
        user.save()
    else:
        existing_provider_link = (
            SocialIdentity.objects.filter(
                user=user,
                provider=provider,
            ).first()
        )

        if existing_provider_link:
            raise SocialAuthError(
                "This Pick Sum’N account is already linked "
                "to a different account from this provider."
            )

        fields_to_update = []

        if not user.display_name and display_name:
            user.display_name = display_name
            fields_to_update.append("display_name")

        if not user.first_name and first_name:
            user.first_name = first_name
            fields_to_update.append("first_name")

        if not user.last_name and last_name:
            user.last_name = last_name
            fields_to_update.append("last_name")

        if fields_to_update:
            user.save(
                update_fields=tuple(fields_to_update)
            )

    SocialIdentity.objects.create(
        user=user,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=verified_email,
    )

    return user
