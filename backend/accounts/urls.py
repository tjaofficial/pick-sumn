from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    BlockedUserListView,
    BlockUserView,
    ChangePasswordView,
    CurrentAppSettingsView,
    CurrentUserView,
    DeleteAccountView,
    FeedbackSubmissionView,
    FriendDetailView,
    FriendListView,
    FriendRequestActionView,
    FriendRequestListView,
    FriendSearchView,
    LogoutView,
    MyFriendCodeView,
    RegisterView,
    SendFriendRequestView,
    SocialLoginView,
    UnblockUserView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("social-login/", SocialLoginView.as_view(), name="social-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("friends/", FriendListView.as_view(), name="friends"),
    path("friends/requests/", FriendRequestListView.as_view(), name="friend-requests"),
    path("friends/search/", FriendSearchView.as_view(), name="friend-search"),
    path("friends/request/", SendFriendRequestView.as_view(), name="friend-request-send"),
    path(
        "friends/requests/<uuid:friendship_id>/action/",
        FriendRequestActionView.as_view(),
        name="friend-request-action",
    ),
    path(
        "friends/<uuid:friendship_id>/",
        FriendDetailView.as_view(),
        name="friend-detail",
    ),
    path("friends/me/code/", MyFriendCodeView.as_view(), name="my-friend-code"),
    path(
        "friends/blocked/",
        BlockedUserListView.as_view(),
        name="blocked-users",
    ),
    path(
        "friends/block/",
        BlockUserView.as_view(),
        name="block-user",
    ),
    path(
        "friends/blocked/<int:user_id>/",
        UnblockUserView.as_view(),
        name="unblock-user",
    ),
    path(
        "settings/",
        CurrentAppSettingsView.as_view(),
        name="app-settings",
    ),
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "delete-account/",
        DeleteAccountView.as_view(),
        name="delete-account",
    ),
    path(
        "feedback/",
        FeedbackSubmissionView.as_view(),
        name="feedback",
    ),
]
