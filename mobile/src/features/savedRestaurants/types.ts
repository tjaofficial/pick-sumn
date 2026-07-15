export type SavedRestaurant = {
  id: number;

  external_id: string;
  name: string;
  formatted_address: string;

  latitude: number | null;
  longitude: number | null;

  primary_type: string;
  primary_type_display_name: string;

  rating: number | null;
  user_rating_count: number;

  price_level: string;

  phone_number: string;
  website_uri: string;
  google_maps_uri: string;
  menu_uri: string;
  photo_url: string;

  delivery: boolean | null;
  dine_in: boolean | null;
  takeout: boolean | null;

  saved_at: string;
  updated_at: string;
};


export type SavedRestaurantStatus = {
  is_saved: boolean;
  saved_restaurant: SavedRestaurant | null;
};


export type SaveRestaurantPayload = {
  external_id: string;
  name: string;
  formatted_address: string;

  latitude: number | null;
  longitude: number | null;

  primary_type: string;
  primary_type_display_name: string;

  rating: number | null;
  user_rating_count: number;

  price_level: string;

  phone_number: string;
  website_uri: string;
  google_maps_uri: string;
  menu_uri: string;
  photo_url: string;

  delivery: boolean | null;
  dine_in: boolean | null;
  takeout: boolean | null;
};