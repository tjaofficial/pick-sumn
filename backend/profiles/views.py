from django.core.files.images import get_image_dimensions
from rest_framework import generics, parsers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import ProfileSerializer


MAX_IMAGE_BYTES = 8 * 1024 * 1024
MIN_IMAGE_DIMENSION = 128


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


class ProfileAvatarView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (
        parsers.MultiPartParser,
        parsers.FormParser,
    )

    def post(self, request):
        image = request.FILES.get("avatar")

        if not image:
            return Response(
                {
                    "avatar": (
                        "Choose an image to upload."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size > MAX_IMAGE_BYTES:
            return Response(
                {
                    "avatar": (
                        "The image must be 8 MB or smaller."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not image.content_type.startswith(
            "image/",
        ):
            return Response(
                {
                    "avatar": (
                        "The selected file must be an image."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            width, height = get_image_dimensions(
                image
            )
        except Exception:
            return Response(
                {
                    "avatar": (
                        "The selected image could not be read."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not width
            or not height
            or width < MIN_IMAGE_DIMENSION
            or height < MIN_IMAGE_DIMENSION
        ):
            return Response(
                {
                    "avatar": (
                        "The image must be at least "
                        "128 by 128 pixels."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        if user.avatar:
            user.avatar.delete(
                save=False,
            )

        user.avatar = image
        user.save(
            update_fields=(
                "avatar",
            ),
        )

        profile, _ = (
            Profile.objects.get_or_create(
                user=user,
            )
        )

        serializer = ProfileSerializer(
            profile,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
        )

    def delete(self, request):
        user = request.user

        if user.avatar:
            user.avatar.delete(
                save=False,
            )

            user.avatar = None

            user.save(
                update_fields=(
                    "avatar",
                ),
            )

        profile, _ = (
            Profile.objects.get_or_create(
                user=user,
            )
        )

        serializer = ProfileSerializer(
            profile,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
        )
