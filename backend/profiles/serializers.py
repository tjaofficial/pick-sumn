from rest_framework import serializers

from .models import Profile
from .services import calculate_profile_completion


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    display_name = serializers.CharField(
        source="user.display_name",
        required=False,
        allow_blank=False,
        max_length=100,
    )

    first_name = serializers.CharField(
        source="user.first_name",
        required=False,
        allow_blank=True,
        max_length=150,
    )

    last_name = serializers.CharField(
        source="user.last_name",
        required=False,
        allow_blank=True,
        max_length=150,
    )

    avatar = serializers.ImageField(
        source="user.avatar",
        read_only=True,
    )

    completion_percentage = serializers.SerializerMethodField()
    missing_sections = serializers.SerializerMethodField()
    location_display = serializers.CharField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "email",
            "display_name",
            "first_name",
            "last_name",
            "avatar",
            "bio",
            "city",
            "state",
            "location_display",
            "default_search_radius_miles",
            "default_price_min",
            "default_price_max",
            "exclude_recent_days",
            "onboarding_completed",
            "completion_percentage",
            "missing_sections",
            "created_at",
            "updated_at",
            "dietary_section_completed",
            "dislikes_section_completed",
        )

        read_only_fields = (
            "email",
            "avatar",
            "location_display",
            "completion_percentage",
            "missing_sections",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        price_min = attrs.get(
            "default_price_min",
            self.instance.default_price_min,
        )

        price_max = attrs.get(
            "default_price_max",
            self.instance.default_price_max,
        )

        if price_min < 1 or price_min > 4:
            raise serializers.ValidationError(
                {
                    "default_price_min": (
                        "Minimum price must be between 1 and 4."
                    )
                }
            )

        if price_max < 1 or price_max > 4:
            raise serializers.ValidationError(
                {
                    "default_price_max": (
                        "Maximum price must be between 1 and 4."
                    )
                }
            )

        if price_min > price_max:
            raise serializers.ValidationError(
                {
                    "default_price_max": (
                        "Maximum price cannot be lower than "
                        "minimum price."
                    )
                }
            )

        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        user = instance.user

        for field, value in user_data.items():
            setattr(user, field, value)

        if user_data:
            user.save(
                update_fields=list(user_data.keys())
            )

        return super().update(
            instance,
            validated_data,
        )

    def get_completion_percentage(self, obj):
        return calculate_profile_completion(
            obj.user
        ).percentage

    def get_missing_sections(self, obj):
        return calculate_profile_completion(
            obj.user
        ).missing_sections