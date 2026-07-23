import {
  ApiError,
  apiRequest,
} from "@/services/api";

import type {
  CreatePickSessionInput,
  ParticipantStatus,
  PickSession,
  PickSessionDetail,
  PickSessionNotification,
  PickSessionNotificationList,
  GroupVoteState,
  PickSessionMatchesResponse,
  ExploreNearbyResponse,
  PickSessionStatus,
  PickVisitFeedback,
  PickVisitFeedbackPromptResponse,
  SelectionMethod,
  SubmitPickVisitFeedbackResponse,
  UpdateParticipantStatusResponse,
  RestaurantDietaryCommunityReport,
  RestaurantDietaryDetailResponse,
  SubmitRestaurantDietaryReportInput,
} from "./types";


export async function getActivePickSessions(): Promise<
  PickSession[]
> {
  return apiRequest<PickSession[]>(
    "/api/pick-sessions/active/",
  );
}


export async function getCurrentPickSession(): Promise<
  PickSessionDetail | null
> {
  try {
    return await apiRequest<PickSessionDetail>(
      "/api/pick-sessions/current/",
    );
  } catch (error) {
    if (
      error instanceof ApiError
      && error.status === 404
    ) {
      return null;
    }

    throw error;
  }
}


export async function makePickSessionCurrent(
  sessionId: string,
): Promise<PickSessionDetail> {
  return apiRequest<PickSessionDetail>(
    `/api/pick-sessions/${sessionId}/make-current/`,
    {
      method: "POST",
    },
  );
}


export async function getRecentPickSessions(): Promise<
  PickSession[]
> {
  return apiRequest<PickSession[]>(
    "/api/pick-sessions/recent/",
  );
}


export async function cancelPickSession(
  sessionId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/pick-sessions/${sessionId}/`,
    {
      method: "DELETE",
    },
  );
}


export async function createPickSession(
  input: CreatePickSessionInput,
): Promise<PickSession> {
  return apiRequest<PickSession>(
    "/api/pick-sessions/",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}


export async function getPickSession(
  sessionId: string,
): Promise<PickSessionDetail> {
  return apiRequest<PickSessionDetail>(
    `/api/pick-sessions/${sessionId}/`,
  );
}


export async function updateParticipantStatus(
  sessionId: string,
  participantStatus: ParticipantStatus,
): Promise<UpdateParticipantStatusResponse> {
  return apiRequest<UpdateParticipantStatusResponse>(
    `/api/pick-sessions/${sessionId}/participant-status/`,
    {
      method: "POST",
      body: JSON.stringify({
        status: participantStatus,
      }),
    },
  );
}


export async function startPickSessionMatching(
  sessionId: string,
): Promise<{
  id: string;
  status: PickSessionStatus;
  status_display: string;
}> {
  return apiRequest(
    `/api/pick-sessions/${sessionId}/start-matching/`,
    {
      method: "POST",
    },
  );
}


export async function getPickSessionMatches(
  sessionId: string,
): Promise<PickSessionMatchesResponse> {
  return apiRequest<PickSessionMatchesResponse>(
    `/api/pick-sessions/${sessionId}/matches/`,
    {
      method: "POST",
    },
  );
}



export async function getExploreNearbyRestaurants(
  input: {
    latitude?: number | null;
    longitude?: number | null;
    radiusMiles: number;
  },
): Promise<ExploreNearbyResponse> {
  const params = new URLSearchParams();

  params.set(
    "radius_miles",
    String(input.radiusMiles),
  );

  if (
    input.latitude !== null
    && input.latitude !== undefined
    && input.longitude !== null
    && input.longitude !== undefined
  ) {
    params.set(
      "latitude",
      String(input.latitude),
    );
    params.set(
      "longitude",
      String(input.longitude),
    );
  }

  return apiRequest<ExploreNearbyResponse>(
    `/api/pick-sessions/explore/?${params.toString()}`,
  );
}



export async function prepareGroupVote(
  sessionId: string,
): Promise<GroupVoteState> {
  return apiRequest<GroupVoteState>(
    `/api/pick-sessions/${sessionId}/prepare-vote/`,
    {
      method: "POST",
    },
  );
}


export async function getGroupVote(
  sessionId: string,
): Promise<GroupVoteState> {
  return apiRequest<GroupVoteState>(
    `/api/pick-sessions/${sessionId}/vote/`,
  );
}


export async function submitGroupVote(
  sessionId: string,
  optionId: string,
): Promise<GroupVoteState> {
  return apiRequest<GroupVoteState>(
    `/api/pick-sessions/${sessionId}/vote/`,
    {
      method: "POST",
      body: JSON.stringify({
        option_id: optionId,
      }),
    },
  );
}


export async function finishGroupVote(
  sessionId: string,
): Promise<GroupVoteState> {
  return apiRequest<GroupVoteState>(
    `/api/pick-sessions/${sessionId}/finish-vote/`,
    {
      method: "POST",
    },
  );
}



export async function getPickSessionNotifications(): Promise<
  PickSessionNotificationList
> {
  return apiRequest<PickSessionNotificationList>(
    "/api/pick-sessions/notifications/",
  );
}


export async function getUnreadPickSessionNotifications(): Promise<
  PickSessionNotificationList
> {
  return apiRequest<PickSessionNotificationList>(
    "/api/pick-sessions/notifications/unread/",
  );
}


export async function markPickSessionNotificationRead(
  notificationId: string,
): Promise<PickSessionNotification> {
  return apiRequest<PickSessionNotification>(
    (
      "/api/pick-sessions/notifications/"
      + `${notificationId}/read/`
    ),
    {
      method: "POST",
    },
  );
}


export async function markAllPickSessionNotificationsRead(): Promise<void> {
  return apiRequest<void>(
    "/api/pick-sessions/notifications/read-all/",
    {
      method: "POST",
    },
  );
}


export async function getRestaurantDietaryDetails(
  placeId: string,
  dietarySlug: string,
): Promise<RestaurantDietaryDetailResponse> {
  const encodedPlaceId = encodeURIComponent(
    placeId,
  );

  const encodedDietarySlug =
    encodeURIComponent(
      dietarySlug,
    );

  return apiRequest<RestaurantDietaryDetailResponse>(
    (
      "/api/pick-sessions/restaurants/"
      + `${encodedPlaceId}/dietary/`
      + `?dietary_slug=${encodedDietarySlug}`
    ),
  );
}


export async function submitRestaurantDietaryReport(
  placeId: string,
  input: SubmitRestaurantDietaryReportInput,
): Promise<RestaurantDietaryCommunityReport> {
  const encodedPlaceId = encodeURIComponent(
    placeId,
  );

  return apiRequest<RestaurantDietaryCommunityReport>(
    (
      "/api/pick-sessions/restaurants/"
      + `${encodedPlaceId}/dietary/report/`
    ),
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}



export async function selectPickSessionRestaurant(
  sessionId: string,
  externalId: string,
  selectionMethod: SelectionMethod,
): Promise<PickSessionDetail> {
  return apiRequest<PickSessionDetail>(
    `/api/pick-sessions/${sessionId}/select-restaurant/`,
    {
      method: "POST",
      body: JSON.stringify({
        external_id: externalId,
        selection_method:
          selectionMethod,
      }),
    },
  );
}


export async function getPickVisitFeedbackPrompt(): Promise<
  PickVisitFeedbackPromptResponse
> {
  return apiRequest<PickVisitFeedbackPromptResponse>(
    "/api/pick-sessions/visit-feedback-prompt/",
  );
}


export async function submitPickVisitFeedback(
  sessionId: string,
  feedback: PickVisitFeedback,
): Promise<SubmitPickVisitFeedbackResponse> {
  return apiRequest<SubmitPickVisitFeedbackResponse>(
    `/api/pick-sessions/${sessionId}/visit-feedback/`,
    {
      method: "POST",
      body: JSON.stringify({
        feedback,
      }),
    },
  );
}



export async function recordRestaurantDetailView(
  sessionId: string,
  restaurant: {
    external_id: string;
    name: string;
  },
): Promise<void> {
  return apiRequest<void>(
    `/api/pick-sessions/${sessionId}/restaurant-detail-view/`,
    {
      method: "POST",
      body: JSON.stringify({
        external_id:
          restaurant.external_id,
        restaurant_name:
          restaurant.name,
      }),
    },
  );
}
