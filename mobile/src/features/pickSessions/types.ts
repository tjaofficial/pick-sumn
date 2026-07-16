export type PickSessionStatus =
  | "draft"
  | "waiting"
  | "ready"
  | "matching"
  | "voting"
  | "completed"
  | "cancelled"
  | "expired";


export type DecisionMode =
  | "ranked"
  | "pick_for_us"
  | "group_vote"
  | "roulette"
  | "swipe"
  | "elimination";


export type PickSession = {
  id: string;
  title: string;
  group: string | null;
  group_name: string | null;
  status: PickSessionStatus;
  status_display: string;
  decision_mode: DecisionMode;
  decision_mode_display: string;
  participant_count: number;
  is_host: boolean;
  is_current: boolean;
  location_label: string;
  search_radius_miles: number;
  price_min: number;
  price_max: number;
  open_now: boolean;
  something_new: boolean;
  selected_restaurant_name: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};


export type NewPickSessionSetup = {
  title: string;
  groupId: string | null;
  selectedParticipantIds: number[];
  decisionMode: DecisionMode;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  searchRadiusMiles: number;
  priceMin: number;
  priceMax: number;
  openNow: boolean;
  includeDelivery: boolean;
  includeDriveThrough: boolean;
  somethingNew: boolean;
  cuisineIds: number[];
};


export type CreatePickSessionInput = {
  title?: string;
  group_id?: string | null;
  participant_ids?: number[];
  decision_mode?: DecisionMode;
  location_label?: string;
  latitude?: number | null;
  longitude?: number | null;
  search_radius_miles?: number;
  price_min?: number;
  price_max?: number;
  open_now?: boolean;
  include_delivery?: boolean;
  include_drive_through?: boolean;
  something_new?: boolean;
  cuisine_ids?: number[];
};


export type ParticipantStatus =
  | "invited"
  | "joined"
  | "ready"
  | "declined"
  | "left";


export type PickSessionParticipantUser = {
  id: number;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  date_joined: string;
};


export type PickSessionParticipant = {
  id: number;
  user: PickSessionParticipantUser;
  status: ParticipantStatus;
  status_display: string;
  is_host: boolean;
  is_current: boolean;
  vetoes_used: number;
  joined_at: string | null;
  ready_at: string | null;
  created_at: string;
};


export type PickSessionCuisineFilter = {
  id: number;
  name: string;
  slug: string;
};


export type PickSessionDetail =
  PickSession & {
    latitude: string | number | null;
    longitude: string | number | null;
    include_delivery: boolean;
    include_drive_through: boolean;
    exclude_recent_days: number;
    vetoes_per_participant: number;
    expires_at: string | null;
    started_at: string | null;
    participants: PickSessionParticipant[];
    cuisine_filters: PickSessionCuisineFilter[];
  };


export type UpdateParticipantStatusResponse = {
  participant: {
    status: ParticipantStatus;
    status_display: string;
  };

  session: {
    status: PickSessionStatus;
    status_display: string;
  };
};


export type RestaurantDietaryTag = {
  slug: string;
  label: string;
  confirmed: boolean;
};


export type NearbyRestaurantMatch = {
  external_id: string;
  name: string;
  formatted_address: string;

  latitude: number | null;
  longitude: number | null;

  primary_type: string;
  primary_type_display_name: string;
  types: string[];

  rating: number | null;
  user_rating_count: number;

  price_level: string;
  price_number: number | null;

  open_now: boolean | null;

  photo_url: string;
  website_uri: string;
  google_maps_uri: string;
  phone_number: string;
  menu_uri: string;
  dietary_tags: RestaurantDietaryTag[];

  delivery: boolean | null;
  dine_in: boolean | null;
  takeout: boolean | null;

  distance_miles: number | null;

  match_score: number;
  match_reasons: string[];
  match_warnings: string[];
};


export type PickSessionMatchSummary = {
  id: string;
  title: string;
  status: PickSessionStatus;
  status_display: string;
  decision_mode: DecisionMode;
  location_label: string;
  search_radius_miles: number;
};


export type PickSessionMatchesResponse = {
  session: PickSessionMatchSummary;
  match_count: number;
  matches: NearbyRestaurantMatch[];
};



export type GroupVoteOption = {
  id: string;
  external_id: string;
  name: string;
  rank: number;
  match_score: number;
  vote_count: number;
  restaurant: NearbyRestaurantMatch;
};


export type GroupVoteState = {
  session: PickSessionDetail;
  participants: PickSessionParticipant[];
  options: GroupVoteOption[];
  my_vote_option_id: string | null;
  total_votes: number;
  eligible_voter_count: number;
  all_votes_submitted: boolean;
  winner_option_id: string | null;
};
