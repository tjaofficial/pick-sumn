import { apiRequest } from "@/services/api";

import type {
  FriendListItem,
  FriendRequest,
  BlockedUser,
  FriendSearchResult,
  FriendUser,
} from "./types";

export async function getFriends(): Promise<FriendListItem[]> {
  return apiRequest<FriendListItem[]>("/api/auth/friends/");
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  return apiRequest<FriendRequest[]>("/api/auth/friends/requests/");
}

export async function searchFriends(query: string): Promise<FriendSearchResult[]> {
  return apiRequest<FriendSearchResult[]>(
    "/api/auth/friends/search/?q=" + encodeURIComponent(query),
  );
}

export async function getFriendRelationships(
  userIds: number[],
): Promise<FriendSearchResult[]> {
  const uniqueIds = [
    ...new Set(userIds),
  ].filter(
    (userId) =>
      Number.isInteger(userId)
      && userId > 0,
  );

  if (uniqueIds.length === 0) {
    return [];
  }

  return apiRequest<FriendSearchResult[]>(
    (
      "/api/auth/friends/search/?user_ids="
      + encodeURIComponent(
        uniqueIds.join(","),
      )
    ),
  );
}

export async function sendFriendRequest(input: {
  user_id?: number;
  friend_code?: string;
}): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    "/api/auth/friends/request/",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function respondToFriendRequest(
  friendshipId: string,
  action: "accept" | "decline" | "block",
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    `/api/auth/friends/requests/${friendshipId}/action/`,
    {
      method: "POST",
      body: JSON.stringify({ action }),
    },
  );
}

export async function removeFriend(friendshipId: string): Promise<void> {
  return apiRequest<void>(
    `/api/auth/friends/${friendshipId}/`,
    { method: "DELETE" },
  );
}

export async function getMyFriendCode(): Promise<FriendUser> {
  return apiRequest<FriendUser>("/api/auth/friends/me/code/");
}



export async function getBlockedUsers(): Promise<
  BlockedUser[]
> {
  return apiRequest<BlockedUser[]>(
    "/api/auth/friends/blocked/",
  );
}


export async function blockUser(
  userId: number,
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    "/api/auth/friends/block/",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
      }),
    },
  );
}


export async function unblockUser(
  userId: number,
): Promise<void> {
  return apiRequest<void>(
    `/api/auth/friends/blocked/${userId}/`,
    {
      method: "DELETE",
    },
  );
}
