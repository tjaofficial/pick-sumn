from django.db import transaction

from .models import (
    UserCuisinePreference,
    UserDietaryPreference,
    UserDiningStylePreference,
    UserFoodDislike,
)


@transaction.atomic
def replace_user_preferences(
    *,
    user,
    cuisines,
    dining_styles,
    dietary_preferences,
    food_dislikes,
):
    """Replace a user's complete preference set."""

    UserCuisinePreference.objects.filter(
        user=user,
    ).delete()

    for item in cuisines:
        UserCuisinePreference.objects.create(
            user=user,
            cuisine=item["cuisine"],
            level=item["level"],
            rank=item.get("rank"),
        )

    UserDiningStylePreference.objects.filter(
        user=user,
    ).delete()

    for item in dining_styles:
        UserDiningStylePreference.objects.create(
            user=user,
            dining_style=item["dining_style"],
            level=item["level"],
        )

    UserDietaryPreference.objects.filter(
        user=user,
    ).delete()

    for item in dietary_preferences:
        UserDietaryPreference.objects.create(
            user=user,
            dietary_tag=item["dietary_tag"],
            is_required=item["is_required"],
        )

    UserFoodDislike.objects.filter(
        user=user,
    ).delete()

    for item in food_dislikes:
        UserFoodDislike.objects.create(
            user=user,
            food_dislike=item["food_dislike"],
            is_absolute=item["is_absolute"],
        )