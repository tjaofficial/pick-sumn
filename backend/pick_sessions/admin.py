from collections import Counter
from datetime import datetime, time, timedelta

from django.contrib import admin
from django.db.models import Count
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone

from .models import (
    PickSession,
    PickSessionAnalyticsEvent,
    PickSessionAnalyticsEventType,
    PickSessionCuisineFilter,
    PickSessionParticipant,
    RestaurantDietaryEvidence,
    RestaurantDietaryProfile,
    RestaurantDietaryReport,
)


class PickSessionParticipantInline(admin.TabularInline):
    model = PickSessionParticipant
    extra = 0
    autocomplete_fields = ("user",)


class PickSessionCuisineFilterInline(admin.TabularInline):
    model = PickSessionCuisineFilter
    extra = 0
    autocomplete_fields = ("cuisine",)


@admin.register(PickSession)
class PickSessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "created_by",
        "group",
        "status",
        "decision_mode",
        "participant_count",
        "created_at",
    )

    list_filter = (
        "status",
        "decision_mode",
        "open_now",
        "something_new",
    )

    search_fields = (
        "title",
        "created_by__email",
        "created_by__display_name",
        "group__name",
        "location_label",
    )

    autocomplete_fields = (
        "created_by",
        "group",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    inlines = (
        PickSessionParticipantInline,
        PickSessionCuisineFilterInline,
    )


@admin.register(PickSessionParticipant)
class PickSessionParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "session",
        "user",
        "status",
        "is_host",
        "vetoes_used",
        "joined_at",
    )

    list_filter = (
        "status",
        "is_host",
    )

    search_fields = (
        "session__title",
        "user__email",
        "user__display_name",
    )

    autocomplete_fields = (
        "session",
        "user",
    )


@admin.register(PickSessionCuisineFilter)
class PickSessionCuisineFilterAdmin(admin.ModelAdmin):
    list_display = (
        "session",
        "cuisine",
    )

    autocomplete_fields = (
        "session",
        "cuisine",
    )



@admin.register(PickSessionAnalyticsEvent)
class PickSessionAnalyticsEventAdmin(admin.ModelAdmin):
    change_list_template = (
        "admin/pick_sessions/analytics_event_changelist.html"
    )

    list_display = (
        "event_type",
        "restaurant_name",
        "user",
        "session",
        "created_at",
    )

    list_filter = (
        "event_type",
        "created_at",
    )

    search_fields = (
        "restaurant_name",
        "restaurant_external_id",
        "user__email",
        "user__display_name",
        "session__title",
        "session__location_label",
    )

    autocomplete_fields = (
        "session",
        "user",
    )

    readonly_fields = (
        "id",
        "session",
        "user",
        "event_type",
        "restaurant_external_id",
        "restaurant_name",
        "event_data",
        "dedupe_key",
        "created_at",
    )

    ordering = (
        "-created_at",
    )

    def has_add_permission(self, request):
        return False

    def get_urls(self):
        urls = super().get_urls()

        custom_urls = [
            path(
                "dashboard/",
                self.admin_site.admin_view(
                    self.analytics_dashboard,
                ),
                name="pick_sessions_analytics_dashboard",
            ),
        ]

        return custom_urls + urls

    def analytics_dashboard(self, request):
        today = timezone.localdate()

        start_date = self._parse_date(
            request.GET.get("start_date"),
            today - timedelta(days=29),
        )
        end_date = self._parse_date(
            request.GET.get("end_date"),
            today,
        )

        if start_date > end_date:
            start_date, end_date = end_date, start_date

        start_at = timezone.make_aware(
            datetime.combine(start_date, time.min),
            timezone.get_current_timezone(),
        )
        end_at = timezone.make_aware(
            datetime.combine(
                end_date + timedelta(days=1),
                time.min,
            ),
            timezone.get_current_timezone(),
        )

        restaurant_query = (
            request.GET.get("restaurant", "").strip()
        )
        event_type_filter = (
            request.GET.get("event_type", "").strip()
        )

        queryset = (
            PickSessionAnalyticsEvent.objects
            .filter(
                created_at__gte=start_at,
                created_at__lt=end_at,
            )
            .select_related(
                "session",
                "user",
            )
        )

        if restaurant_query:
            queryset = queryset.filter(
                restaurant_name__icontains=restaurant_query,
            )

        valid_event_types = {
            value
            for value, _label
            in PickSessionAnalyticsEventType.choices
        }

        if (
            event_type_filter
            and event_type_filter in valid_event_types
        ):
            queryset = queryset.filter(
                event_type=event_type_filter,
            )

        counts = {
            item["event_type"]: item["total"]
            for item in queryset.values(
                "event_type",
            ).annotate(
                total=Count("id"),
            )
        }

        searches = counts.get(
            PickSessionAnalyticsEventType.SEARCH_STARTED,
            0,
        )
        impressions = counts.get(
            PickSessionAnalyticsEventType.RESTAURANT_IMPRESSION,
            0,
        )
        detail_views = counts.get(
            PickSessionAnalyticsEventType.RESTAURANT_DETAIL_VIEWED,
            0,
        )
        selections = counts.get(
            PickSessionAnalyticsEventType.RESTAURANT_SELECTED,
            0,
        )
        confirmed_visits = counts.get(
            "confirmed_visit",
            0,
        )

        selection_events = list(
            queryset.filter(
                event_type=(
                    PickSessionAnalyticsEventType
                    .RESTAURANT_SELECTED
                ),
            ).values(
                "restaurant_name",
                "restaurant_external_id",
                "event_data",
            )
        )

        represented_diners = sum(
            self._safe_int(
                (event.get("event_data") or {}).get(
                    "participant_count",
                    0,
                ),
            )
            for event in selection_events
        )

        visit_rate = (
            round(
                confirmed_visits
                / represented_diners
                * 100,
                1,
            )
            if represented_diners
            else 0
        )

        average_group_size = (
            round(
                represented_diners / selections,
                1,
            )
            if selections
            else 0
        )

        top_restaurants = list(
            queryset.filter(
                event_type=(
                    PickSessionAnalyticsEventType
                    .RESTAURANT_SELECTED
                ),
            )
            .exclude(
                restaurant_name="",
            )
            .values(
                "restaurant_name",
                "restaurant_external_id",
            )
            .annotate(
                selections=Count("id"),
            )
            .order_by(
                "-selections",
                "restaurant_name",
            )[:10]
        )

        cuisine_counter = Counter()

        for event in queryset.filter(
            event_type=(
                PickSessionAnalyticsEventType
                .SEARCH_STARTED
            ),
        ).values("event_data"):
            for cuisine in (
                (event.get("event_data") or {})
                .get("cuisines", [])
            ):
                cuisine_name = str(cuisine).strip()

                if cuisine_name:
                    cuisine_counter[cuisine_name] += 1

        top_cuisines = [
            {
                "name": name,
                "searches": total,
            }
            for name, total
            in cuisine_counter.most_common(10)
        ]

        selection_method_counter = Counter()

        for event in selection_events:
            method = str(
                (event.get("event_data") or {})
                .get("selection_method", "")
            ).strip()

            if method:
                selection_method_counter[method] += 1

        selection_methods = [
            {
                "name": self._humanize(name),
                "count": total,
            }
            for name, total
            in selection_method_counter.most_common()
        ]

        feedback_counter = Counter()

        for event in queryset.filter(
            event_type=(
                "restaurant_feedback"
            ),
        ).values("event_data"):
            feedback = str(
                (event.get("event_data") or {})
                .get("feedback", "")
            ).strip()

            if feedback:
                feedback_counter[feedback] += 1

        feedback_breakdown = [
            {
                "name": self._humanize(name),
                "count": total,
            }
            for name, total
            in feedback_counter.most_common()
        ]

        context = {
            **self.admin_site.each_context(request),
            "title": "Pick Sum’N Analytics",
            "opts": self.model._meta,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "restaurant_query": restaurant_query,
            "event_type_filter": event_type_filter,
            "event_type_choices": (
                PickSessionAnalyticsEventType.choices
            ),
            "searches": searches,
            "impressions": impressions,
            "detail_views": detail_views,
            "selections": selections,
            "confirmed_visits": confirmed_visits,
            "represented_diners": represented_diners,
            "visit_rate": visit_rate,
            "average_group_size": average_group_size,
            "top_restaurants": top_restaurants,
            "top_cuisines": top_cuisines,
            "selection_methods": selection_methods,
            "feedback_breakdown": feedback_breakdown,
            "recent_events": queryset.order_by(
                "-created_at",
            )[:50],
            "generated_at": timezone.now(),
        }

        return TemplateResponse(
            request,
            "admin/pick_sessions/analytics_dashboard.html",
            context,
        )

    @staticmethod
    def _parse_date(value, fallback):
        if not value:
            return fallback

        try:
            return datetime.strptime(
                value,
                "%Y-%m-%d",
            ).date()
        except ValueError:
            return fallback

    @staticmethod
    def _safe_int(value):
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _humanize(value):
        return (
            str(value or "")
            .replace("_", " ")
            .strip()
            .title()
        )


class RestaurantDietaryEvidenceInline(admin.TabularInline):
    model = RestaurantDietaryEvidence
    extra = 0
    readonly_fields = (
        "source_type",
        "claim_type",
        "summary",
        "source_url",
        "confidence",
        "observed_at",
        "expires_at",
        "created_at",
    )
    can_delete = False


@admin.register(RestaurantDietaryProfile)
class RestaurantDietaryProfileAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant_name",
        "external_place_id",
        "dietary_slug",
        "confidence_score",
        "dedicated_facility",
        "official_menu_found",
        "status",
        "last_checked_at",
        "expires_at",
    )

    list_filter = (
        "dietary_slug",
        "status",
        "dedicated_facility",
        "official_menu_found",
    )

    search_fields = (
        "restaurant_name",
        "external_place_id",
        "dietary_slug",
        "official_source_url",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    inlines = (
        RestaurantDietaryEvidenceInline,
    )


@admin.register(RestaurantDietaryEvidence)
class RestaurantDietaryEvidenceAdmin(admin.ModelAdmin):
    list_display = (
        "profile",
        "source_type",
        "claim_type",
        "confidence",
        "observed_at",
        "expires_at",
    )

    list_filter = (
        "source_type",
        "claim_type",
    )

    search_fields = (
        "profile__restaurant_name",
        "profile__external_place_id",
        "summary",
        "source_url",
    )

    autocomplete_fields = (
        "profile",
    )


@admin.register(RestaurantDietaryReport)
class RestaurantDietaryReportAdmin(admin.ModelAdmin):
    list_display = (
        "restaurant_name",
        "dietary_slug",
        "user",
        "outcome",
        "cross_contact_concern",
        "reaction_after_eating",
        "moderation_status",
        "updated_at",
    )

    list_filter = (
        "dietary_slug",
        "outcome",
        "moderation_status",
        "items_clearly_labeled",
        "staff_understood",
        "dedicated_fryer",
        "separate_preparation_area",
        "cross_contact_concern",
        "reaction_after_eating",
    )

    search_fields = (
        "restaurant_name",
        "external_place_id",
        "dietary_slug",
        "user__email",
        "user__display_name",
        "notes",
    )

    autocomplete_fields = (
        "user",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )
