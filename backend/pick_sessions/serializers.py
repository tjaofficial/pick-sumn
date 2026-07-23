from rest_framework import serializers

from accounts.models import Friendship, FriendshipStatus
from accounts.serializers import UserSerializer
from django.db.models import Q
from dining_groups.models import DiningGroup
from preferences.models import Cuisine, DiningStyle

from .models import (
    DecisionMode,
    ParticipantStatus,
    PickSession,
    PickSessionNotification,
    SelectionMethod,
    PickSessionParticipant,
    PickSessionRestaurantOption,
    RestaurantDietaryReport,
)
from .services import create_pick_session


class PickSessionParticipantSerializer(
    serializers.ModelSerializer
):
    user = UserSerializer(read_only=True)

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = PickSessionParticipant

        fields = (
            "id",
            "user",
            "status",
            "status_display",
            "is_host",
            "is_current",
            "vetoes_used",
            "joined_at",
            "ready_at",
            "created_at",
        )


class PickSessionListSerializer(
    serializers.ModelSerializer
):
    group_name = serializers.CharField(
        source="group.name",
        read_only=True,
    )

    participant_count = serializers.IntegerField(
        source="active_participant_count",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    decision_mode_display = serializers.CharField(
        source="get_decision_mode_display",
        read_only=True,
    )

    is_host = serializers.SerializerMethodField()
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = PickSession

        fields = (
            "id",
            "title",
            "group",
            "group_name",
            "status",
            "status_display",
            "decision_mode",
            "decision_mode_display",
            "participant_count",
            "is_host",
            "is_current",
            "location_label",
            "search_radius_miles",
            "price_min",
            "price_max",
            "open_now",
            "something_new",
            "selected_restaurant_external_id",
            "selected_restaurant_name",
            "selected_restaurant_data",
            "selection_method",
            "selected_by",
            "selected_at",
            "created_at",
            "updated_at",
            "completed_at",
        )

    def get_is_host(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.participants.filter(
            user=request.user,
            is_host=True,
        ).exists()

    def get_is_current(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.participants.filter(
            user=request.user,
            is_current=True,
        ).exists()


class PickSessionDetailSerializer(
    PickSessionListSerializer
):
    participants = PickSessionParticipantSerializer(
        many=True,
        read_only=True,
    )

    cuisine_filters = serializers.SerializerMethodField()
    dining_style_filters = serializers.SerializerMethodField()

    class Meta(PickSessionListSerializer.Meta):
        fields = (
            PickSessionListSerializer.Meta.fields
            + (
                "latitude",
                "longitude",
                "include_delivery",
                "include_drive_through",
                "exclude_recent_days",
                "vetoes_per_participant",
                "expires_at",
                "started_at",
                "participants",
                "cuisine_filters",
                "dining_style_filters",
            )
        )

    def get_cuisine_filters(self, obj):
        return [
            {
                "id": item.cuisine_id,
                "name": item.cuisine.name,
                "slug": item.cuisine.slug,
            }
            for item in obj.cuisine_filters.select_related(
                "cuisine"
            )
        ]

    def get_dining_style_filters(self, obj):
        return [
            {
                "id": item.dining_style_id,
                "name": item.dining_style.name,
                "slug": item.dining_style.slug,
            }
            for item in obj.dining_style_filters.select_related(
                "dining_style"
            )
        ]


class PickSessionCreateSerializer(serializers.Serializer):
    group_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

    title = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=120,
    )

    decision_mode = serializers.ChoiceField(
        choices=DecisionMode.choices,
        default=DecisionMode.RANKED,
    )

    latitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
    )

    longitude = serializers.DecimalField(
        max_digits=9,
        decimal_places=6,
        required=False,
        allow_null=True,
    )

    location_label = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )

    search_radius_miles = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100,
    )

    price_min = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=4,
    )

    price_max = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=4,
    )

    open_now = serializers.BooleanField(
        required=False,
        default=True,
    )

    include_delivery = serializers.BooleanField(
        required=False,
        default=False,
    )

    include_drive_through = serializers.BooleanField(
        required=False,
        default=False,
    )

    something_new = serializers.BooleanField(
        required=False,
        default=False,
    )

    exclude_recent_days = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=365,
    )

    vetoes_per_participant = serializers.IntegerField(
        required=False,
        min_value=0,
        max_value=10,
    )

    cuisine_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

    dining_style_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False,
        min_length=1,
    )

    def validate(self, attrs):
        price_min = attrs.get("price_min")
        price_max = attrs.get("price_max")

        if (
            price_min is not None
            and price_max is not None
            and price_min > price_max
        ):
            raise serializers.ValidationError(
                {
                    "price_max": (
                        "Maximum price cannot be lower than "
                        "minimum price."
                    )
                }
            )

        request = self.context["request"]

        group_id = attrs.get("group_id")
        group = None

        if group_id:
            group = DiningGroup.objects.filter(
                id=group_id,
                is_active=True,
                memberships__user=request.user,
                memberships__is_active=True,
            ).first()

            if not group:
                raise serializers.ValidationError(
                    {
                        "group_id": (
                            "You are not an active member "
                            "of this group."
                        )
                    }
                )


            attrs["group"] = group

        participant_ids = attrs.get(
            "participant_ids",
            [],
        )

        participant_users = []

        if group:
            memberships = (
                group.memberships.filter(
                    is_active=True,
                    user_id__in=participant_ids,
                )
                .select_related("user")
            )

            participant_users = [
                membership.user
                for membership in memberships
            ]

            valid_ids = {
                user.id
                for user in participant_users
            }

            requested_ids = set(participant_ids)
            requested_ids.discard(request.user.id)

            if valid_ids != requested_ids:
                raise serializers.ValidationError(
                    {
                        "participant_ids": (
                            "One or more selected users are not "
                            "active members of this group."
                        )
                    }
                )

        if participant_ids and not group:
            requested_ids = set(participant_ids)
            requested_ids.discard(request.user.id)

            friendships = Friendship.objects.filter(
                Q(
                    from_user=request.user,
                    to_user_id__in=requested_ids,
                    status=FriendshipStatus.ACCEPTED,
                )
                | Q(
                    to_user=request.user,
                    from_user_id__in=requested_ids,
                    status=FriendshipStatus.ACCEPTED,
                )
            ).select_related("from_user", "to_user")

            friend_users = [
                friendship.to_user
                if friendship.from_user_id == request.user.id
                else friendship.from_user
                for friendship in friendships
            ]

            if {user.id for user in friend_users} != requested_ids:
                raise serializers.ValidationError(
                    {
                        "participant_ids": (
                            "One or more selected participants "
                            "are not accepted friends."
                        )
                    }
                )

            participant_users = friend_users

        attrs["participant_users"] = participant_users

        cuisine_ids = attrs.get("cuisine_ids", [])

        cuisines = list(
            Cuisine.objects.filter(
                id__in=cuisine_ids,
                is_active=True,
            )
        )

        if len(cuisines) != len(set(cuisine_ids)):
            raise serializers.ValidationError(
                {
                    "cuisine_ids": (
                        "One or more cuisines are invalid."
                    )
                }
            )

        attrs["cuisine_filters"] = cuisines

        dining_style_ids = attrs.get(
            "dining_style_ids",
            [],
        )

        dining_styles = list(
            DiningStyle.objects.filter(
                id__in=dining_style_ids,
                is_active=True,
            )
        )

        if (
            not dining_styles
            or len(dining_styles)
            != len(set(dining_style_ids))
        ):
            raise serializers.ValidationError(
                {
                    "dining_style_ids": (
                        "Choose at least one valid dining style."
                    )
                }
            )

        attrs["dining_style_filters"] = (
            dining_styles
        )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        validated_data.pop("group_id", None)
        validated_data.pop("participant_ids", None)
        validated_data.pop("cuisine_ids", None)
        validated_data.pop(
            "dining_style_ids",
            None,
        )

        group = validated_data.pop("group", None)

        participant_users = validated_data.pop(
            "participant_users",
            [],
        )

        cuisine_filters = validated_data.pop(
            "cuisine_filters",
            [],
        )

        dining_style_filters = (
            validated_data.pop(
                "dining_style_filters",
                [],
            )
        )

        return create_pick_session(
            created_by=request.user,
            group=group,
            participant_users=participant_users,
            cuisine_filters=cuisine_filters,
            dining_style_filters=(
                dining_style_filters
            ),
            **validated_data,
        )


class SelectRestaurantSerializer(
    serializers.Serializer
):
    external_id = serializers.CharField(
        max_length=255,
    )

    selection_method = serializers.ChoiceField(
        choices=SelectionMethod.choices,
    )


class UpdateParticipantStatusSerializer(
    serializers.Serializer
):
    status = serializers.ChoiceField(
        choices=(
            ParticipantStatus.JOINED,
            ParticipantStatus.READY,
            ParticipantStatus.DECLINED,
            ParticipantStatus.LEFT,
        )
    )



class GroupVoteOptionSerializer(
    serializers.ModelSerializer
):
    vote_count = serializers.IntegerField(
        read_only=True,
    )

    restaurant = serializers.JSONField(
        source="restaurant_data",
        read_only=True,
    )

    class Meta:
        model = PickSessionRestaurantOption

        fields = (
            "id",
            "external_id",
            "name",
            "rank",
            "match_score",
            "vote_count",
            "restaurant",
        )


class SubmitGroupVoteSerializer(
    serializers.Serializer
):
    option_id = serializers.UUIDField()



class PickSessionNotificationSerializer(
    serializers.ModelSerializer
):
    session_id = serializers.UUIDField(
        source="session.id",
        read_only=True,
    )

    session_status = serializers.CharField(
        source="session.status",
        read_only=True,
    )

    decision_mode = serializers.CharField(
        source="session.decision_mode",
        read_only=True,
    )

    selected_restaurant_external_id = (
        serializers.CharField(
            source=(
                "session.selected_restaurant_external_id"
            ),
            read_only=True,
        )
    )

    selected_restaurant_name = (
        serializers.CharField(
            source=(
                "session.selected_restaurant_name"
            ),
            read_only=True,
        )
    )

    selected_restaurant_data = (
        serializers.JSONField(
            source=(
                "session.selected_restaurant_data"
            ),
            read_only=True,
        )
    )

    class Meta:
        model = PickSessionNotification

        fields = (
            "id",
            "kind",
            "title",
            "message",
            "is_read",
            "created_at",
            "read_at",
            "session_id",
            "session_status",
            "decision_mode",
            "selected_restaurant_external_id",
            "selected_restaurant_name",
            "selected_restaurant_data",
        )


class RestaurantDietaryReportSerializer(
    serializers.ModelSerializer
):
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantDietaryReport
        fields = (
            "id",
            "external_place_id",
            "restaurant_name",
            "dietary_slug",
            "outcome",
            "items_clearly_labeled",
            "staff_understood",
            "dedicated_fryer",
            "separate_preparation_area",
            "gloves_changed",
            "cross_contact_concern",
            "restaurant_could_not_accommodate",
            "reaction_after_eating",
            "notes",
            "visited_at",
            "user_display_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user_display_name",
            "created_at",
            "updated_at",
        )

    def get_user_display_name(self, obj):
        return (
            getattr(
                obj.user,
                "display_name",
                "",
            )
            or obj.user.get_full_name()
            or "Pick Sum’N member"
        )

    def validate_dietary_slug(self, value):
        return (
            value.strip()
            .lower()
            .replace("_", "-")
            .replace(" ", "-")
        )

    def validate(self, attrs):
        outcome = attrs.get(
            "outcome"
        )

        if outcome == "reaction":
            attrs[
                "reaction_after_eating"
            ] = True

        if outcome == "not_accommodated":
            attrs[
                "restaurant_could_not_accommodate"
            ] = True

        if (
            attrs.get(
                "reaction_after_eating"
            )
            and not attrs.get(
                "cross_contact_concern"
            )
        ):
            attrs[
                "cross_contact_concern"
            ] = True

        return attrs
