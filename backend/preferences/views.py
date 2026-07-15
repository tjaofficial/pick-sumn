from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from profiles.services import calculate_profile_completion

from .models import (
    Cuisine,
    DietaryTag,
    DiningStyle,
    FoodDislike,
    UserCuisinePreference,
    UserDietaryPreference,
    UserDiningStylePreference,
    UserFoodDislike,
)
from .serializers import (
    CurrentPreferencesSerializer,
    PreferenceOptionsSerializer,
)
from .services import replace_user_preferences


def get_current_preference_data(user):
    return {
        "cuisines": (
            UserCuisinePreference.objects
            .filter(user=user)
            .select_related("cuisine")
        ),
        "dining_styles": (
            UserDiningStylePreference.objects
            .filter(user=user)
            .select_related("dining_style")
        ),
        "dietary_preferences": (
            UserDietaryPreference.objects
            .filter(user=user)
            .select_related("dietary_tag")
        ),
        "food_dislikes": (
            UserFoodDislike.objects
            .filter(user=user)
            .select_related("food_dislike")
        ),
    }


class PreferenceOptionsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        data = {
            "cuisines": Cuisine.objects.filter(
                is_active=True,
            ),
            "dining_styles": DiningStyle.objects.filter(
                is_active=True,
            ),
            "dietary_tags": DietaryTag.objects.filter(
                is_active=True,
            ),
            "food_dislikes": FoodDislike.objects.filter(
                is_active=True,
            ),
        }

        serializer = PreferenceOptionsSerializer(data)

        return Response(serializer.data)


class CurrentPreferencesView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = CurrentPreferencesSerializer(
            get_current_preference_data(request.user)
        )

        completion = calculate_profile_completion(
            request.user
        )

        return Response(
            {
                **serializer.data,
                "completion_percentage": (
                    completion.percentage
                ),
                "missing_sections": (
                    completion.missing_sections
                ),
            }
        )

    def put(self, request):
        serializer = CurrentPreferencesSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        replace_user_preferences(
            user=request.user,
            **serializer.validated_data,
        )

        profile = request.user.profile

        profile.dietary_section_completed = True
        profile.dislikes_section_completed = True

        profile.save(
            update_fields=(
                "dietary_section_completed",
                "dislikes_section_completed",
                "updated_at",
            )
        )

        response_serializer = CurrentPreferencesSerializer(
            get_current_preference_data(request.user)
        )

        completion = calculate_profile_completion(
            request.user
        )

        return Response(
            {
                **response_serializer.data,
                "completion_percentage": (
                    completion.percentage
                ),
                "missing_sections": (
                    completion.missing_sections
                ),
            },
            status=status.HTTP_200_OK,
        )