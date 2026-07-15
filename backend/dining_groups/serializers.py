from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import (
    DiningGroup,
    DiningGroupMember,
    GroupRole,
    GroupType,
)
from .services import create_dining_group


class DiningGroupMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    class Meta:
        model = DiningGroupMember
        fields = (
            "id",
            "user",
            "role",
            "role_display",
            "nickname",
            "is_active",
            "joined_at",
        )
        read_only_fields = (
            "id",
            "user",
            "role",
            "role_display",
            "joined_at",
        )


class DiningGroupListSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = DiningGroup
        fields = (
            "id",
            "name",
            "description",
            "group_type",
            "join_code",
            "member_count",
            "current_user_role",
            "is_active",
            "expires_at",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "join_code",
            "member_count",
            "current_user_role",
            "created_at",
            "updated_at",
        )

    def get_current_user_role(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        membership = obj.memberships.filter(
            user=request.user,
            is_active=True,
        ).first()

        return membership.role if membership else None


class DiningGroupDetailSerializer(DiningGroupListSerializer):
    members = serializers.SerializerMethodField()

    class Meta(DiningGroupListSerializer.Meta):
        fields = DiningGroupListSerializer.Meta.fields + (
            "members",
        )

    def get_members(self, obj):
        memberships = obj.memberships.filter(
            is_active=True,
        ).select_related("user")

        return DiningGroupMemberSerializer(
            memberships,
            many=True,
        ).data


class DiningGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiningGroup
        fields = (
            "name",
            "description",
            "group_type",
            "expires_at",
        )

    def validate(self, attrs):
        group_type = attrs.get(
            "group_type",
            GroupType.PERMANENT,
        )

        expires_at = attrs.get("expires_at")

        if (
            group_type == GroupType.PERMANENT
            and expires_at is not None
        ):
            raise serializers.ValidationError(
                {
                    "expires_at": (
                        "Permanent groups should not have "
                        "an expiration date."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]

        return create_dining_group(
            created_by=request.user,
            **validated_data,
        )


class JoinGroupSerializer(serializers.Serializer):
    join_code = serializers.CharField(
        max_length=12,
        trim_whitespace=True,
    )

    def validate_join_code(self, value):
        return value.strip().upper()