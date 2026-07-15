import {
  apiRequest,
} from "@/services/api";

import type {
  SavedRestaurant,
  SavedRestaurantStatus,
  SaveRestaurantPayload,
} from "./types";


export async function getSavedRestaurants(): Promise<
  SavedRestaurant[]
> {
  return apiRequest<SavedRestaurant[]>(
    "/api/saved-restaurants/",
  );
}


export async function getSavedRestaurantStatus(
  externalId: string,
): Promise<SavedRestaurantStatus> {
  const encodedExternalId =
    encodeURIComponent(externalId);

  return apiRequest<SavedRestaurantStatus>(
    `/api/saved-restaurants/status/?external_id=${encodedExternalId}`,
  );
}


export async function saveRestaurant(
  payload: SaveRestaurantPayload,
): Promise<SavedRestaurant> {
  return apiRequest<SavedRestaurant>(
    "/api/saved-restaurants/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function removeSavedRestaurant(
  savedRestaurantId: number,
): Promise<void> {
  return apiRequest<void>(
    `/api/saved-restaurants/${savedRestaurantId}/`,
    {
      method: "DELETE",
    },
  );
}
export async function getSavedRestaurant(
  savedRestaurantId: number,
): Promise<SavedRestaurant> {
  return apiRequest<SavedRestaurant>(
    `/api/saved-restaurants/${savedRestaurantId}/`,
  );
}

export async function removeSavedRestaurantByExternalId(
  externalId: string,
): Promise<void> {
  const encodedExternalId =
    encodeURIComponent(externalId);

  return apiRequest<void>(
    `/api/saved-restaurants/remove/?external_id=${encodedExternalId}`,
    {
      method: "DELETE",
    },
  );
}