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
  PickSessionStatus,
  UpdateParticipantStatusResponse,
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
