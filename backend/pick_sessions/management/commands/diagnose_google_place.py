from django.core.management.base import (
    BaseCommand,
    CommandError,
)

from pick_sessions.google_places import (
    GooglePlacesError,
    METERS_PER_MILE,
    _get_api_key,
    _get_localized_text,
    _perform_text_search_request,
)
from pick_sessions.models import PickSession


class Command(BaseCommand):
    help = (
        "Run an exact Google Places Text Search around "
        "an existing Pick Sum'N session."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "session_id",
            help="Pick session UUID.",
        )
        parser.add_argument(
            "query",
            help=(
                "Exact business name or diagnostic "
                "search text."
            ),
        )

    def handle(
        self,
        *args,
        **options,
    ):
        try:
            session = PickSession.objects.get(
                pk=options["session_id"]
            )
        except PickSession.DoesNotExist as error:
            raise CommandError(
                "Pick session was not found."
            ) from error

        if (
            session.latitude is None
            or session.longitude is None
        ):
            raise CommandError(
                "The session does not have coordinates."
            )

        try:
            places = (
                _perform_text_search_request(
                    api_key=_get_api_key(),
                    text_query=options["query"],
                    latitude=float(
                        session.latitude
                    ),
                    longitude=float(
                        session.longitude
                    ),
                    radius_meters=min(
                        float(
                            session
                            .search_radius_miles
                        )
                        * METERS_PER_MILE,
                        50000.0,
                    ),
                )
            )
        except GooglePlacesError as error:
            raise CommandError(
                str(error)
            ) from error

        if not places:
            self.stdout.write(
                self.style.WARNING(
                    "Google returned no places."
                )
            )
            return

        for index, place in enumerate(
            places,
            start=1,
        ):
            self.stdout.write(
                "\n"
                f"{index}. "
                f"{_get_localized_text(place.get('displayName'))}"
            )
            self.stdout.write(
                f"   id: {place.get('id', '')}"
            )
            self.stdout.write(
                "   address: "
                f"{place.get('formattedAddress', '')}"
            )
            self.stdout.write(
                "   primary_type: "
                f"{place.get('primaryType', '')}"
            )
            self.stdout.write(
                f"   types: {place.get('types', [])}"
            )
            self.stdout.write(
                "   business_status: "
                f"{place.get('businessStatus', '')}"
            )
            self.stdout.write(
                "   moved_place_id: "
                f"{place.get('movedPlaceId', '')}"
            )
