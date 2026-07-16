from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .location_search import (
    GoogleLocationSearchError,
    get_location_details,
    search_location_suggestions,
)


class LocationSuggestionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        input_text = str(request.query_params.get("input") or "").strip()

        if len(input_text) < 2:
            return Response({"suggestions": []})

        try:
            suggestions = search_location_suggestions(input_text)
        except GoogleLocationSearchError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"suggestions": suggestions})


class LocationDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        place_id = str(request.query_params.get("place_id") or "").strip()

        if not place_id:
            return Response(
                {"detail": "A place_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            location = get_location_details(place_id)
        except GoogleLocationSearchError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(location)
