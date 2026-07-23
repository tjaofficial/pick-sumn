import secrets
import string
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


def generate_friend_code():
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


class FriendshipStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    BLOCKED = "blocked", "Blocked"


class FriendRequestPrivacy(models.TextChoices):
    EVERYONE = "everyone", "Everyone"
    FRIENDS_OF_FRIENDS = (
        "friends_of_friends",
        "Friends of Friends",
    )
    NOBODY = "nobody", "Nobody"


class GroupInvitePrivacy(models.TextChoices):
    FRIENDS_ONLY = "friends_only", "Friends Only"
    NOBODY = "nobody", "Nobody"


class AppTheme(models.TextChoices):
    LIGHT = "light", "Light"
    DARK = "dark", "Dark"


class User(AbstractUser):
    """Primary account model for Pick Sum'N."""

    username = None

    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(
        upload_to="users/avatars/",
        blank=True,
        null=True,
    )
    friend_code = models.CharField(
        max_length=12,
        unique=True,
        blank=True,
        null=True,
        editable=False,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def save(self, *args, **kwargs):
        if not self.friend_code:
            candidate = generate_friend_code()

            while type(self).objects.filter(
                friend_code=candidate,
            ).exclude(pk=self.pk).exists():
                candidate = generate_friend_code()

            self.friend_code = candidate

        return super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name or self.email


class Friendship(models.Model):
    """A mutual friend relationship initiated by one user."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    from_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_friendships",
    )
    to_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_friendships",
    )
    status = models.CharField(
        max_length=20,
        choices=FriendshipStatus.choices,
        default=FriendshipStatus.PENDING,
    )
    blocked_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="blocked_friendships",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ("-updated_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("from_user", "to_user"),
                name="unique_directional_friendship",
            ),
            models.CheckConstraint(
                condition=~models.Q(from_user=models.F("to_user")),
                name="friendship_users_must_differ",
            ),
        ]

    def __str__(self):
        return (
            f"{self.from_user} -> {self.to_user}: "
            f"{self.get_status_display()}"
        )



class UserAppSettings(models.Model):
    """Per-user app, privacy, notification, and appearance settings."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="app_settings",
    )

    friend_request_privacy = models.CharField(
        max_length=30,
        choices=FriendRequestPrivacy.choices,
        default=FriendRequestPrivacy.EVERYONE,
    )

    group_invite_privacy = models.CharField(
        max_length=30,
        choices=GroupInvitePrivacy.choices,
        default=GroupInvitePrivacy.FRIENDS_ONLY,
    )

    notification_friend_requests = models.BooleanField(
        default=True,
    )
    notification_group_invites = models.BooleanField(
        default=True,
    )
    notification_pick_session_invites = models.BooleanField(
        default=True,
    )
    notification_group_vote_started = models.BooleanField(
        default=True,
    )
    notification_voting_reminders = models.BooleanField(
        default=True,
    )
    notification_session_results = models.BooleanField(
        default=True,
    )
    notification_general = models.BooleanField(
        default=True,
    )

    theme = models.CharField(
        max_length=20,
        choices=AppTheme.choices,
        default=AppTheme.LIGHT,
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
        return f"{self.user} app settings"



class FeedbackType(models.TextChoices):
    GENERAL = "general", "General Feedback"
    FEATURE = "feature", "Feature Request"
    BUG = "bug", "Report a Problem"
    SUPPORT = "support", "Help & Support"


class FeedbackSubmission(models.Model):
    """Feedback submitted by an authenticated Pick Sum'N user."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="feedback_submissions",
    )

    feedback_type = models.CharField(
        max_length=20,
        choices=FeedbackType.choices,
        default=FeedbackType.GENERAL,
    )

    message = models.TextField(
        max_length=3000,
    )

    may_contact = models.BooleanField(
        default=False,
    )

    status = models.CharField(
        max_length=20,
        default="new",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-created_at",
        )

    def __str__(self):
        return (
            f"{self.user} - "
            f"{self.get_feedback_type_display()}"
        )
