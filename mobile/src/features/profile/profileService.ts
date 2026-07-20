import { apiRequest } from "@/services/api";
import {
  File,
} from "expo-file-system";
import type {
  CreateSavedLocationInput,
  Profile,
  SavedLocation,
  UpdateProfileInput,
} from "./types";


function roundCoordinate(
  value: number | string | null | undefined,
): number | null | undefined {
  if (
    value === null
    || value === undefined
  ) {
    return value;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Number(
    numericValue.toFixed(6),
  );
}

export async function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/api/profile/");
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<Profile> {
  return apiRequest<Profile>("/api/profile/", {
    method: "PATCH",
    body: JSON.stringify({
      ...input,
      default_location_latitude:
        roundCoordinate(
          input.default_location_latitude,
        ),
      default_location_longitude:
        roundCoordinate(
          input.default_location_longitude,
        ),
    }),
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


export async function getSavedLocations(): Promise<
  SavedLocation[]
> {
  return apiRequest<SavedLocation[]>(
    "/api/profile/saved-locations/",
  );
}


export async function createSavedLocation(
  input: CreateSavedLocationInput,
): Promise<SavedLocation> {
  return apiRequest<SavedLocation>(
    "/api/profile/saved-locations/",
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        latitude:
          roundCoordinate(
            input.latitude,
          ),
        longitude:
          roundCoordinate(
            input.longitude,
          ),
      }),
    },
  );
}


export async function updateSavedLocation(
  locationId: number,
  input: Partial<CreateSavedLocationInput>,
): Promise<SavedLocation> {
  return apiRequest<SavedLocation>(
    `/api/profile/saved-locations/${locationId}/`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...input,
        latitude:
          roundCoordinate(
            input.latitude,
          ),
        longitude:
          roundCoordinate(
            input.longitude,
          ),
      }),
    },
  );
}


export async function deleteSavedLocation(
  locationId: number,
): Promise<void> {
  return apiRequest<void>(
    `/api/profile/saved-locations/${locationId}/`,
    {
      method: "DELETE",
    },
  );
}
