from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Safe public representation of the authenticated user."""

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