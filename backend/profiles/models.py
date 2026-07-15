from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Personal profile and default dining settings for a user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    bio = models.CharField(
        max_length=280,
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    state = models.CharField(
        max_length=100,
        blank=True,
    )

    default_search_radius_miles = models.PositiveSmallIntegerField(
        default=10,
    )

    default_price_min = models.PositiveSmallIntegerField(
        default=1,
    )

    default_price_max = models.PositiveSmallIntegerField(
        default=3,
    )

    exclude_recent_days = models.PositiveSmallIntegerField(
        default=7,
        help_text="Avoid restaurants visited within this many days.",
    )

    onboarding_completed = models.BooleanField(
        default=False,
    )

    dietary_section_completed = models.BooleanField(
        default=False,
        help_text=(
            "The user has reviewed the dietary section, "
            "including confirming that none apply."
        ),
    )

    dislikes_section_completed = models.BooleanField(
        default=False,
        help_text=(
            "The user has reviewed the dislikes section, "
            "including confirming that none apply."
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("user__email",)

    def __str__(self):
        return f"{self.user} profile"

    @property
    def location_display(self):
        values = [
            value
            for value in (self.city, self.state)
            if value
        ]

        return ", ".join(values)