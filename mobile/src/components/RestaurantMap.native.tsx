import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
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


function getCoordinateRestaurants(
  restaurants: NearbyRestaurantMatch[],
): CoordinateRestaurant[] {
  const coordinateRestaurants: CoordinateRestaurant[] = [];

  restaurants
    .slice(0, MAX_VISIBLE_MARKERS)
    .forEach(
      (
        restaurant,
        index,
      ) => {
        if (
          typeof restaurant.latitude
            !== "number"
          || typeof restaurant.longitude
            !== "number"
          || !Number.isFinite(
            restaurant.latitude,
          )
          || !Number.isFinite(
            restaurant.longitude,
          )
        ) {
          return;
        }

        coordinateRestaurants.push({
          restaurant,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
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
      latitude: fallbackLatitude,
      longitude: fallbackLongitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (restaurants.length === 1) {
    return {
      latitude: restaurants[0].latitude,
      longitude: restaurants[0].longitude,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
  }

  const latitudes = restaurants.map(
    (item) => item.latitude,
  );

  const longitudes = restaurants.map(
    (item) => item.longitude,
  );

  const minimumLatitude = Math.min(
    ...latitudes,
  );

  const maximumLatitude = Math.max(
    ...latitudes,
  );

  const minimumLongitude = Math.min(
    ...longitudes,
  );

  const maximumLongitude = Math.max(
    ...longitudes,
  );

  const latitude =
    (
      minimumLatitude
      + maximumLatitude
    ) / 2;

  const longitude =
    (
      minimumLongitude
      + maximumLongitude
    ) / 2;

  return {
    latitude,
    longitude,
    latitudeDelta: Math.max(
      (
        maximumLatitude
        - minimumLatitude
      ) * 1.35,
      0.045,
    ),
    longitudeDelta: Math.max(
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

      const initialRegion = useMemo(
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

      const focusAllRestaurants =
        () => {
          if (
            coordinateRestaurants.length
            === 0
          ) {
            mapRef.current
              ?.animateToRegion(
                initialRegion,
                400,
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
                    coordinateRestaurants[0]
                      .latitude,
                  longitude:
                    coordinateRestaurants[0]
                      .longitude,
                  latitudeDelta: 0.045,
                  longitudeDelta: 0.045,
                },
                400,
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
                  top: 215,
                  right: 42,
                  bottom: 185,
                  left: 42,
                },
                animated: true,
              },
            );
        };

      useEffect(() => {
        if (
          coordinateRestaurants.length
          === 0
        ) {
          return;
        }

        const timer = setTimeout(
          focusAllRestaurants,
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
            if (
              typeof restaurant.latitude
                !== "number"
              || typeof restaurant.longitude
                !== "number"
            ) {
              return;
            }

            mapRef.current
              ?.animateToRegion(
                {
                  latitude:
                    restaurant.latitude,
                  longitude:
                    restaurant.longitude,
                  latitudeDelta: 0.032,
                  longitudeDelta: 0.032,
                },
                400,
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
          showsUserLocation
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
            top: 180,
            right: 10,
            bottom: 160,
            left: 10,
          }}
          onMapReady={() => {
            const timer = setTimeout(
              focusAllRestaurants,
              250,
            );

            return () => {
              clearTimeout(timer);
            };
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
                  coordinate={{
                    latitude,
                    longitude,
                  }}
                  title={restaurant.name}
                  description={
                    `${restaurant.match_score}% match`
                  }
                  anchor={{
                    x: 0.5,
                    y: 1,
                  }}
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
                  tracksViewChanges={
                    Platform.OS
                    === "android"
                  }
                >
                  <View
                    style={[
                      styles.markerContainer,
                      isSelected
                        && styles.markerContainerSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.markerCircle,
                        isSelected
                          && styles.markerCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.markerText,
                          isSelected
                            && styles.markerTextSelected,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.markerPoint,
                        isSelected
                          && styles.markerPointSelected,
                      ]}
                    />
                  </View>
                </Marker>
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

  markerContainer: {
    alignItems: "center",
  },

  markerContainerSelected: {
    transform: [
      {
        scale: 1.06,
      },
    ],
  },

  markerCircle: {
    minWidth: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 15,
    backgroundColor: "#26313E",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },

  markerCircleSelected: {
    minWidth: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  markerText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  markerTextSelected: {
    fontSize: 13,
  },

  markerPoint: {
    width: 9,
    height: 9,
    marginTop: -5,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#26313E",
    transform: [
      {
        rotate: "45deg",
      },
    ],
  },

  markerPointSelected: {
    backgroundColor: "#F3344A",
  },
});