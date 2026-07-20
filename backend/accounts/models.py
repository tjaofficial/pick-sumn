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
