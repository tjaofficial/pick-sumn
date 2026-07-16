import { apiRequest } from "@/services/api";

export type LocationSuggestion = {
  place_id: string;
  label: string;
  main_text: string;
  secondary_text: string;
  types: string[];
};

export type SelectedLocation = {
  place_id: string;
  label: string;
  latitude: number;
  longitude: number;
  types: string[];
};

type LocationSuggestionResponse = {
  suggestions: LocationSuggestion[];
};

export async function getLocationSuggestions(
  input: string,
): Promise<LocationSuggestion[]> {
  const query = encodeURIComponent(input.trim());

  if (query.length < 2) {
    return [];
  }

  const response = await apiRequest<LocationSuggestionResponse>(
    `/api/pick-sessions/location-suggestions/?input=${query}`,
  );

  return response.suggestions;
}

export async function getLocationDetails(
  placeId: string,
): Promise<SelectedLocation> {
  const query = encodeURIComponent(placeId);

  return apiRequest<SelectedLocation>(
    `/api/pick-sessions/location-details/?place_id=${query}`,
  );
}
