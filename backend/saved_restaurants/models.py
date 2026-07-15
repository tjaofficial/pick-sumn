from django.conf import settings
from django.db import models


class SavedRestaurant(models.Model):
    """
    A restaurant saved by a user.

    Restaurant information is stored as a snapshot so the
    favorites page can load without making another Google
    Places request every time.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_restaurants",
    )

    external_id = models.CharField(
        max_length=255,
        help_text="Google Places restaurant ID.",
    )

    name = models.CharField(
        max_length=255,
    )

    formatted_address = models.CharField(
        max_length=500,
        blank=True,
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=7,
        null=True,
        blank=True,
    )

    primary_type = models.CharField(
        max_length=120,
        blank=True,
    )

    primary_type_display_name = models.CharField(
        max_length=150,
        blank=True,
    )

    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
    )

    user_rating_count = models.PositiveIntegerField(
        default=0,
    )

    price_level = models.CharField(
        max_length=80,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=50,
        blank=True,
    )

    website_uri = models.URLField(
        max_length=1000,
        blank=True,
    )

    google_maps_uri = models.URLField(
        max_length=1000,
        blank=True,
    )

    menu_uri = models.URLField(
        max_length=1000,
        blank=True,
    )

    photo_url = models.URLField(
        max_length=2000,
        blank=True,
    )

    delivery = models.BooleanField(
        null=True,
        blank=True,
    )

    dine_in = models.BooleanField(
        null=True,
        blank=True,
    )

    takeout = models.BooleanField(
        null=True,
        blank=True,
    )

    saved_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-saved_at",
        )

        constraints = [
            models.UniqueConstraint(
                fields=(
                    "user",
                    "external_id",
                ),
                name=(
                    "unique_saved_restaurant_per_user"
                ),
            ),
        ]

        indexes = [
            models.Index(
                fields=(
                    "user",
                    "-saved_at",
                ),
                name="saved_rest_user_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} — {self.name}"
        )