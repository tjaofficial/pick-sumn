from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    FriendRequestPrivacy,
    Friendship,
    FriendshipStatus,
    UserAppSettings,
)
from .serializers import (
    BlockedUserSerializer,
    ChangePasswordSerializer,
    FeedbackSubmissionSerializer,
    FriendListItemSerializer,
    FriendRequestSerializer,
    FriendSearchResultSerializer,
    MyFriendCodeSerializer,
    RegisterSerializer,
    UserAppSettingsSerializer,
    UserSerializer,
)

User = get_user_model()


def friendship_between(user_a, user_b):
    return Friendship.objects.filter(
        Q(from_user=user_a, to_user=user_b)
        | Q(from_user=user_b, to_user=user_a)
    ).first()


def get_user_app_settings(user):
    settings_object, _ = (
        UserAppSettings.objects.get_or_create(
            user=user,
        )
    )

    return settings_object


def accepted_friend_ids(user):
    relationships = Friendship.objects.filter(
        Q(
            from_user=user,
            status=FriendshipStatus.ACCEPTED,
        )
        | Q(
            to_user=user,
            status=FriendshipStatus.ACCEPTED,
        )
    ).values_list(
        "from_user_id",
        "to_user_id",
    )

    friend_ids = set()

    for from_user_id, to_user_id in relationships:
        friend_ids.add(
            to_user_id
            if from_user_id == user.id
            else from_user_id
        )

    return friend_ids


def can_send_friend_request(
    *,
    sender,
    target,
):
    target_settings = get_user_app_settings(
        target
    )

    if (
        target_settings.friend_request_privacy
        == FriendRequestPrivacy.EVERYONE
    ):
        return True

    if (
        target_settings.friend_request_privacy
        == FriendRequestPrivacy.NOBODY
    ):
        return False

    sender_friend_ids = accepted_friend_ids(
        sender
    )
    target_friend_ids = accepted_friend_ids(
        target
    )

    return bool(
        sender_friend_ids.intersection(
            target_friend_ids
        )
    )


def friend_sort_key(user):
    first = (user.first_name or "").strip().lower()
    last = (user.last_name or "").strip().lower()
    display = (user.display_name or "").strip().lower()
    email = (user.email or "").strip().lower()
    if first or last:
        return (first, last, display, email)
    return (display, "", "", email)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "A refresh token is required."},
                status=400,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "The refresh token is invalid."},
                status=400,
            )
        return Response(status=204)


class FriendListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        relationships = Friendship.objects.filter(
            Q(
                from_user=request.user,
                status=FriendshipStatus.ACCEPTED,
            )
            | Q(
                to_user=request.user,
                status=FriendshipStatus.ACCEPTED,
            )
        ).select_related("from_user", "to_user")

        items = []
        for relationship in relationships:
            other_user = (
                relationship.to_user
                if relationship.from_user_id == request.user.id
                else relationship.from_user
            )
            items.append(
                {
                    "friendship_id": relationship.id,
                    "user": other_user,
                }
            )

        items.sort(key=lambda item: friend_sort_key(item["user"]))
        serializer = FriendListItemSerializer(
            items,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


class FriendRequestListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        relationships = (
            Friendship.objects.filter(
                to_user=request.user,
                status=FriendshipStatus.PENDING,
            )
            .select_related("from_user")
            .order_by("-created_at")
        )
        items = [
            {
                "friendship_id": relationship.id,
                "user": relationship.from_user,
                "created_at": relationship.created_at,
            }
            for relationship in relationships
        ]
        serializer = FriendRequestSerializer(
            items,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


class FriendSearchView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response([])

        users = list(
            User.objects.filter(
                Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(display_name__icontains=query)
                | Q(email__icontains=query)
            ).exclude(id=request.user.id)[:50]
        )
        users.sort(key=friend_sort_key)

        items = []
        for user in users:
            relationship = friendship_between(request.user, user)
            items.append(
                {
                    "user": user,
                    "relationship_status": (
                        relationship.status if relationship else None
                    ),
                }
            )

        serializer = FriendSearchResultSerializer(
            items,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


class SendFriendRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user_id = request.data.get("user_id")
        friend_code = str(
            request.data.get("friend_code", "")
        ).strip().upper()

        target = None
        if user_id:
            target = User.objects.filter(id=user_id).first()
        elif friend_code:
            target = User.objects.filter(friend_code=friend_code).first()

        if not target:
            return Response(
                {"detail": "That user could not be found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if target.id == request.user.id:
            return Response(
                {"detail": "You cannot add yourself as a friend."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = friendship_between(request.user, target)
        if existing:
            if existing.status == FriendshipStatus.ACCEPTED:
                return Response(
                    {"detail": "You are already friends."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if existing.status == FriendshipStatus.BLOCKED:
                return Response(
                    {"detail": "This friend request cannot be sent."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (
                existing.status == FriendshipStatus.PENDING
                and existing.to_user_id == request.user.id
            ):
                existing.status = FriendshipStatus.ACCEPTED
                existing.responded_at = timezone.now()
                existing.save(
                    update_fields=(
                        "status",
                        "responded_at",
                        "updated_at",
                    )
                )
                return Response(
                    {"detail": "Friend request accepted."},
                    status=status.HTTP_200_OK,
                )
            if existing.status == FriendshipStatus.PENDING:
                return Response(
                    {"detail": "A friend request is already pending."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not can_send_friend_request(
                sender=request.user,
                target=target,
            ):
                return Response(
                    {
                        "detail": (
                            "This user is not accepting "
                            "friend requests from you."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            existing.from_user = request.user
            existing.to_user = target
            existing.status = FriendshipStatus.PENDING
            existing.blocked_by = None
            existing.responded_at = None
            existing.save()
            return Response(
                {"detail": "Friend request sent."},
                status=status.HTTP_200_OK,
            )

        if not can_send_friend_request(
            sender=request.user,
            target=target,
        ):
            return Response(
                {
                    "detail": (
                        "This user is not accepting "
                        "friend requests from you."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        Friendship.objects.create(
            from_user=request.user,
            to_user=target,
            status=FriendshipStatus.PENDING,
        )
        return Response(
            {"detail": "Friend request sent."},
            status=status.HTTP_201_CREATED,
        )


class FriendRequestActionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, friendship_id):
        relationship = Friendship.objects.filter(id=friendship_id).first()
        if not relationship:
            return Response(
                {"detail": "Friend request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = str(request.data.get("action", "")).strip().lower()

        if action in ("accept", "decline"):
            if (
                relationship.to_user_id != request.user.id
                or relationship.status != FriendshipStatus.PENDING
            ):
                return Response(
                    {"detail": "You cannot respond to this request."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            relationship.status = (
                FriendshipStatus.ACCEPTED
                if action == "accept"
                else FriendshipStatus.DECLINED
            )
            relationship.responded_at = timezone.now()
            relationship.save(
                update_fields=("status", "responded_at", "updated_at")
            )
            return Response({"detail": f"Friend request {action}ed."})

        if action == "block":
            if request.user.id not in (
                relationship.from_user_id,
                relationship.to_user_id,
            ):
                return Response(
                    {"detail": "You cannot update this relationship."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            relationship.status = FriendshipStatus.BLOCKED
            relationship.blocked_by = request.user
            relationship.responded_at = timezone.now()
            relationship.save(
                update_fields=(
                    "status",
                    "blocked_by",
                    "responded_at",
                    "updated_at",
                )
            )
            return Response({"detail": "User blocked."})

        return Response(
            {"detail": "Unsupported action."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class FriendDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, friendship_id):
        relationship = (
            Friendship.objects.filter(
                id=friendship_id,
                status=FriendshipStatus.ACCEPTED,
            )
            .filter(Q(from_user=request.user) | Q(to_user=request.user))
            .first()
        )
        if not relationship:
            return Response(
                {"detail": "Friendship not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        relationship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyFriendCodeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        serializer = MyFriendCodeSerializer(
            request.user,
            context={"request": request},
        )
        return Response(serializer.data)



class CurrentAppSettingsView(
    generics.RetrieveUpdateAPIView
):
    serializer_class = UserAppSettingsSerializer
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def get_object(self):
        return get_user_app_settings(
            self.request.user
        )


class BlockedUserListView(APIView):
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def get(self, request):
        relationships = (
            Friendship.objects.filter(
                status=FriendshipStatus.BLOCKED,
                blocked_by=request.user,
            )
            .filter(
                Q(from_user=request.user)
                | Q(to_user=request.user)
            )
            .select_related(
                "from_user",
                "to_user",
            )
            .order_by(
                "-updated_at",
            )
        )

        items = []

        for relationship in relationships:
            other_user = (
                relationship.to_user
                if relationship.from_user_id
                == request.user.id
                else relationship.from_user
            )

            items.append(
                {
                    "friendship_id": (
                        relationship.id
                    ),
                    "user": other_user,
                    "blocked_at": (
                        relationship.updated_at
                    ),
                }
            )

        serializer = BlockedUserSerializer(
            items,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data
        )


class BlockUserView(APIView):
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def post(self, request):
        user_id = request.data.get(
            "user_id"
        )

        target = User.objects.filter(
            id=user_id,
        ).first()

        if not target:
            return Response(
                {
                    "detail": (
                        "That user could not be found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if target.id == request.user.id:
            return Response(
                {
                    "detail": (
                        "You cannot block yourself."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        relationship = friendship_between(
            request.user,
            target,
        )

        if relationship is None:
            relationship = (
                Friendship.objects.create(
                    from_user=request.user,
                    to_user=target,
                    status=(
                        FriendshipStatus.BLOCKED
                    ),
                    blocked_by=request.user,
                    responded_at=timezone.now(),
                )
            )
        else:
            relationship.status = (
                FriendshipStatus.BLOCKED
            )
            relationship.blocked_by = (
                request.user
            )
            relationship.responded_at = (
                timezone.now()
            )
            relationship.save(
                update_fields=(
                    "status",
                    "blocked_by",
                    "responded_at",
                    "updated_at",
                )
            )

        return Response(
            {
                "detail": "User blocked."
            }
        )


class UnblockUserView(APIView):
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def delete(
        self,
        request,
        user_id,
    ):
        relationship = (
            Friendship.objects.filter(
                status=FriendshipStatus.BLOCKED,
                blocked_by=request.user,
            )
            .filter(
                (
                    Q(
                        from_user=request.user,
                        to_user_id=user_id,
                    )
                )
                | (
                    Q(
                        to_user=request.user,
                        from_user_id=user_id,
                    )
                )
            )
            .first()
        )

        if not relationship:
            return Response(
                {
                    "detail": (
                        "Blocked user not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        relationship.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class ChangePasswordView(APIView):
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={
                "request": request,
            },
        )

        serializer.is_valid(
            raise_exception=True
        )

        request.user.set_password(
            serializer.validated_data[
                "new_password"
            ]
        )
        request.user.save(
            update_fields=(
                "password",
            )
        )

        return Response(
            {
                "detail": (
                    "Your password has been changed."
                )
            }
        )


class DeleteAccountView(APIView):
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def delete(self, request):
        user = request.user
        user.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )



class FeedbackSubmissionView(
    generics.CreateAPIView
):
    serializer_class = (
        FeedbackSubmissionSerializer
    )
    permission_classes = (
        permissions.IsAuthenticated,
    )

    def perform_create(
        self,
        serializer,
    ):
        serializer.save(
            user=self.request.user,
        )
