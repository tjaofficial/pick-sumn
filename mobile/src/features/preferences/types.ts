export type PreferenceLevel = -2 | -1 | 0 | 1 | 2;

export type CuisineOption = {
  id: number;
  name: string;
  slug: string;
};

export type DiningStyleOption = {
  id: number;
  name: string;
  slug: string;
};

export type DietaryTagOption = {
  id: number;
  name: string;
  slug: string;
  description: string;
};

export type FoodDislikeOption = {
  id: number;
  name: string;
  slug: string;
};

export type PreferenceOptions = {
  cuisines: CuisineOption[];
  dining_styles: DiningStyleOption[];
  dietary_tags: DietaryTagOption[];
  food_dislikes: FoodDislikeOption[];
};

export type UserCuisinePreference = {
  cuisine_id: number;
  cuisine_name: string;
  cuisine_slug: string;
  level: PreferenceLevel;
  rank: number | null;
};

export type UserDiningStylePreference = {
  dining_style_id: number;
  dining_style_name: string;
  dining_style_slug: string;
  level: PreferenceLevel;
};

export type UserDietaryPreference = {
  dietary_tag_id: number;
  dietary_tag_name: string;
  is_required: boolean;
};

export type UserFoodDislike = {
  food_dislike_id: number;
  food_dislike_name: string;
  is_absolute: boolean;
};

export type CurrentPreferences = {
  cuisines: UserCuisinePreference[];
  dining_styles: UserDiningStylePreference[];
  dietary_preferences: UserDietaryPreference[];
  food_dislikes: UserFoodDislike[];
  completion_percentage: number;
  missing_sections: string[];
};

export type SavePreferencesInput = {
  cuisines: Array<{
    cuisine_id: number;
    level: PreferenceLevel;
    rank: number | null;
  }>;

  dining_styles: Array<{
    dining_style_id: number;
    level: PreferenceLevel;
  }>;

  dietary_preferences: Array<{
    dietary_tag_id: number;
    is_required: boolean;
  }>;

  food_dislikes: Array<{
    food_dislike_id: number;
    is_absolute: boolean;
  }>;
};