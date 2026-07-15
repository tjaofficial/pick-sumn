from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Profile
from .serializers import ProfileSerializer


class CurrentProfileView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = ProfileSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(
            user=self.request.user,
        )

        return profile