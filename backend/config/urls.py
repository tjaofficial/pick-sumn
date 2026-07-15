from django.contrib import admin
from django.urls import include, path


urlpatterns = [
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