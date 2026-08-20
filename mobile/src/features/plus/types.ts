export type SubscriptionPlan =
  | "free"
  | "plus";

export type PickSumnEntitlements = {
  plan: SubscriptionPlan;
  is_plus: boolean;
  max_participants: number | null;
  max_search_radius_miles: number;
  max_saved_restaurants: number | null;
  advanced_dining_filters: boolean;
  advanced_price_filter: boolean;
  enhanced_dietary_evidence: boolean;
  unlimited_group_sessions: boolean;
  subscription_status: string;
  subscription_provider: string;
  subscription_expires_at: string | null;
};

export const FREE_ENTITLEMENTS:
  PickSumnEntitlements = {
    plan: "free",
    is_plus: false,
    max_participants: 3,
    max_search_radius_miles: 10,
    max_saved_restaurants: 5,
    advanced_dining_filters: false,
    advanced_price_filter: false,
    enhanced_dietary_evidence: false,
    unlimited_group_sessions: false,
    subscription_status: "inactive",
    subscription_provider: "",
    subscription_expires_at: null,
  };
