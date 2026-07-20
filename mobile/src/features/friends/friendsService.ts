import { apiRequest } from "@/services/api";

import type {
  FriendListItem,
  FriendRequest,
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
