import { apiRequest } from "@/services/api";

import type {
  CreateGroupInput,
  DiningGroup,
  DiningGroupDetail,
  JoinGroupInput,
} from "./types";

export async function getGroups(): Promise<DiningGroup[]> {
  return apiRequest<DiningGroup[]>("/api/groups/");
}

export async function getGroup(
  groupId: string,
): Promise<DiningGroupDetail> {
  return apiRequest<DiningGroupDetail>(
    `/api/groups/${groupId}/`,
  );
}

export async function createGroup(
  input: CreateGroupInput,
): Promise<DiningGroup> {
  return apiRequest<DiningGroup>("/api/groups/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function joinGroup(
  input: JoinGroupInput,
): Promise<DiningGroupDetail> {
  return apiRequest<DiningGroupDetail>(
    "/api/groups/join/",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function leaveGroup(
  groupId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/groups/${groupId}/leave/`,
    {
      method: "POST",
    },
  );
}