from rest_framework.routers import DefaultRouter

from .views import DiningGroupViewSet


app_name = "dining_groups"

router = DefaultRouter()
router.register(
    "",
    DiningGroupViewSet,
    basename="dining-group",
)

urlpatterns = router.urls