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


class SelectionMethod(models.TextChoices):
    RANKED_MANUAL = (
        "ranked_manual",
        "Ranked Results - Manual Selection",
    )
    SURPRISE_ME = (
        "surprise_me",
        "Surprise Me",
    )
    GROUP_VOTE = (
        "group_vote",
        "Group Vote",
    )
    ROULETTE = (
        "roulette",
        "Restaurant Roulette",
    )
    SWIPE = (
        "swipe",
        "Swipe Mode",
    )
    ELIMINATION = (
        "elimination",
        "Elimination Mode",
    )


class ParticipantStatus(models.TextChoices):
    INVITED = "invited", "Invited"
    JOINED = "joined", "Joined"
    READY = "ready", "Ready"
    DECLINED = "declined", "Declined"
    LEFT = "left", "Left"


class PickVisitFeedback(models.TextChoices):
    GOOD_PICK = "good_pick", "Good Pick"
    NOT_FOR_ME = "not_for_me", "Not For Me"
    DIDNT_GO = "didnt_go", "Didn't Go"


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

    selected_restaurant_data = models.JSONField(
        default=dict,
        blank=True,
    )

    selection_method = models.CharField(
        max_length=30,
        choices=SelectionMethod.choices,
        blank=True,
    )

    selected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="restaurant_selections",
        blank=True,
        null=True,
    )

    selected_at = models.DateTimeField(
        blank=True,
        null=True,
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

    visit_feedback = models.CharField(
        max_length=20,
        choices=PickVisitFeedback.choices,
        blank=True,
    )

    visit_feedback_at = models.DateTimeField(
        blank=True,
        null=True,
    )

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



class PickSessionDiningStyleFilter(models.Model):
    """Dining styles selected specifically for one Pick Session."""

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="dining_style_filters",
    )

    dining_style = models.ForeignKey(
        "preferences.DiningStyle",
        on_delete=models.CASCADE,
        related_name="pick_session_filters",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("session", "dining_style"),
                name="unique_pick_session_dining_style_filter",
            ),
        ]

    def __str__(self):
        return f"{self.session} — {self.dining_style}"


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

    GROUP_VOTE_STARTED = (
        "group_vote_started",
        "Group Vote Started",
    )

    GROUP_VOTE_COMPLETED = (
        "group_vote_completed",
        "Group Vote Completed",
    )


    RESTAURANT_SELECTED = (
        "restaurant_selected",
        "Restaurant Selected",
    )

    DIETARY_FEEDBACK = (
        "dietary_feedback",
        "Dietary Experience Feedback",
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

    dietary_slug = models.SlugField(
        max_length=120,
        blank=True,
        default="",
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
                    "dietary_slug",
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


class PickSessionAnalyticsEventType(
    models.TextChoices
):
    SEARCH_STARTED = (
        "search_started",
        "Search Started",
    )
    RESTAURANT_IMPRESSION = (
        "restaurant_impression",
        "Restaurant Impression",
    )
    RESTAURANT_DETAIL_VIEWED = (
        "restaurant_detail_viewed",
        "Restaurant Detail Viewed",
    )
    RESTAURANT_SELECTED = (
        "restaurant_selected",
        "Restaurant Selected",
    )
    VOTE_CAST = (
        "vote_cast",
        "Vote Cast",
    )
    SESSION_COMPLETED = (
        "session_completed",
        "Session Completed",
    )
    RESTAURANT_FEEDBACK = (
        "restaurant_feedback",
        "Restaurant Feedback",
    )
    CONFIRMED_VISIT = (
        "confirmed_visit",
        "Confirmed Visit",
    )


class PickSessionAnalyticsEvent(models.Model):
    """First-party product analytics for Pick Sum'N decisions."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    session = models.ForeignKey(
        PickSession,
        on_delete=models.CASCADE,
        related_name="analytics_events",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="pick_session_analytics_events",
        blank=True,
        null=True,
    )

    event_type = models.CharField(
        max_length=40,
        choices=PickSessionAnalyticsEventType.choices,
    )

    restaurant_external_id = models.CharField(
        max_length=255,
        blank=True,
    )

    restaurant_name = models.CharField(
        max_length=255,
        blank=True,
    )

    event_data = models.JSONField(
        default=dict,
        blank=True,
    )

    dedupe_key = models.CharField(
        max_length=500,
        unique=True,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = (
            "-created_at",
        )
        indexes = [
            models.Index(
                fields=(
                    "event_type",
                    "created_at",
                ),
            ),
            models.Index(
                fields=(
                    "restaurant_external_id",
                    "created_at",
                ),
            ),
        ]

    def __str__(self):
        return (
            f"{self.event_type}: "
            f"{self.restaurant_name or self.session_id}"
        )


class DietaryEvidenceSourceType(models.TextChoices):
    OFFICIAL_MENU = (
        "official_menu",
        "Official Menu",
    )
    OFFICIAL_SITE = (
        "official_site",
        "Official Website",
    )


class DietaryEvidenceStatus(models.TextChoices):
    FOUND = "found", "Evidence Found"
    NOT_FOUND = "not_found", "No Evidence Found"
    UNAVAILABLE = "unavailable", "Source Unavailable"
    ERROR = "error", "Analysis Error"


class RestaurantDietaryProfile(models.Model):
    """
    Cached Pick Sum'N analysis of a restaurant's official dietary
    information.

    Google review text is not stored here. This model only stores
    findings derived from the restaurant's official website or menu.
    """

    external_place_id = models.CharField(
        max_length=255,
    )

    restaurant_name = models.CharField(
        max_length=255,
        blank=True,
    )

    dietary_slug = models.SlugField(
        max_length=120,
    )

    confidence_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
    )

    dedicated_facility = models.BooleanField(
        default=False,
    )

    official_menu_found = models.BooleanField(
        default=False,
    )

    official_source_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    menu_items = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Short menu labels or item names found on the "
            "restaurant's official page."
        ),
    )

    status = models.CharField(
        max_length=20,
        choices=DietaryEvidenceStatus.choices,
        default=DietaryEvidenceStatus.NOT_FOUND,
    )

    last_checked_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    last_error = models.CharField(
        max_length=500,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-confidence_score",
            "restaurant_name",
            "dietary_slug",
        )

        constraints = [
            models.UniqueConstraint(
                fields=(
                    "external_place_id",
                    "dietary_slug",
                ),
                name=(
                    "unique_restaurant_dietary_profile"
                ),
            ),
        ]

        indexes = [
            models.Index(
                fields=(
                    "external_place_id",
                    "dietary_slug",
                ),
                name="pick_diet_place_slug_idx",
            ),
            models.Index(
                fields=("expires_at",),
                name="pick_diet_expires_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.restaurant_name or self.external_place_id} "
            f"— {self.dietary_slug}"
        )


class RestaurantDietaryEvidence(models.Model):
    """One official-source claim supporting a dietary profile."""

    profile = models.ForeignKey(
        RestaurantDietaryProfile,
        on_delete=models.CASCADE,
        related_name="evidence",
    )

    source_type = models.CharField(
        max_length=30,
        choices=DietaryEvidenceSourceType.choices,
    )

    claim_type = models.CharField(
        max_length=60,
    )

    summary = models.CharField(
        max_length=500,
    )

    source_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    confidence = models.PositiveSmallIntegerField(
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
    )

    observed_at = models.DateTimeField()

    expires_at = models.DateTimeField()

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = (
            "-confidence",
            "-observed_at",
        )

        indexes = [
            models.Index(
                fields=(
                    "profile",
                    "claim_type",
                ),
                name="pick_diet_claim_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.profile} — {self.claim_type}"
        )


class DietaryReportOutcome(models.TextChoices):
    ACCOMMODATED = (
        "accommodated",
        "Successfully Accommodated",
    )
    PARTIALLY_ACCOMMODATED = (
        "partially_accommodated",
        "Partially Accommodated",
    )
    NOT_ACCOMMODATED = (
        "not_accommodated",
        "Could Not Accommodate",
    )
    REACTION = (
        "reaction",
        "Reaction After Eating",
    )


class DietaryReportModerationStatus(models.TextChoices):
    VISIBLE = "visible", "Visible"
    HIDDEN = "hidden", "Hidden"
    FLAGGED = "flagged", "Flagged"


class RestaurantDietaryReport(models.Model):
    """
    A structured, location-specific Pick Sum'N community report.

    One user may maintain one current report for each restaurant and
    dietary need. Resubmitting updates that report instead of creating
    duplicates.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="restaurant_dietary_reports",
    )

    external_place_id = models.CharField(
        max_length=255,
    )

    restaurant_name = models.CharField(
        max_length=255,
    )

    dietary_slug = models.SlugField(
        max_length=120,
    )

    outcome = models.CharField(
        max_length=30,
        choices=DietaryReportOutcome.choices,
    )

    items_clearly_labeled = models.BooleanField(
        default=False,
    )

    staff_understood = models.BooleanField(
        default=False,
    )

    dedicated_fryer = models.BooleanField(
        default=False,
    )

    separate_preparation_area = models.BooleanField(
        default=False,
    )

    gloves_changed = models.BooleanField(
        default=False,
    )

    cross_contact_concern = models.BooleanField(
        default=False,
    )

    restaurant_could_not_accommodate = models.BooleanField(
        default=False,
    )

    reaction_after_eating = models.BooleanField(
        default=False,
    )

    notes = models.CharField(
        max_length=500,
        blank=True,
    )

    visited_at = models.DateField(
        blank=True,
        null=True,
    )

    moderation_status = models.CharField(
        max_length=20,
        choices=(
            DietaryReportModerationStatus
            .choices
        ),
        default=(
            DietaryReportModerationStatus
            .VISIBLE
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-updated_at",
        )

        constraints = [
            models.UniqueConstraint(
                fields=(
                    "user",
                    "external_place_id",
                    "dietary_slug",
                ),
                name=(
                    "unique_user_restaurant_dietary_report"
                ),
            ),
        ]

        indexes = [
            models.Index(
                fields=(
                    "external_place_id",
                    "dietary_slug",
                    "moderation_status",
                ),
                name="pick_report_place_slug_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} — {self.restaurant_name} "
            f"— {self.dietary_slug}"
        )
