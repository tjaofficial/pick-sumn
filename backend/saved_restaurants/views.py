from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SavedRestaurant
from .serializers import SavedRestaurantSerializer


class SavedRestaurantListCreateView(APIView):
    permission_classes = (
        IsAuthenticated,
    )

    def get(self, request):
        saved_restaurants = (
            SavedRestaurant.objects
            .filter(user=request.user)
            .order_by("-saved_at")
        )

        serializer = SavedRestaurantSerializer(
            saved_restaurants,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = SavedRestaurantSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True,
        )

        saved_restaurant = serializer.save()

        response_serializer = (
            SavedRestaurantSerializer(
                saved_restaurant,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class SavedRestaurantDetailView(APIView):
    permission_classes = (
        IsAuthenticated,
    )

    def get(
        self,
        request,
        saved_restaurant_id,
    ):
        saved_restaurant = (
            SavedRestaurant.objects
            .filter(
                id=saved_restaurant_id,
                user=request.user,
            )
            .first()
        )

        if saved_restaurant is None:
            return Response(
                {
                    "detail": (
                        "Saved restaurant "
                        "was not found."
                    ),
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        serializer = SavedRestaurantSerializer(
            saved_restaurant,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def delete(
        self,
        request,
        saved_restaurant_id,
    ):
        saved_restaurant = (
            SavedRestaurant.objects
            .filter(
                id=saved_restaurant_id,
                user=request.user,
            )
            .first()
        )

        if saved_restaurant is None:
            return Response(
                {
                    "detail": (
                        "Saved restaurant "
                        "was not found."
                    ),
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        saved_restaurant.delete()

        return Response(
            status=(
                status
                .HTTP_204_NO_CONTENT
            ),
        )


class SavedRestaurantStatusView(APIView):
    permission_classes = (
        IsAuthenticated,
    )

    def get(self, request):
        external_id = (
            request.query_params
            .get(
                "external_id",
                "",
            )
            .strip()
        )

        if not external_id:
            return Response(
                {
                    "detail": (
                        "external_id is required."
                    ),
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        saved_restaurant = (
            SavedRestaurant.objects
            .filter(
                user=request.user,
                external_id=external_id,
            )
            .first()
        )

        if saved_restaurant is None:
            return Response(
                {
                    "is_saved": False,
                    "saved_restaurant": None,
                },
                status=status.HTTP_200_OK,
            )

        serializer = SavedRestaurantSerializer(
            saved_restaurant,
            context={
                "request": request,
            },
        )

        return Response(
            {
                "is_saved": True,
                "saved_restaurant": (
                    serializer.data
                ),
            },
            status=status.HTTP_200_OK,
        )


class SavedRestaurantDeleteByExternalIdView(
    APIView
):
    permission_classes = (
        IsAuthenticated,
    )

    def delete(self, request):
        external_id = (
            request.query_params
            .get(
                "external_id",
                "",
            )
            .strip()
        )

        if not external_id:
            return Response(
                {
                    "detail": (
                        "external_id is required."
                    ),
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        deleted_count, _ = (
            SavedRestaurant.objects
            .filter(
                user=request.user,
                external_id=external_id,
            )
            .delete()
        )

        if deleted_count == 0:
            return Response(
                {
                    "detail": (
                        "Saved restaurant "
                        "was not found."
                    ),
                },
                status=(
                    status
                    .HTTP_404_NOT_FOUND
                ),
            )

        return Response(
            status=(
                status
                .HTTP_204_NO_CONTENT
            ),
        )