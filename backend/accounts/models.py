from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Primary account model for Pick Sum'N."""

    username = None

    email = models.EmailField(
        unique=True,
    )

    display_name = models.CharField(
        max_length=100,
        blank=True,
    )

    avatar = models.ImageField(
        upload_to="users/avatars/",
        blank=True,
        null=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.display_name or self.email