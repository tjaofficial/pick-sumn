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


from .models import Profile, SavedLocation
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

    avatar = serializers.SerializerMethodField()

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
            "default_location_label",
            "default_location_latitude",
            "default_location_longitude",
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
            "profile_completion_card_dismissed",
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

    def get_avatar(self, obj):
        if not obj.user.avatar:
            return None

        request = self.context.get("request")

        return _secure_media_url(
            request=request,
            url=obj.user.avatar.url,
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

class SavedLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedLocation
        fields = (
            "id",
            "name",
            "location_label",
            "latitude",
            "longitude",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )

    def validate_name(self, value):
        clean_value = value.strip()

        if not clean_value:
            raise serializers.ValidationError(
                "Enter a name for this saved location."
            )

        return clean_value

    def validate_location_label(self, value):
        clean_value = value.strip()

        if not clean_value:
            raise serializers.ValidationError(
                "Choose a location."
            )

        return clean_value

    def validate(self, attrs):
        latitude = attrs.get(
            "latitude",
            getattr(
                self.instance,
                "latitude",
                None,
            ),
        )

        longitude = attrs.get(
            "longitude",
            getattr(
                self.instance,
                "longitude",
                None,
            ),
        )

        if latitude is None or longitude is None:
            raise serializers.ValidationError(
                "Latitude and longitude are required."
            )

        return attrs
