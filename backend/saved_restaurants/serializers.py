from rest_framework import serializers

from .models import SavedRestaurant


class SavedRestaurantSerializer(
    serializers.ModelSerializer
):
    latitude = serializers.FloatField(
        allow_null=True,
        required=False,
    )

    longitude = serializers.FloatField(
        allow_null=True,
        required=False,
    )

    rating = serializers.FloatField(
        allow_null=True,
        required=False,
    )

    class Meta:
        model = SavedRestaurant

        fields = (
            "id",
            "external_id",
            "name",
            "formatted_address",
            "latitude",
            "longitude",
            "primary_type",
            "primary_type_display_name",
            "rating",
            "user_rating_count",
            "price_level",
            "phone_number",
            "website_uri",
            "google_maps_uri",
            "menu_uri",
            "photo_url",
            "delivery",
            "dine_in",
            "takeout",
            "saved_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "saved_at",
            "updated_at",
        )

    def validate_external_id(
        self,
        value,
    ):
        cleaned_value = value.strip()

        if not cleaned_value:
            raise serializers.ValidationError(
                "A Google Places ID is required."
            )

        return cleaned_value

    def validate_name(
        self,
        value,
    ):
        cleaned_value = value.strip()

        if not cleaned_value:
            raise serializers.ValidationError(
                "The restaurant name is required."
            )

        return cleaned_value

    def validate_rating(
        self,
        value,
    ):
        if value is None:
            return value

        if value < 0 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 0 and 5."
            )

        return value

    def validate_latitude(
        self,
        value,
    ):
        if value is None:
            return value

        if value < -90 or value > 90:
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90."
            )

        return value

    def validate_longitude(
        self,
        value,
    ):
        if value is None:
            return value

        if value < -180 or value > 180:
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )

        return value

    def create(
        self,
        validated_data,
    ):
        user = self.context[
            "request"
        ].user

        external_id = validated_data[
            "external_id"
        ]

        saved_restaurant, _ = (
            SavedRestaurant.objects
            .update_or_create(
                user=user,
                external_id=external_id,
                defaults=validated_data,
            )
        )

        return saved_restaurant