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
  diningStyleIds: number[];
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
  dining_style_ids: number[];
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


export type PickSessionDiningStyleFilter = {
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
    dining_style_filters: PickSessionDiningStyleFilter[];
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


export type DietaryConfidenceLevel =
  | "high"
  | "moderate"
  | "low"
  | "unknown";


export type RestaurantDietaryEvidence = {
  slug: string;
  label: string;
  confidence_level: DietaryConfidenceLevel;
  confidence_score: number;
  evidence: string[];
  concerns: string[];
  review_mention_count: number;
  contextual_review_mention_count: number;
  contextual_review_snippets: string[];
  negative_review_mention_count: number;
  found_by_dietary_search: boolean;
  dietary_search_match_count: number;
  menu_uri: string;
  official_menu_items: string[];
  official_source_url: string;
  official_last_checked_at: string | null;
  dedicated_facility: boolean;
  community_report_count: number;
  community_positive_count: number;
  community_concern_count: number;
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
  dietary_evidence: RestaurantDietaryEvidence[];

  delivery: boolean | null;
  dine_in: boolean | null;
  takeout: boolean | null;

  distance_miles: number | null;

  match_score: number;
  match_reasons: string[];
  match_warnings: string[];
  dietary_priority_tier: number;
  dietary_priority_score: number;
};


export type PickSessionMatchSummary = {
  id: string;
  title: string;
  status: PickSessionStatus;
  status_display: string;
  decision_mode: DecisionMode;
  location_label: string;
  search_radius_miles: number;
  requested_dietary_slugs: string[];
  required_dietary_slugs: string[];
  preferred_dietary_slugs: string[];
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



export type PickSessionNotificationKind =
  | "group_vote_invite"
  | "group_vote_completed";


export type PickSessionNotification = {
  id: string;
  kind: PickSessionNotificationKind;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  session_id: string;
  session_status: PickSessionStatus;
  decision_mode: DecisionMode;
};


export type PickSessionNotificationList = {
  unread_count: number;
  notifications: PickSessionNotification[];
};


export type DietaryReportOutcome =
  | "accommodated"
  | "partially_accommodated"
  | "not_accommodated"
  | "reaction";


export type RestaurantDietaryCommunityReport = {
  id: string;
  external_place_id: string;
  restaurant_name: string;
  dietary_slug: string;
  outcome: DietaryReportOutcome;
  items_clearly_labeled: boolean;
  staff_understood: boolean;
  dedicated_fryer: boolean;
  separate_preparation_area: boolean;
  gloves_changed: boolean;
  cross_contact_concern: boolean;
  restaurant_could_not_accommodate: boolean;
  reaction_after_eating: boolean;
  notes: string;
  visited_at: string | null;
  user_display_name: string;
  created_at: string;
  updated_at: string;
};


export type RestaurantDietaryCommunitySummary = {
  total_reports: number;
  accommodated_count: number;
  concern_count: number;
  items_clearly_labeled_count: number;
  staff_understood_count: number;
  dedicated_fryer_count: number;
  separate_preparation_area_count: number;
  gloves_changed_count: number;
  cross_contact_concern_count: number;
  could_not_accommodate_count: number;
  reaction_count: number;
};


export type OfficialDietaryEvidenceItem = {
  id: number;
  source_type: string;
  claim_type: string;
  summary: string;
  source_url: string;
  confidence: number;
  observed_at: string;
  expires_at: string;
};


export type OfficialRestaurantDietaryProfile = {
  external_place_id: string;
  restaurant_name: string;
  dietary_slug: string;
  confidence_score: number;
  dedicated_facility: boolean;
  official_menu_found: boolean;
  official_source_url: string;
  menu_items: string[];
  status: string;
  last_checked_at: string | null;
  expires_at: string | null;
  evidence: OfficialDietaryEvidenceItem[];
};


export type RestaurantDietaryDetailResponse = {
  external_place_id: string;
  restaurant_name: string;
  dietary_slug: string;
  official: OfficialRestaurantDietaryProfile | null;
  community_summary: RestaurantDietaryCommunitySummary;
  recent_reports: RestaurantDietaryCommunityReport[];
  my_report: RestaurantDietaryCommunityReport | null;
};


export type SubmitRestaurantDietaryReportInput = {
  restaurant_name: string;
  dietary_slug: string;
  outcome: DietaryReportOutcome;
  items_clearly_labeled: boolean;
  staff_understood: boolean;
  dedicated_fryer: boolean;
  separate_preparation_area: boolean;
  gloves_changed: boolean;
  cross_contact_concern: boolean;
  restaurant_could_not_accommodate: boolean;
  reaction_after_eating: boolean;
  notes: string;
  visited_at?: string | null;
};
