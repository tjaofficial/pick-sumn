from rest_framework import serializers

from .models import (
    Cuisine,
    DietaryTag,
    DiningStyle,
    FoodDislike,
    PreferenceLevel,
    UserCuisinePreference,
    UserDietaryPreference,
    UserDiningStylePreference,
    UserFoodDislike,
)


class CuisineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cuisine
        fields = (
            "id",
            "name",
            "slug",
        )


class DiningStyleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiningStyle
        fields = (
            "id",
            "name",
            "slug",
        )


class DietaryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietaryTag
        fields = (
            "id",
            "name",
            "slug",
            "description",
        )


class FoodDislikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodDislike
        fields = (
            "id",
            "name",
            "slug",
        )


class UserCuisinePreferenceSerializer(
    serializers.ModelSerializer
):
    cuisine_id = serializers.PrimaryKeyRelatedField(
        source="cuisine",
        queryset=Cuisine.objects.filter(is_active=True),
    )

    cuisine_name = serializers.CharField(
        source="cuisine.name",
        read_only=True,
    )

    cuisine_slug = serializers.CharField(
        source="cuisine.slug",
        read_only=True,
    )

    class Meta:
        model = UserCuisinePreference
        fields = (
            "cuisine_id",
            "cuisine_name",
            "cuisine_slug",
            "level",
            "rank",
        )

    def validate_level(self, value):
        valid_values = {
            choice.value
            for choice in PreferenceLevel
        }

        if value not in valid_values:
            raise serializers.ValidationError(
                "Invalid preference level."
            )

        return value


class UserDiningStylePreferenceSerializer(
    serializers.ModelSerializer
):
    dining_style_id = serializers.PrimaryKeyRelatedField(
        source="dining_style",
        queryset=DiningStyle.objects.filter(is_active=True),
    )

    dining_style_name = serializers.CharField(
        source="dining_style.name",
        read_only=True,
    )

    class Meta:
        model = UserDiningStylePreference
        fields = (
            "dining_style_id",
            "dining_style_name",
            "level",
        )


class UserDietaryPreferenceSerializer(
    serializers.ModelSerializer
):
    dietary_tag_id = serializers.PrimaryKeyRelatedField(
        source="dietary_tag",
        queryset=DietaryTag.objects.filter(is_active=True),
    )

    dietary_tag_name = serializers.CharField(
        source="dietary_tag.name",
        read_only=True,
    )

    class Meta:
        model = UserDietaryPreference
        fields = (
            "dietary_tag_id",
            "dietary_tag_name",
            "is_required",
        )


class UserFoodDislikeSerializer(
    serializers.ModelSerializer
):
    food_dislike_id = serializers.PrimaryKeyRelatedField(
        source="food_dislike",
        queryset=FoodDislike.objects.filter(is_active=True),
    )

    food_dislike_name = serializers.CharField(
        source="food_dislike.name",
        read_only=True,
    )

    class Meta:
        model = UserFoodDislike
        fields = (
            "food_dislike_id",
            "food_dislike_name",
            "is_absolute",
        )


class PreferenceOptionsSerializer(serializers.Serializer):
    cuisines = CuisineSerializer(many=True)
    dining_styles = DiningStyleSerializer(many=True)
    dietary_tags = DietaryTagSerializer(many=True)
    food_dislikes = FoodDislikeSerializer(many=True)


class CurrentPreferencesSerializer(serializers.Serializer):
    cuisines = UserCuisinePreferenceSerializer(many=True)
    dining_styles = UserDiningStylePreferenceSerializer(many=True)
    dietary_preferences = UserDietaryPreferenceSerializer(
        many=True,
    )
    food_dislikes = UserFoodDislikeSerializer(many=True)