from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from . import public_views


urlpatterns = [
    path(
        "",
        public_views.home,
        name="public-home",
    ),

    path(
        "privacy",
        public_views.privacy_policy,
        name="privacy-policy",
    ),

    path(
        "terms",
        public_views.terms_of_service,
        name="terms-of-service",
    ),

    path(
        "support",
        public_views.support,
        name="support",
    ),

    path(
        "join/<str:join_code>",
        public_views.group_invite,
        name="public-group-invite",
    ),

    path(
        ".well-known/apple-app-site-association",
        public_views.apple_app_site_association,
        name="apple-app-site-association",
    ),

    path(
        ".well-known/assetlinks.json",
        public_views.android_asset_links,
        name="android-asset-links",
    ),

    path("admin/", admin.site.urls),

    path(
        "api/auth/",
        include("accounts.urls"),
    ),

    path(
        "api/profile/",
        include("profiles.urls"),
    ),

    path(
        "api/preferences/",
        include("preferences.urls"),
    ),

    path(
        "api/groups/",
        include("dining_groups.urls"),
    ),

    path(
        "api/",
        include("api.urls"),
    ),

    path(
        "api/pick-sessions/",
        include("pick_sessions.urls"),
    ),

    path(
        "api/saved-restaurants/",
        include("saved_restaurants.urls"),
    ),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )