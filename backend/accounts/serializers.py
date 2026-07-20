from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
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
