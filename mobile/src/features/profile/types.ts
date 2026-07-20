export type Profile = {
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string;
  city: string;
  state: string;
  default_location_label: string;
  default_location_latitude: number | string | null;
  default_location_longitude: number | string | null;
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
  dietary_section_completed?: boolean;
  dislikes_section_completed?: boolean;
};

export type UpdateProfileInput = {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  city?: string;
  state?: string;
  default_location_label?: string;
  default_location_latitude?: number | string | null;
  default_location_longitude?: number | string | null;
  default_search_radius_miles?: number;
  default_price_min?: number;
  default_price_max?: number;
  exclude_recent_days?: number;
  onboarding_completed?: boolean;
};

export type SavedLocation = {
  id: number;
  name: string;
  location_label: string;
  latitude: number | string;
  longitude: number | string;
  created_at: string;
  updated_at: string;
};

export type CreateSavedLocationInput = {
  name: string;
  location_label: string;
  latitude: number;
  longitude: number;
};
