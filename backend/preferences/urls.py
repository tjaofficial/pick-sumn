from django.urls import path

from .views import (
    CurrentPreferencesView,
    PreferenceOptionsView,
)


app_name = "preferences"

urlpatterns = [
    path(
        "options/",
        PreferenceOptionsView.as_view(),
        name="options",
    ),
    path(
        "me/",
        CurrentPreferencesView.as_view(),
        name="current-preferences",
    ),
]