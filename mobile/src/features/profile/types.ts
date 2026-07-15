export type Profile = {
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string;
  city: string;
  state: string;
  location_display: string;
  default_search_radius_miles: number;
  default_price_min: number;
  default_price_max: number;
  exclude_recent_days: number;
  onboarding_completed: boolean;
  completion_percentage: number;
  missing_sections: string[];
  created_at: string;
  updated_at: string;
};

export type UpdateProfileInput = {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  city?: string;
  state?: string;
  default_search_radius_miles?: number;
  default_price_min?: number;
  default_price_max?: number;
  exclude_recent_days?: number;
  onboarding_completed?: boolean;
};