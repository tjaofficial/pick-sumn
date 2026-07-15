import { apiRequest } from "@/services/api";

import type {
  Profile,
  UpdateProfileInput,
} from "./types";

export async function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/api/profile/");
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<Profile> {
  return apiRequest<Profile>("/api/profile/", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}