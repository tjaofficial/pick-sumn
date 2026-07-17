from django.urls import path
from rest_framework.routers import DefaultRouter

from .location_views import LocationDetailView, LocationSuggestionView
from .views import (
    PickSessionViewSet,
    RestaurantDietaryDetailView,
    RestaurantDietaryReportView,
)


app_name = "pick_sessions"

router = DefaultRouter()
router.register("", PickSessionViewSet, basename="pick-session")

urlpatterns = [
    path(
        "restaurants/<str:place_id>/dietary/",
        RestaurantDietaryDetailView.as_view(),
        name="restaurant-dietary-detail",
    ),
    path(
        "restaurants/<str:place_id>/dietary/report/",
        RestaurantDietaryReportView.as_view(),
        name="restaurant-dietary-report",
    ),
    path(
        "location-suggestions/",
        LocationSuggestionView.as_view(),
        name="location-suggestions",
    ),
    path(
        "location-details/",
        LocationDetailView.as_view(),
        name="location-details",
    ),
]

urlpatterns += router.urls
