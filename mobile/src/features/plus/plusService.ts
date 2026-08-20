import {
  apiRequest,
} from "@/services/api";

import {
  syncAppleSubscription,
} from "./subscriptionService";
import type {
  PickSumnEntitlements,
} from "./types";


async function fetchEntitlements():
Promise<PickSumnEntitlements> {
  return apiRequest<PickSumnEntitlements>(
    "/api/auth/entitlements/",
  );
}


export async function getMyEntitlements():
Promise<PickSumnEntitlements> {
  const entitlements =
    await fetchEntitlements();

  /*
   * Apple renewals happen outside Pick Sum'N.
   *
   * If this account has ever been linked to an Apple subscription,
   * ask our backend to refresh the latest App Store transaction before
   * deciding whether Plus is still active. If Apple is temporarily
   * unavailable, fall back to the locally stored entitlement record.
   */
  if (
    entitlements.subscription_provider
    === "apple"
  ) {
    try {
      const result =
        await syncAppleSubscription();

      return result.entitlements;
    } catch {
      return entitlements;
    }
  }

  return entitlements;
}
