from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class PreferenceLevel(models.IntegerChoices):
    NEVER = -2, "Never"
    DISLIKE = -1, "Dislike"
    NEUTRAL = 0, "Neutral"
    LIKE = 1, "Like"
    LOVE = 2, "Love"


class Cuisine(models.Model):
    """A standardized cuisine category."""

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class DiningStyle(models.Model):
    """How a user prefers to receive or experience a meal."""

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class DietaryTag(models.Model):
    """A dietary requirement or restaurant accommodation."""

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class FoodDislike(models.Model):
    """An ingredient or food category a user may avoid."""

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class UserCuisinePreference(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cuisine_preferences",
    )

    cuisine = models.ForeignKey(
        Cuisine,
        on_delete=models.CASCADE,
        related_name="user_preferences",
    )

    level = models.SmallIntegerField(
        choices=PreferenceLevel.choices,
        default=PreferenceLevel.NEUTRAL,
    )

    rank = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
        help_text="Optional top-five ranking.",
    )

    class Meta:
        ordering = ("-level", "rank", "cuisine__name")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "cuisine"),
                name="unique_user_cuisine_preference",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} — {self.cuisine}: "
            f"{self.get_level_display()}"
        )


class UserDiningStylePreference(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dining_style_preferences",
    )

    dining_style = models.ForeignKey(
        DiningStyle,
        on_delete=models.CASCADE,
        related_name="user_preferences",
    )

    level = models.SmallIntegerField(
        choices=PreferenceLevel.choices,
        default=PreferenceLevel.NEUTRAL,
    )

    class Meta:
        ordering = ("-level", "dining_style__name")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "dining_style"),
                name="unique_user_dining_style_preference",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} — {self.dining_style}: "
            f"{self.get_level_display()}"
        )


class UserDietaryPreference(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dietary_preferences",
    )

    dietary_tag = models.ForeignKey(
        DietaryTag,
        on_delete=models.CASCADE,
        related_name="user_preferences",
    )

    is_required = models.BooleanField(
        default=False,
        help_text=(
            "Required preferences may disqualify restaurants "
            "that cannot accommodate them."
        ),
    )

    class Meta:
        ordering = ("-is_required", "dietary_tag__name")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "dietary_tag"),
                name="unique_user_dietary_preference",
            ),
        ]

    def __str__(self):
        requirement = "Required" if self.is_required else "Preferred"

        return (
            f"{self.user} — {self.dietary_tag}: "
            f"{requirement}"
        )


class UserFoodDislike(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_dislikes",
    )

    food_dislike = models.ForeignKey(
        FoodDislike,
        on_delete=models.CASCADE,
        related_name="user_preferences",
    )

    is_absolute = models.BooleanField(
        default=False,
        help_text=(
            "Absolute dislikes should strongly penalize or "
            "exclude unsuitable matches."
        ),
    )

    class Meta:
        ordering = ("-is_absolute", "food_dislike__name")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "food_dislike"),
                name="unique_user_food_dislike",
            ),
        ]

    def __str__(self):
        strength = "Never" if self.is_absolute else "Dislike"

        return (
            f"{self.user} — {self.food_dislike}: "
            f"{strength}"
        )