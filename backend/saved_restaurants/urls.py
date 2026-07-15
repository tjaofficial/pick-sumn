from django.urls import path

from .views import (
    SavedRestaurantDeleteByExternalIdView,
    SavedRestaurantDetailView,
    SavedRestaurantListCreateView,
    SavedRestaurantStatusView,
)


urlpatterns = [
    path(
        "",
        SavedRestaurantListCreateView.as_view(),
        name="saved-restaurant-list-create",
    ),
    path(
        "status/",
        SavedRestaurantStatusView.as_view(),
        name="saved-restaurant-status",
    ),
    path(
        "remove/",
        SavedRestaurantDeleteByExternalIdView.as_view(),
        name=(
            "saved-restaurant-remove-by-external-id"
        ),
    ),
    path(
        "<int:saved_restaurant_id>/",
        SavedRestaurantDetailView.as_view(),
        name="saved-restaurant-detail",
    ),
]