import uuid

from django.conf import settings
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models

from dining_groups.models import DiningGroup


class PickSessionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    WAITING = "waiting", "Waiting for Participants"
    READY = "ready", "Ready"
    MATCHING = "matching", "Finding Matches"
    VOTING = "voting", "Voting"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"


class DecisionMode(models.TextChoices):
    RANKED = "ranked", "Ranked Results"
    PICK_FOR_US = "pick_for_us", "Pick For Us"
    GROUP_VOTE = "group_vote", "Group Vote"
    ROULETTE = "roulette", "Restaurant Roulette"
    SWIPE = "swipe", "Swipe Mode"
    ELIMINATION = "elimination", "Elimination Mode"


class ParticipantStatus(models.TextChoices):
    INVITED = "invited", "Invited"
    JOINED = "joined", "Joined"
    READY = "ready", "Ready"
    DECLINED = "declined", "Declined"
    LEFT = "left", "Left"


class PickSession(models.Model):
    """One attempt by a user or group to choose somewhere to eat."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_pick_sessions",
    )

    group = models.ForeignKey(
        DiningGroup,
        on_delete=models.SET_NULL,
        related_name="pick_sessions",
        blank=True,
        null=True,
    )

    title = models.CharField(
        max_length=120,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=PickSessionStatus.choices,
        default=PickSessionStatus.DRAFT,
    )

    decision_mode = models.CharField(
        max_length=30,
        choices=DecisionMode.choices,
        default=DecisionMode.RANKED,
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
    )

    location_label = models.CharField(
        max_length=255,
        blank=True,
    )

    search_radius_miles = models.PositiveSmallIntegerField(
        default=10,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(100),
        ],
    )

    price_min = models.PositiveSmallIntegerField(
        default=1,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(4),
        ],
    )

    price_max = models.PositiveSmallIntegerField(
        default=3,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(4),
        ],
    )

    open_now = models.BooleanField(
        default=True,
    )

    include_delivery = models.BooleanField(
        default=False,
    )

    include_drive_through = models.BooleanField(
        default=False,
    )

    something_new = models.BooleanField(
        default=False,
    )

    exclude_recent_days = models.PositiveSmallIntegerField(
        default=7,
    )

    vetoes_per_participant = models.PositiveSmallIntegerField(
        default=2,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(10),
        ],
    )

    selected_restaurant_external_id = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            "Temporary external restaurant ID until the "
            "restaurant domain is added."
        ),
    )

    selected_restaurant_name = models.CharField(
        max_length=255,
        blank=True,
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    started_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    completed_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title or f"Pick Session {self.id}"

    @property
    def participant_count(self):
        return self.participants.filter(
            status__in=(
                ParticipantStatus.JOINED,
                ParticipantStatus.READY,
            ),
        ).count()


class PickSessionParticipant(models.Model):
    """A user participating in a Pick Session."""

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="participants",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pick_session_participations",
    )

    status = models.CharField(
        max_length=20,
        choices=ParticipantStatus.choices,
        default=ParticipantStatus.INVITED,
    )

    is_host = models.BooleanField(
        default=False,
    )

    vetoes_used = models.PositiveSmallIntegerField(
        default=0,
    )

    joined_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    ready_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-is_host",
            "created_at",
        )

        constraints = [
            models.UniqueConstraint(
                fields=("session", "user"),
                name="unique_pick_session_participant",
            ),
        ]

    def __str__(self):
        return f"{self.user} in {self.session}"


class PickSessionCuisineFilter(models.Model):
    """Optional cuisine filter applied to a Pick Session."""

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="cuisine_filters",
    )

    cuisine = models.ForeignKey(
        "preferences.Cuisine",
        on_delete=models.CASCADE,
        related_name="pick_session_filters",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("session", "cuisine"),
                name="unique_pick_session_cuisine_filter",
            ),
        ]

    def __str__(self):
        return f"{self.session} — {self.cuisine}"