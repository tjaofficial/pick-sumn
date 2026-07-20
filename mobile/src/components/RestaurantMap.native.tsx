import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
} from "react-native";
import MapView, {
  Marker,
  type Region,
} from "react-native-maps";

import type {
  NearbyRestaurantMatch,
} from "@/features/pickSessions/types";


export type RestaurantMapHandle = {
  focusRestaurant: (
    restaurant: NearbyRestaurantMatch,
  ) => void;

  focusAllRestaurants: () => void;
};


type RestaurantMapProps = {
  restaurants: NearbyRestaurantMatch[];

  selectedRestaurantId: string | null;

  fallbackLatitude?: number;

  fallbackLongitude?: number;

  onSelectRestaurant: (
    restaurantId: string,
  ) => void;
};


type CoordinateRestaurant = {
  restaurant: NearbyRestaurantMatch;
  latitude: number;
  longitude: number;
  index: number;
};


const MAX_VISIBLE_MARKERS = 15;

const FOCUS_LATITUDE_OFFSET = 0.0065;


function getVisuallyCenteredLatitude(
  latitude: number,
): number {
  return (
    latitude
    - FOCUS_LATITUDE_OFFSET
  );
}


function getCoordinateRestaurants(
  restaurants: NearbyRestaurantMatch[],
): CoordinateRestaurant[] {
  const coordinateRestaurants:
    CoordinateRestaurant[] = [];

  restaurants
    .slice(0, MAX_VISIBLE_MARKERS)
    .forEach(
      (
        restaurant,
        index,
      ) => {
        const latitude =
          restaurant.latitude;

        const longitude =
          restaurant.longitude;

        if (
          typeof latitude !== "number"
          || typeof longitude !== "number"
          || !Number.isFinite(latitude)
          || !Number.isFinite(longitude)
          || latitude < -90
          || latitude > 90
          || longitude < -180
          || longitude > 180
        ) {
          return;
        }

        coordinateRestaurants.push({
          restaurant,
          latitude,
          longitude,
          index,
        });
      },
    );

  return coordinateRestaurants;
}


function calculateRegion(
  restaurants: CoordinateRestaurant[],
  fallbackLatitude: number,
  fallbackLongitude: number,
): Region {
  if (restaurants.length === 0) {
    return {
      latitude:
        Number.isFinite(fallbackLatitude)
          ? fallbackLatitude
          : 42.3314,

      longitude:
        Number.isFinite(fallbackLongitude)
          ? fallbackLongitude
          : -83.0458,

      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (restaurants.length === 1) {
    return {
      latitude:
        restaurants[0].latitude,

      longitude:
        restaurants[0].longitude,

      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
  }

  const latitudes =
    restaurants.map(
      (item) => item.latitude,
    );

  const longitudes =
    restaurants.map(
      (item) => item.longitude,
    );

  const minimumLatitude =
    Math.min(...latitudes);

  const maximumLatitude =
    Math.max(...latitudes);

  const minimumLongitude =
    Math.min(...longitudes);

  const maximumLongitude =
    Math.max(...longitudes);

  return {
    latitude:
      (
        minimumLatitude
        + maximumLatitude
      ) / 2,

    longitude:
      (
        minimumLongitude
        + maximumLongitude
      ) / 2,

    latitudeDelta:
      Math.max(
        (
          maximumLatitude
          - minimumLatitude
        ) * 1.35,
        0.045,
      ),

    longitudeDelta:
      Math.max(
        (
          maximumLongitude
          - minimumLongitude
        ) * 1.35,
        0.045,
      ),
  };
}


export const RestaurantMap =
  forwardRef<
    RestaurantMapHandle,
    RestaurantMapProps
  >(
    function RestaurantMap(
      {
        restaurants,
        selectedRestaurantId,
        fallbackLatitude = 42.3314,
        fallbackLongitude = -83.0458,
        onSelectRestaurant,
      },
      forwardedRef,
    ) {
      const mapRef =
        useRef<MapView | null>(null);

      const coordinateRestaurants =
        useMemo(
          () =>
            getCoordinateRestaurants(
              restaurants,
            ),
          [restaurants],
        );

      const initialRegion =
        useMemo(
          () =>
            calculateRegion(
              coordinateRestaurants,
              fallbackLatitude,
              fallbackLongitude,
            ),
          [
            coordinateRestaurants,
            fallbackLatitude,
            fallbackLongitude,
          ],
        );


      function focusAllRestaurants() {
        if (
          coordinateRestaurants.length
          === 0
        ) {
          mapRef.current
            ?.animateToRegion(
              initialRegion,
              300,
            );

          return;
        }

        if (
          coordinateRestaurants.length
          === 1
        ) {
          mapRef.current
            ?.animateToRegion(
              {
                latitude:
                  getVisuallyCenteredLatitude(
                    coordinateRestaurants[0]
                      .latitude,
                  ),

                longitude:
                  coordinateRestaurants[0]
                    .longitude,

                latitudeDelta: 0.045,
                longitudeDelta: 0.045,
              },
              300,
            );

          return;
        }

        mapRef.current
          ?.fitToCoordinates(
            coordinateRestaurants.map(
              (item) => ({
                latitude:
                  item.latitude,

                longitude:
                  item.longitude,
              }),
            ),
            {
              edgePadding: {
                top: 150,
                right: 42,
                bottom: 330,
                left: 42,
              },

              animated: true,
            },
          );
      }


      useEffect(() => {
        if (
          coordinateRestaurants.length
          === 0
        ) {
          return;
        }

        const timer =
          setTimeout(
            () => {
              focusAllRestaurants();
            },
            500,
          );

        return () => {
          clearTimeout(timer);
        };
      }, [
        coordinateRestaurants,
      ]);


      useImperativeHandle(
        forwardedRef,
        () => ({
          focusRestaurant(
            restaurant,
          ) {
            const latitude =
              restaurant.latitude;

            const longitude =
              restaurant.longitude;

            if (
              typeof latitude !== "number"
              || typeof longitude !== "number"
              || !Number.isFinite(latitude)
              || !Number.isFinite(longitude)
            ) {
              return;
            }

            mapRef.current
              ?.animateToRegion(
                {
                  latitude:
                    getVisuallyCenteredLatitude(
                      latitude,
                    ),
                  longitude,
                  latitudeDelta: 0.032,
                  longitudeDelta: 0.032,
                },
                300,
              );
          },

          focusAllRestaurants,
        }),
        [
          coordinateRestaurants,
          initialRegion,
        ],
      );


      return (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
          rotateEnabled
          pitchEnabled
          zoomEnabled
          scrollEnabled
          loadingEnabled
          loadingIndicatorColor="#F3344A"
          loadingBackgroundColor="#E9EEF5"
          mapPadding={{
            top: 125,
            right: 10,
            bottom: 300,
            left: 10,
          }}
        >
          {coordinateRestaurants.map(
            ({
              restaurant,
              latitude,
              longitude,
              index,
            }) => {
              const isSelected =
                restaurant.external_id
                === selectedRestaurantId;

              return (
                <Marker
                  key={
                    restaurant.external_id
                  }
                  identifier={
                    restaurant.external_id
                  }
                  coordinate={{
                    latitude,
                    longitude,
                  }}
                  title={restaurant.name}
                  description={
                    `${restaurant.match_score}% match`
                  }
                  pinColor={
                    isSelected
                      ? "#F3344A"
                      : "#26313E"
                  }
                  tracksViewChanges={false}
                  onPress={() =>
                    onSelectRestaurant(
                      restaurant.external_id,
                    )
                  }
                  zIndex={
                    isSelected
                      ? 1000
                      : 100 - index
                  }
                />
              );
            },
          )}
        </MapView>
      );
    },
  );


const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFill,
  },
});
