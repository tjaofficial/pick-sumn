from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    DiningGroup,
    DiningGroupMember,
    GroupRole,
)
from .permissions import (
    IsDiningGroupMember,
    IsDiningGroupOwnerOrAdmin,
)
from .serializers import (
    DiningGroupCreateSerializer,
    DiningGroupDetailSerializer,
    DiningGroupListSerializer,
    JoinGroupSerializer,
)


class DiningGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (
        IsAuthenticated,
    )

    lookup_field = "id"

    def get_queryset(self):
        user_group_ids = (
            DiningGroupMember.objects.filter(
                user=self.request.user,
                is_active=True,
                group__is_active=True,
            )
            .values_list(
                "group_id",
                flat=True,
            )
        )

        return (
            DiningGroup.objects.filter(
                id__in=user_group_ids,
                is_active=True,
            )
            .select_related(
                "created_by",
            )
            .annotate(
                member_count=Count(
                    "memberships",
                    filter=Q(
                        memberships__is_active=True,
                    ),
                    distinct=True,
                ),
            )
            .distinct()
        )

    def get_serializer_class(self):
        if self.action == "create":
            return DiningGroupCreateSerializer

        if self.action == "retrieve":
            return DiningGroupDetailSerializer

        if self.action == "join":
            return JoinGroupSerializer

        return DiningGroupListSerializer

    def get_permissions(self):
        if self.action in (
            "update",
            "partial_update",
            "destroy",
        ):
            permission_classes = (
                IsAuthenticated,
                IsDiningGroupOwnerOrAdmin,
            )
        elif self.action in (
            "retrieve",
            "leave",
        ):
            permission_classes = (
                IsAuthenticated,
                IsDiningGroupMember,
            )
        else:
            permission_classes = (
                IsAuthenticated,
            )

        return [
            permission()
            for permission in permission_classes
        ]

    def create(
        self,
        request,
        *args,
        **kwargs,
    ):
        create_serializer = (
            DiningGroupCreateSerializer(
                data=request.data,
                context={
                    "request": request,
                },
            )
        )

        create_serializer.is_valid(
            raise_exception=True,
        )

        group = create_serializer.save()

        group = (
            DiningGroup.objects.filter(
                id=group.id,
            )
            .select_related(
                "created_by",
            )
            .annotate(
                member_count=Count(
                    "memberships",
                    filter=Q(
                        memberships__is_active=True,
                    ),
                    distinct=True,
                ),
            )
            .get()
        )

        response_serializer = (
            DiningGroupDetailSerializer(
                group,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    def perform_destroy(
        self,
        instance,
    ):
        instance.is_active = False

        instance.save(
            update_fields=(
                "is_active",
                "updated_at",
            ),
        )

    @action(
        detail=False,
        methods=("post",),
        url_path="join",
    )
    @transaction.atomic
    def join(
        self,
        request,
    ):
        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        join_code = (
            serializer.validated_data[
                "join_code"
            ]
        )

        group = get_object_or_404(
            DiningGroup,
            join_code=join_code,
            is_active=True,
        )

        if group.is_expired:
            return Response(
                {
                    "detail": (
                        "This group has expired."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership, created = (
            DiningGroupMember.objects.get_or_create(
                group=group,
                user=request.user,
                defaults={
                    "role": GroupRole.MEMBER,
                    "is_active": True,
                },
            )
        )

        if (
            not created
            and membership.is_active
        ):
            return Response(
                {
                    "detail": (
                        "You are already a member "
                        "of this group."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not created:
            membership.is_active = True
            membership.role = (
                GroupRole.MEMBER
            )

            membership.save(
                update_fields=(
                    "is_active",
                    "role",
                ),
            )

        group = (
            DiningGroup.objects.filter(
                id=group.id,
            )
            .select_related(
                "created_by",
            )
            .annotate(
                member_count=Count(
                    "memberships",
                    filter=Q(
                        memberships__is_active=True,
                    ),
                    distinct=True,
                ),
            )
            .get()
        )

        response_serializer = (
            DiningGroupDetailSerializer(
                group,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            response_serializer.data,
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    @action(
        detail=True,
        methods=("post",),
        url_path="leave",
    )
    @transaction.atomic
    def leave(
        self,
        request,
        id=None,
    ):
        group = self.get_object()

        membership = get_object_or_404(
            DiningGroupMember,
            group=group,
            user=request.user,
            is_active=True,
        )

        if membership.role == GroupRole.OWNER:
            other_active_members = (
                group.memberships.filter(
                    is_active=True,
                )
                .exclude(
                    user=request.user,
                )
                .exists()
            )

            if other_active_members:
                return Response(
                    {
                        "detail": (
                            "The owner must transfer "
                            "ownership before leaving "
                            "the group."
                        ),
                    },
                    status=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                )

            group.is_active = False

            group.save(
                update_fields=(
                    "is_active",
                    "updated_at",
                ),
            )

        membership.is_active = False

        membership.save(
            update_fields=(
                "is_active",
            ),
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )