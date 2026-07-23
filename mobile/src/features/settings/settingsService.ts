import {
  apiRequest,
} from "@/services/api";

import type {
  AppSettings,
  ChangePasswordInput,
  SubmitFeedbackInput,
  UpdateAppSettingsInput,
  FeedbackSubmission,
} from "./types";


export async function getAppSettings(): Promise<
  AppSettings
> {
  return apiRequest<AppSettings>(
    "/api/auth/settings/",
  );
}


export async function updateAppSettings(
  input: UpdateAppSettingsInput,
): Promise<AppSettings> {
  return apiRequest<AppSettings>(
    "/api/auth/settings/",
    {
      method: "PATCH",
      body: JSON.stringify(
        input,
      ),
    },
  );
}


export async function changePassword(
  input: ChangePasswordInput,
): Promise<{ detail: string }> {
  return apiRequest<{
    detail: string;
  }>(
    "/api/auth/change-password/",
    {
      method: "POST",
      body: JSON.stringify(
        input,
      ),
    },
  );
}


export async function deleteAccount(): Promise<
  void
> {
  return apiRequest<void>(
    "/api/auth/delete-account/",
    {
      method: "DELETE",
    },
  );
}



export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<FeedbackSubmission> {
  return apiRequest<FeedbackSubmission>(
    "/api/auth/feedback/",
    {
      method: "POST",
      body: JSON.stringify(
        input,
      ),
    },
  );
}
