from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DiningGroupMember, GroupRole
from .services import create_dining_group


User = get_user_model()


class DiningGroupApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="tobe@example.com",
            password="TestingPass123!",
            display_name="Tobe",
        )

        self.other_user = User.objects.create_user(
            email="friend@example.com",
            password="TestingPass123!",
            display_name="Friend",
        )

        self.client.force_authenticate(
            user=self.user,
        )

    def test_user_can_create_group(self):
        response = self.client.post(
            "/api/groups/",
            {
                "name": "Dinner Crew",
                "description": "Our regular group",
                "group_type": "permanent",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        group_id = response.data["id"]

        membership = (
            DiningGroupMember.objects.get(
                group_id=group_id,
                user=self.user,
            )
        )

        self.assertEqual(
            membership.role,
            GroupRole.OWNER,
        )

    def test_user_only_sees_their_groups(self):
        own_group = create_dining_group(
            created_by=self.user,
            name="My Group",
        )

        create_dining_group(
            created_by=self.other_user,
            name="Other Group",
        )

        response = self.client.get(
            "/api/groups/",
        )

        returned_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            str(own_group.id),
            returned_ids,
        )

        self.assertEqual(
            len(returned_ids),
            1,
        )

    def test_user_can_join_group_by_code(self):
        group = create_dining_group(
            created_by=self.other_user,
            name="Friend Group",
        )

        response = self.client.post(
            "/api/groups/join/",
            {
                "join_code": group.join_code.lower(),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            DiningGroupMember.objects.filter(
                group=group,
                user=self.user,
                is_active=True,
            ).exists()
        )

    def test_non_member_cannot_retrieve_group(self):
        group = create_dining_group(
            created_by=self.other_user,
            name="Private Group",
        )

        response = self.client.get(
            f"/api/groups/{group.id}/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_member_can_leave_group(self):
        group = create_dining_group(
            created_by=self.other_user,
            name="Friend Group",
        )

        DiningGroupMember.objects.create(
            group=group,
            user=self.user,
            role=GroupRole.MEMBER,
        )

        response = self.client.post(
            f"/api/groups/{group.id}/leave/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        membership = DiningGroupMember.objects.get(
            group=group,
            user=self.user,
        )

        self.assertFalse(membership.is_active)

    def test_owner_cannot_leave_active_group_with_members(self):
        group = create_dining_group(
            created_by=self.user,
            name="Dinner Crew",
        )

        DiningGroupMember.objects.create(
            group=group,
            user=self.other_user,
            role=GroupRole.MEMBER,
        )

        response = self.client.post(
            f"/api/groups/{group.id}/leave/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )