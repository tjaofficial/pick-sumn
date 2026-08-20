import {
  apiRequest,
} from "@/services/api";

import type {
  PickSumnEntitlements,
} from "./types";


export const APPLE_PLUS_MONTHLY_PRODUCT_ID =
  "com.picksumn.app.plus.monthly";

export const APPLE_PLUS_ANNUAL_PRODUCT_ID =
  "com.picksumn.app.plus.annual";

export const APPLE_PLUS_PRODUCT_IDS = [
  APPLE_PLUS_MONTHLY_PRODUCT_ID,
  APPLE_PLUS_ANNUAL_PRODUCT_ID,
] as const;


export type AppleAppAccountTokenResponse = {
  app_account_token: string;
};


export type AppleSubscriptionVerificationResponse = {
  detail: string;
  entitlements: PickSumnEntitlements;
};


export async function getAppleAppAccountToken():
Promise<AppleAppAccountTokenResponse> {
  return apiRequest<AppleAppAccountTokenResponse>(
    "/api/auth/subscriptions/apple/account-token/",
  );
}


export async function verifyAppleSubscriptionPurchase(
  input: {
    transaction_id: string;
    product_id: string;
  },
): Promise<AppleSubscriptionVerificationResponse> {
  return apiRequest<
    AppleSubscriptionVerificationResponse
  >(
    "/api/auth/subscriptions/apple/verify/",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}


export async function syncAppleSubscription():
Promise<AppleSubscriptionVerificationResponse> {
  return apiRequest<
    AppleSubscriptionVerificationResponse
  >(
    "/api/auth/subscriptions/apple/sync/",
    {
      method: "POST",
    },
  );
}
