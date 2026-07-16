import secrets
import string
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


def generate_join_code():
    """Generate a short human-friendly group join code."""

    alphabet = string.ascii_uppercase + string.digits

    return "".join(
        secrets.choice(alphabet)
        for _ in range(7)
    )


class GroupType(models.TextChoices):
    PERMANENT = "permanent", "Permanent"
    TEMPORARY = "temporary", "Temporary"


class GroupRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"


class InvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    EXPIRED = "expired", "Expired"
    CANCELLED = "cancelled", "Cancelled"


class DiningGroup(models.Model):
    """A permanent or temporary collection of diners."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=120,
    )

    description = models.CharField(
        max_length=255,
        blank=True,
    )

    image = models.ImageField(
        upload_to="groups/images/",
        blank=True,
        null=True,
    )

    group_type = models.CharField(
        max_length=20,
        choices=GroupType.choices,
        default=GroupType.PERMANENT,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_dining_groups",
    )

    join_code = models.CharField(
        max_length=12,
        unique=True,
        default=generate_join_code,
        editable=False,
    )

    is_active = models.BooleanField(
        default=True,
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Optional expiration time for temporary groups.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ("-updated_at", "name")

    def __str__(self):
        return self.name

    @property
    def is_temporary(self):
        return self.group_type == GroupType.TEMPORARY

    @property
    def is_expired(self):
        return bool(
            self.expires_at
            and self.expires_at <= timezone.now()
        )


class DiningGroupMember(models.Model):
    """A user's membership and role inside a dining group."""

    group = models.ForeignKey(
        DiningGroup,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dining_group_memberships",
    )

    role = models.CharField(
        max_length=20,
        choices=GroupRole.choices,
        default=GroupRole.MEMBER,
    )

    nickname = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional display name used inside this group.",
    )

    is_active = models.BooleanField(
        default=True,
    )

    joined_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ("group", "joined_at")
        constraints = [
            models.UniqueConstraint(
                fields=("group", "user"),
                name="unique_dining_group_member",
            ),
        ]

    def __str__(self):
        return f"{self.user} in {self.group}"


class DiningGroupInvitation(models.Model):
    """An invitation for someone to join a dining group."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    group = models.ForeignKey(
        DiningGroup,
        on_delete=models.CASCADE,
        related_name="invitations",
    )

    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_dining_group_invitations",
    )

    invited_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_dining_group_invitations",
        blank=True,
        null=True,
    )

    invited_email = models.EmailField(
        blank=True,
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        default=secrets.token_urlsafe,
        editable=False,
    )

    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    responded_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        invitee = (
            self.invited_user
            or self.invited_email
            or "Unknown invitee"
        )

        return f"{invitee} invited to {self.group}"

    @property
    def is_expired(self):
        return bool(
            self.expires_at
            and self.expires_at <= timezone.now()
        )