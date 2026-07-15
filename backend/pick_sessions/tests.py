from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from dining_groups.models import (
    DiningGroupMember,
    GroupRole,
)
from dining_groups.services import create_dining_group

from .models import (
    ParticipantStatus,
    PickSessionStatus,
)


User = get_user_model()


class PickSessionApiTests(APITestCase):
    def setUp(self):
        self.host = User.objects.create_user(
            email="host@example.com",
            password="TestingPass123!",
            display_name="Host",
        )

        self.friend = User.objects.create_user(
            email="friend@example.com",
            password="TestingPass123!",
            display_name="Friend",
        )

        self.group = create_dining_group(
            created_by=self.host,
            name="Dinner Crew",
        )

        DiningGroupMember.objects.create(
            group=self.group,
            user=self.friend,
            role=GroupRole.MEMBER,
        )

        self.client.force_authenticate(
            user=self.host,
        )

    def test_user_can_create_pick_session(self):
        response = self.client.post(
            "/api/pick-sessions/",
            {
                "group_id": str(self.group.id),
                "title": "Friday Dinner",
                "decision_mode": "ranked",
                "location_label": "Waterford, MI",
                "search_radius_miles": 10,
                "price_min": 1,
                "price_max": 3,
                "open_now": True,
                "cuisine_ids": [],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            response.data["title"],
            "Friday Dinner",
        )

        self.assertEqual(
            response.data["participant_count"],
            2,
        )

    def test_user_only_sees_participating_sessions(self):
        create_response = self.client.post(
            "/api/pick-sessions/",
            {
                "group_id": str(self.group.id),
                "title": "My Session",
            },
            format="json",
        )

        response = self.client.get(
            "/api/pick-sessions/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        returned_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            create_response.data["id"],
            returned_ids,
        )

    def test_invited_user_can_mark_ready(self):
        create_response = self.client.post(
            "/api/pick-sessions/",
            {
                "group_id": str(self.group.id),
                "title": "Dinner",
            },
            format="json",
        )

        session_id = create_response.data["id"]

        self.client.force_authenticate(
            user=self.friend,
        )

        response = self.client.post(
            (
                f"/api/pick-sessions/{session_id}/"
                "participant-status/"
            ),
            {
                "status": ParticipantStatus.READY,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["status"],
            ParticipantStatus.READY,
        )

    def test_delete_cancels_session(self):
        create_response = self.client.post(
            "/api/pick-sessions/",
            {
                "group_id": str(self.group.id),
                "title": "Dinner",
            },
            format="json",
        )

        session_id = create_response.data["id"]

        response = self.client.delete(
            f"/api/pick-sessions/{session_id}/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        response = self.client.get(
            f"/api/pick-sessions/{session_id}/",
        )

        self.assertEqual(
            response.data["status"],
            PickSessionStatus.CANCELLED,
        )

    def test_host_can_select_only_some_group_members(self):
        third_user = User.objects.create_user(
            email="third@example.com",
            password="TestingPass123!",
            display_name="Third User",
        )

        DiningGroupMember.objects.create(
            group=self.group,
            user=third_user,
            role=GroupRole.MEMBER,
        )

        response = self.client.post(
            "/api/pick-sessions/",
            {
                "group_id": str(self.group.id),
                "title": "Smaller Dinner Crew",
                "participant_ids": [
                    self.friend.id,
                ],
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        participant_emails = {
            item["user"]["email"]
            for item in response.data["participants"]
        }

        self.assertIn(
            self.host.email,
            participant_emails,
        )

        self.assertIn(
            self.friend.email,
            participant_emails,
        )

        self.assertNotIn(
            third_user.email,
            participant_emails,
        )


def test_session_is_waiting_when_member_is_invited(self):
    response = self.client.post(
        "/api/pick-sessions/",
        {
            "group_id": str(self.group.id),
            "title": "Dinner",
            "participant_ids": [
                self.friend.id,
            ],
        },
        format="json",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_201_CREATED,
    )

    self.assertEqual(
        response.data["status"],
        PickSessionStatus.WAITING,
    )


def test_session_becomes_ready_when_everyone_is_ready(self):
    create_response = self.client.post(
        "/api/pick-sessions/",
        {
            "group_id": str(self.group.id),
            "title": "Dinner",
            "participant_ids": [
                self.friend.id,
            ],
        },
        format="json",
    )

    session_id = create_response.data["id"]

    self.client.force_authenticate(
        user=self.friend,
    )

    response = self.client.post(
        (
            f"/api/pick-sessions/{session_id}/"
            "participant-status/"
        ),
        {
            "status": ParticipantStatus.READY,
        },
        format="json",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_200_OK,
    )

    self.assertEqual(
        response.data["session"]["status"],
        PickSessionStatus.READY,
    )


def test_host_can_start_matching_when_everyone_ready(self):
    create_response = self.client.post(
        "/api/pick-sessions/",
        {
            "group_id": str(self.group.id),
            "title": "Dinner",
            "participant_ids": [
                self.friend.id,
            ],
        },
        format="json",
    )

    session_id = create_response.data["id"]

    self.client.force_authenticate(
        user=self.friend,
    )

    self.client.post(
        (
            f"/api/pick-sessions/{session_id}/"
            "participant-status/"
        ),
        {
            "status": ParticipantStatus.READY,
        },
        format="json",
    )

    self.client.force_authenticate(
        user=self.host,
    )

    response = self.client.post(
        (
            f"/api/pick-sessions/{session_id}/"
            "start-matching/"
        ),
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_200_OK,
    )

    self.assertEqual(
        response.data["status"],
        PickSessionStatus.MATCHING,
    )


def test_non_host_cannot_cancel_session(self):
    create_response = self.client.post(
        "/api/pick-sessions/",
        {
            "group_id": str(self.group.id),
            "title": "Dinner",
            "participant_ids": [
                self.friend.id,
            ],
        },
        format="json",
    )

    session_id = create_response.data["id"]

    self.client.force_authenticate(
        user=self.friend,
    )

    response = self.client.delete(
        f"/api/pick-sessions/{session_id}/",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_403_FORBIDDEN,
    )