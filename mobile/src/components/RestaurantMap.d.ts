import type {
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";

import type {
  NearbyRestaurantMatch,
} from "@/features/pickSessions/types";


export type RestaurantMapHandle = {
  focusRestaurant: (
    restaurant: NearbyRestaurantMatch,
  ) => void;

  focusAllRestaurants: () => void;
};


export type RestaurantMapProps = {
  restaurants: NearbyRestaurantMatch[];

  selectedRestaurantId: string | null;

  fallbackLatitude?: number;

  fallbackLongitude?: number;

  onSelectRestaurant: (
    restaurantId: string,
  ) => void;
};


export const RestaurantMap:
  ForwardRefExoticComponent<
    RestaurantMapProps
    & RefAttributes<
      RestaurantMapHandle
    >
  >;