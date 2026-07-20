import { apiRequest } from "@/services/api";

import type {
  CreateGroupInput,
  DiningGroup,
  DiningGroupDetail,
  DiningGroupInvitation,
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


export async function inviteFriendsToGroup(
  groupId: string,
  userIds: number[],
): Promise<{
  detail: string;
  invited_count: number;
}> {
  return apiRequest<{
    detail: string;
    invited_count: number;
  }>(
    `/api/groups/${groupId}/invite-friends/`,
    {
      method: "POST",
      body: JSON.stringify({
        user_ids: userIds,
      }),
    },
  );
}


export async function getGroupInvitations(): Promise<
  DiningGroupInvitation[]
> {
  return apiRequest<DiningGroupInvitation[]>(
    "/api/groups/invitations/",
  );
}


export async function respondToGroupInvitation(
  invitationId: string,
  action: "accept" | "decline",
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    `/api/groups/invitations/${invitationId}/respond/`,
    {
      method: "POST",
      body: JSON.stringify({
        action,
      }),
    },
  );
}


export async function deleteGroup(
  groupId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/groups/${groupId}/`,
    {
      method: "DELETE",
    },
  );
}


type LocalImageFile = {
  uri: string;
  name: string;
  type: string;
};


export async function uploadGroupImage(
  groupId: string,
  localFile: LocalImageFile,
): Promise<DiningGroupDetail> {
  const {
    File,
  } = await import(
    "expo-file-system"
  );

  const file =
    new File(localFile.uri);

  const formData =
    new FormData();

  formData.append(
    "image",
    file,
    localFile.name,
  );

  return apiRequest<DiningGroupDetail>(
    `/api/groups/${groupId}/image/`,
    {
      method: "POST",
      body: formData,
    },
  );
}


export async function deleteGroupImage(
  groupId: string,
): Promise<DiningGroupDetail> {
  return apiRequest<DiningGroupDetail>(
    `/api/groups/${groupId}/image/`,
    {
      method: "DELETE",
    },
  );
}
