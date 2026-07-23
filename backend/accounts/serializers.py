from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    FeedbackSubmission,
    UserAppSettings,
)


def _secure_media_url(
    *,
    request,
    url: str,
) -> str:
    """
    Return a device-safe media URL.

    Cloud media backends may expose an http URL even though the same
    asset is available over https. Android/iOS production networking can
    reject that insecure image URL.
    """

    clean_url = str(url or "").strip()

    if not clean_url:
        return ""

    if clean_url.startswith("http://"):
        return (
            "https://"
            + clean_url[len("http://"):]
        )

    if clean_url.startswith("https://"):
        return clean_url

    if request:
        absolute_url = (
            request.build_absolute_uri(
                clean_url
            )
        )

        if absolute_url.startswith(
            "http://"
        ):
            return (
                "https://"
                + absolute_url[
                    len("http://"):
                ]
            )

        return absolute_url

    return clean_url



User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Safe public representation of the authenticated user."""

    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "display_name",
            "first_name",
            "last_name",
            "avatar",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "email",
            "date_joined",
        )

    def get_avatar(self, obj):
        if not obj.avatar:
            return None

        request = self.context.get("request")

        return _secure_media_url(
            request=request,
            url=obj.avatar.url,
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )

    password_confirm = serializers.CharField(
        write_only=True,
    )

    class Meta:
        model = User
        fields = (
            "email",
            "display_name",
            "password",
            "password_confirm",
        )

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {
                    "password_confirm": (
                        "The passwords do not match."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")

        password = validated_data.pop("password")

        return User.objects.create_user(
            password=password,
            **validated_data,
        )

class FriendUserSerializer(UserSerializer):
    pass


class MyFriendCodeSerializer(UserSerializer):
    friend_code = serializers.CharField(
        read_only=True,
    )

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + (
            "friend_code",
        )


class FriendListItemSerializer(serializers.Serializer):
    friendship_id = serializers.UUIDField()
    user = FriendUserSerializer()


class FriendRequestSerializer(serializers.Serializer):
    friendship_id = serializers.UUIDField()
    user = FriendUserSerializer()
    created_at = serializers.DateTimeField()


class FriendSearchResultSerializer(serializers.Serializer):
    user = FriendUserSerializer()
    relationship_status = serializers.CharField(
        allow_null=True,
    )



class BlockedUserSerializer(serializers.Serializer):
    friendship_id = serializers.UUIDField()
    user = FriendUserSerializer()
    blocked_at = serializers.DateTimeField()


class UserAppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAppSettings
        fields = (
            "friend_request_privacy",
            "group_invite_privacy",
            "notification_friend_requests",
            "notification_group_invites",
            "notification_pick_session_invites",
            "notification_group_vote_started",
            "notification_voting_reminders",
            "notification_session_results",
            "notification_general",
            "theme",
            "updated_at",
        )
        read_only_fields = (
            "updated_at",
        )


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
    )

    def validate_current_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Your current password is incorrect."
            )

        return value

    def validate(self, attrs):
        if (
            attrs["new_password"]
            != attrs["new_password_confirm"]
        ):
            raise serializers.ValidationError(
                {
                    "new_password_confirm": (
                        "The new passwords do not match."
                    )
                }
            )

        return attrs



class FeedbackSubmissionSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = FeedbackSubmission
        fields = (
            "id",
            "feedback_type",
            "message",
            "may_contact",
            "created_at",
        )
        read_only_fields = (
            "id",
            "created_at",
        )

    def validate_message(self, value):
        cleaned = value.strip()

        if len(cleaned) < 5:
            raise serializers.ValidationError(
                "Enter a little more detail before submitting."
            )

        return cleaned
