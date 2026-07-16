import uuid

from django.conf import settings
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models
from django.db.models import Q

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

    open_now = models.BooleanField(default=True)
    include_delivery = models.BooleanField(default=False)
    include_drive_through = models.BooleanField(default=False)
    something_new = models.BooleanField(default=False)

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

    expires_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    is_host = models.BooleanField(default=False)

    # The one session this user currently projects into Matches and Map.
    is_current = models.BooleanField(default=False)

    vetoes_used = models.PositiveSmallIntegerField(default=0)
    joined_at = models.DateTimeField(blank=True, null=True)
    ready_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
            models.UniqueConstraint(
                fields=("user",),
                condition=Q(is_current=True),
                name="unique_current_pick_session_per_user",
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



class PickSessionRestaurantOption(models.Model):
    """A frozen restaurant option used by a Group Vote."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="vote_options",
    )

    external_id = models.CharField(
        max_length=255,
    )

    name = models.CharField(
        max_length=255,
    )

    rank = models.PositiveSmallIntegerField()

    match_score = models.PositiveSmallIntegerField(
        default=0,
    )

    restaurant_data = models.JSONField(
        default=dict,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = (
            "rank",
            "name",
        )

        constraints = [
            models.UniqueConstraint(
                fields=(
                    "session",
                    "external_id",
                ),
                name=(
                    "unique_group_vote_option_external_id"
                ),
            ),
            models.UniqueConstraint(
                fields=(
                    "session",
                    "rank",
                ),
                name=(
                    "unique_group_vote_option_rank"
                ),
            ),
        ]

    def __str__(self):
        return (
            f"{self.session}: "
            f"#{self.rank} {self.name}"
        )


class PickSessionVote(models.Model):
    """One participant's current vote in a Group Vote."""

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="votes",
    )

    participant = models.ForeignKey(
        PickSessionParticipant,
        on_delete=models.CASCADE,
        related_name="votes",
    )

    option = models.ForeignKey(
        PickSessionRestaurantOption,
        on_delete=models.CASCADE,
        related_name="votes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=(
                    "session",
                    "participant",
                ),
                name=(
                    "one_group_vote_per_participant"
                ),
            ),
        ]

    def __str__(self):
        return (
            f"{self.participant.user} voted for "
            f"{self.option.name}"
        )



class PickSessionNotificationKind(models.TextChoices):
    GROUP_VOTE_INVITE = (
        "group_vote_invite",
        "Group Vote Invitation",
    )

    GROUP_VOTE_COMPLETED = (
        "group_vote_completed",
        "Group Vote Completed",
    )


class PickSessionNotification(models.Model):
    """An in-app notification tied to a Pick Session."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pick_session_notifications",
    )

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    kind = models.CharField(
        max_length=40,
        choices=PickSessionNotificationKind.choices,
    )

    title = models.CharField(
        max_length=120,
    )

    message = models.CharField(
        max_length=255,
    )

    is_read = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    read_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    class Meta:
        ordering = (
            "-created_at",
        )

        constraints = [
            models.UniqueConstraint(
                fields=(
                    "user",
                    "session",
                    "kind",
                ),
                name=(
                    "unique_pick_session_notification"
                ),
            ),
        ]

    def __str__(self):
        return (
            f"{self.user}: "
            f"{self.get_kind_display()}"
        )
