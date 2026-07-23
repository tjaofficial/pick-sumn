from pathlib import Path
from datetime import timedelta
import os

import environ


BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)

environ.Env.read_env(
    BASE_DIR / ".env",
)


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=15,
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=30,
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),
}


SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
)

DEBUG = env.bool(
    "DJANGO_DEBUG",
)

ALLOWED_HOSTS = env.list(
    "DJANGO_ALLOWED_HOSTS",
    default=[
        "localhost",
        "127.0.0.1",
    ],
)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "cloudinary_storage",
    "cloudinary",

    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",

    "accounts",
    "profiles.apps.ProfilesConfig",
    "preferences",
    "dining_groups",
    "pick_sessions",
    "api",
    "saved_restaurants",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": (
            "django.template.backends"
            ".django.DjangoTemplates"
        ),
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                (
                    "django.template"
                    ".context_processors.request"
                ),
                (
                    "django.contrib.auth"
                    ".context_processors.auth"
                ),
                (
                    "django.contrib.messages"
                    ".context_processors.messages"
                ),
            ],
        },
    },
]


WSGI_APPLICATION = (
    "config.wsgi.application"
)


DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=(
            f"sqlite:///"
            f"{BASE_DIR / 'db.sqlite3'}"
        ),
    )
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth"
            ".password_validation"
            ".UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth"
            ".password_validation"
            ".MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth"
            ".password_validation"
            ".CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth"
            ".password_validation"
            ".NumericPasswordValidator"
        ),
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


STATIC_URL = "/static/"

STATIC_ROOT = (
    BASE_DIR / "staticfiles"
)

STORAGES = {
    "default": {
        "BACKEND": (
            "cloudinary_storage.storage"
            ".MediaCloudinaryStorage"
        ),
    },

    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage"
            ".CompressedManifestStaticFilesStorage"
        ),
    },
}


DEFAULT_AUTO_FIELD = (
    "django.db.models.BigAutoField"
)


CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
)


AUTH_USER_MODEL = "accounts.User"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        (
            "rest_framework_simplejwt"
            ".authentication"
            ".JWTAuthentication"
        ),
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        (
            "rest_framework.permissions"
            ".IsAuthenticated"
        ),
    ),
}


GOOGLE_PLACES_API_KEY = os.environ.get(
    "GOOGLE_PLACES_API_KEY",
    "",
)


if not DEBUG:
    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


GOOGLE_OAUTH_CLIENT_IDS = env.list(
    "GOOGLE_OAUTH_CLIENT_IDS",
    default=[],
)

APPLE_SIGN_IN_AUDIENCES = env.list(
    "APPLE_SIGN_IN_AUDIENCES",
    default=[
        "com.picksumn.app",
    ],
)
