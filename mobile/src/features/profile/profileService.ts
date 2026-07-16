import { apiRequest } from "@/services/api";
import {
  File,
} from "expo-file-system";
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


type LocalImageFile = {
  uri: string;
  name: string;
  type: string;
};


export async function uploadProfileAvatar(
  localFile: LocalImageFile,
): Promise<Profile> {
  const file =
    new File(localFile.uri);

  const formData =
    new FormData();

  formData.append(
    "avatar",
    file,
    localFile.name,
  );

  return apiRequest<Profile>(
    "/api/profile/avatar/",
    {
      method: "POST",
      body: formData,
    },
  );
}


export async function deleteProfileAvatar(): Promise<
  Profile
> {
  return apiRequest<Profile>(
    "/api/profile/avatar/",
    {
      method: "DELETE",
    },
  );
}
