import { apiRequest } from "@/services/api";

import type {
  CurrentPreferences,
  PreferenceOptions,
  SavePreferencesInput,
} from "./types";

export async function getPreferenceOptions(): Promise<PreferenceOptions> {
  return apiRequest<PreferenceOptions>(
    "/api/preferences/options/",
  );
}

export async function getCurrentPreferences(): Promise<CurrentPreferences> {
  return apiRequest<CurrentPreferences>(
    "/api/preferences/me/",
  );
}

export async function savePreferences(
  input: SavePreferencesInput,
): Promise<CurrentPreferences> {
  return apiRequest<CurrentPreferences>(
    "/api/preferences/me/",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}