from django.core.files.images import get_image_dimensions
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404

from accounts.models import Friendship, FriendshipStatus
from rest_framework import parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    DiningGroup,
    DiningGroupInvitation,
    DiningGroupMember,
    GroupRole,
    InvitationStatus,
)
from .permissions import (
    IsDiningGroupMember,
    IsDiningGroupOwnerOrAdmin,
)
from .serializers import (
    DiningGroupCreateSerializer,
    DiningGroupDetailSerializer,
    DiningGroupInvitationSerializer,
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
            .order_by("name")
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
            "image",
            "invite_friends",
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
        url_path="invite-friends",
    )
    @transaction.atomic
    def invite_friends(self, request, id=None):
        group = self.get_object()
        user_ids = request.data.get("user_ids", [])

        if not isinstance(user_ids, list):
            return Response(
                {"user_ids": "Provide a list of friend user IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_ids = {
            int(user_id)
            for user_id in user_ids
            if str(user_id).isdigit()
        }
        requested_ids.discard(request.user.id)

        if not requested_ids:
            return Response(
                {"detail": "Choose at least one friend."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        )

        accepted_friend_ids = set()
        for friendship in friendships:
            accepted_friend_ids.add(
                friendship.to_user_id
                if friendship.from_user_id == request.user.id
                else friendship.from_user_id
            )

        if accepted_friend_ids != requested_ids:
            return Response(
                {
                    "detail": (
                        "One or more selected users are not "
                        "accepted friends."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_member_ids = set(
            DiningGroupMember.objects.filter(
                group=group,
                user_id__in=accepted_friend_ids,
                is_active=True,
            ).values_list(
                "user_id",
                flat=True,
            )
        )

        invited_count = 0

        for user_id in (
            accepted_friend_ids - existing_member_ids
        ):
            invitation = (
                DiningGroupInvitation.objects.filter(
                    group=group,
                    invited_user_id=user_id,
                )
                .order_by("-created_at")
                .first()
            )

            if invitation:
                invitation.invited_by = request.user
                invitation.status = InvitationStatus.PENDING
                invitation.responded_at = None
                invitation.expires_at = None
                invitation.save(
                    update_fields=(
                        "invited_by",
                        "status",
                        "responded_at",
                        "expires_at",
                    )
                )
            else:
                DiningGroupInvitation.objects.create(
                    group=group,
                    invited_by=request.user,
                    invited_user_id=user_id,
                    status=InvitationStatus.PENDING,
                )

            invited_count += 1

        return Response(
            {
                "detail": (
                    f"Sent {invited_count} group "
                    f"invitation{'s' if invited_count != 1 else ''}."
                ),
                "invited_count": invited_count,
            }
        )

    @action(
        detail=False,
        methods=("get",),
        url_path="invitations",
    )
    def invitations(self, request):
        invitations = (
            DiningGroupInvitation.objects.filter(
                invited_user=request.user,
                status=InvitationStatus.PENDING,
                group__is_active=True,
            )
            .select_related(
                "group",
                "invited_by",
            )
            .order_by(
                "group__name",
                "-created_at",
            )
        )

        serializer = DiningGroupInvitationSerializer(
            invitations,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    @action(
        detail=False,
        methods=("post",),
        url_path=(
            r"invitations/"
            r"(?P<invitation_id>[^/.]+)/respond"
        ),
    )
    @transaction.atomic
    def respond_invitation(
        self,
        request,
        invitation_id=None,
    ):
        invitation = get_object_or_404(
            DiningGroupInvitation.objects.select_related(
                "group",
            ),
            id=invitation_id,
            invited_user=request.user,
            status=InvitationStatus.PENDING,
        )

        response_action = str(
            request.data.get("action", "")
        ).strip().lower()

        if response_action not in (
            "accept",
            "decline",
        ):
            return Response(
                {"detail": "Choose accept or decline."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if response_action == "accept":
            membership, _ = (
                DiningGroupMember.objects.get_or_create(
                    group=invitation.group,
                    user=request.user,
                    defaults={
                        "role": GroupRole.MEMBER,
                        "is_active": True,
                    },
                )
            )

            if not membership.is_active:
                membership.is_active = True
                membership.role = GroupRole.MEMBER
                membership.save(
                    update_fields=(
                        "is_active",
                        "role",
                    )
                )

            invitation.status = InvitationStatus.ACCEPTED
        else:
            invitation.status = InvitationStatus.DECLINED

        from django.utils import timezone

        invitation.responded_at = timezone.now()
        invitation.save(
            update_fields=(
                "status",
                "responded_at",
            )
        )

        return Response(
            {
                "detail": (
                    "Group invitation accepted."
                    if response_action == "accept"
                    else "Group invitation declined."
                )
            }
        )


    @action(
        detail=True,
        methods=("post", "delete"),
        url_path="image",
        parser_classes=(
            parsers.MultiPartParser,
            parsers.FormParser,
        ),
    )
    def image(
        self,
        request,
        id=None,
    ):
        group = self.get_object()

        if request.method == "DELETE":
            if group.image:
                group.image.delete(
                    save=False,
                )

                group.image = None

                group.save(
                    update_fields=(
                        "image",
                        "updated_at",
                    ),
                )

            serializer = (
                DiningGroupDetailSerializer(
                    group,
                    context={
                        "request": request,
                    },
                )
            )

            return Response(
                serializer.data,
            )

        image = request.FILES.get(
            "image",
        )

        if not image:
            return Response(
                {
                    "image": (
                        "Choose an image to upload."
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if image.size > 8 * 1024 * 1024:
            return Response(
                {
                    "image": (
                        "The image must be "
                        "8 MB or smaller."
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if not image.content_type.startswith(
            "image/",
        ):
            return Response(
                {
                    "image": (
                        "The selected file must "
                        "be an image."
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        try:
            width, height = (
                get_image_dimensions(
                    image
                )
            )
        except Exception:
            return Response(
                {
                    "image": (
                        "The selected image "
                        "could not be read."
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if (
            not width
            or not height
            or width < 128
            or height < 128
        ):
            return Response(
                {
                    "image": (
                        "The image must be at least "
                        "128 by 128 pixels."
                    ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if group.image:
            group.image.delete(
                save=False,
            )

        group.image = image

        group.save(
            update_fields=(
                "image",
                "updated_at",
            ),
        )

        serializer = (
            DiningGroupDetailSerializer(
                group,
                context={
                    "request": request,
                },
            )
        )

        return Response(
            serializer.data,
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