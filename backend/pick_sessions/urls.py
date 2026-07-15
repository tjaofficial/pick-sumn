from rest_framework.routers import DefaultRouter

from .views import PickSessionViewSet


app_name = "pick_sessions"

router = DefaultRouter()

router.register(
    "",
    PickSessionViewSet,
    basename="pick-session",
)

urlpatterns = router.urls