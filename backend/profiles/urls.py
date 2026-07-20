from django.urls import path

from .views import (
    CurrentProfileView,
    ProfileAvatarView,
    SavedLocationDetailView,
    SavedLocationListCreateView,
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
    path(
        "saved-locations/",
        SavedLocationListCreateView.as_view(),
        name="saved-location-list-create",
    ),
    path(
        "saved-locations/<int:pk>/",
        SavedLocationDetailView.as_view(),
        name="saved-location-detail",
    ),
]
