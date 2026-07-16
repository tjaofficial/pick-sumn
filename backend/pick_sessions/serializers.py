from rest_framework import serializers

from accounts.serializers import UserSerializer
from dining_groups.models import DiningGroup
from preferences.models import Cuisine

from .models import (
    DecisionMode,
    ParticipantStatus,
    PickSession,
    PickSessionParticipant,
    PickSessionRestaurantOption,
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
            "selected_restaurant_name",
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

            if group.is_expired:
                raise serializers.ValidationError(
                    {
                        "group_id": "This group has expired."
                    }
                )

            attrs["group"] = group

        participant_ids = attrs.get(
            "participant_ids",
            [],
        )

        if participant_ids and not group:
            raise serializers.ValidationError(
                {
                    "participant_ids": (
                        "A group is required when selecting "
                        "additional participants."
                    )
                }
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

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        validated_data.pop("group_id", None)
        validated_data.pop("participant_ids", None)
        validated_data.pop("cuisine_ids", None)

        group = validated_data.pop("group", None)

        participant_users = validated_data.pop(
            "participant_users",
            [],
        )

        cuisine_filters = validated_data.pop(
            "cuisine_filters",
            [],
        )

        return create_pick_session(
            created_by=request.user,
            group=group,
            participant_users=participant_users,
            cuisine_filters=cuisine_filters,
            **validated_data,
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
