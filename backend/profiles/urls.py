from django.urls import path

from .views import (
    CurrentProfileView,
    ProfileAvatarView,
)


app_name = "profiles"

urlpatterns = [
    path(
        "",
        CurrentProfileView.as_view(),
        name="current-profile",
    ),
    path(
        "avatar/",
        ProfileAvatarView.as_view(),
        name="profile-avatar",
    ),
]
