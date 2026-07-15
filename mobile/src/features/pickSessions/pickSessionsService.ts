import { apiRequest } from "@/services/api";

import type {
  CreatePickSessionInput,
  ParticipantStatus,
  PickSession,
  PickSessionDetail,
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