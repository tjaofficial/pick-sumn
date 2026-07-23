import {
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  NearbyRestaurantMatch,
} from "@/features/pickSessions/types";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


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


type MarkerPosition = {
  left: `${number}%`;
  top: `${number}%`;
};


function getMarkerPosition(
  restaurant: NearbyRestaurantMatch,
  index: number,
): MarkerPosition {
  const fallbackPositions: MarkerPosition[] = [
    {
      left: "48%",
      top: "31%",
    },
    {
      left: "74%",
      top: "43%",
    },
    {
      left: "34%",
      top: "53%",
    },
    {
      left: "62%",
      top: "58%",
    },
    {
      left: "14%",
      top: "40%",
    },
    {
      left: "17%",
      top: "64%",
    },
    {
      left: "79%",
      top: "26%",
    },
    {
      left: "52%",
      top: "72%",
    },
    {
      left: "29%",
      top: "29%",
    },
    {
      left: "70%",
      top: "72%",
    },
  ];

  if (
    typeof restaurant.latitude !== "number"
    || typeof restaurant.longitude !== "number"
  ) {
    return fallbackPositions[
      index % fallbackPositions.length
    ];
  }

  const latitudeSeed = Math.abs(
    Math.sin(
      restaurant.latitude
      * 12.9898,
    ),
  );

  const longitudeSeed = Math.abs(
    Math.sin(
      restaurant.longitude
      * 78.233,
    ),
  );

  return {
    left: `${
      10
      + Math.round(
        longitudeSeed * 76,
      )
    }%`,
    top: `${
      22
      + Math.round(
        latitudeSeed * 52,
      )
    }%`,
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
        onSelectRestaurant,
      },
      forwardedRef,
    ) {
      const displayedRestaurants =
        useMemo(
          () =>
            restaurants.slice(
              0,
              14,
            ),
          [restaurants],
        );

      useImperativeHandle(
        forwardedRef,
        () => ({
          focusRestaurant() {
            return;
          },

          focusAllRestaurants() {
            return;
          },
        }),
        [],
      );

      return (
        <View style={styles.map}>
          <View
            style={
              styles.mapGridLineOne
            }
          />

          <View
            style={
              styles.mapGridLineTwo
            }
          />

          <View
            style={
              styles.mapGridLineThree
            }
          />

          <View
            style={
              styles.mapGridLineFour
            }
          />

          <View
            style={styles.mapGridLineFive}
          />

          <View
            style={styles.mapGridLineSix}
          />

          <View style={styles.water} />

          <View style={styles.parkOne} />
          <View style={styles.parkTwo} />
          <View style={styles.parkThree} />

          <Text style={styles.cityLabel}>
            Detroit
          </Text>

          <Text style={styles.regionLabelOne}>
            CASS CORRIDOR
          </Text>

          <Text style={styles.regionLabelTwo}>
            EASTERN MARKET
          </Text>

          <Text style={styles.regionLabelThree}>
            MIDTOWN
          </Text>

          {displayedRestaurants.map(
            (restaurant, index) => {
              const position =
                getMarkerPosition(
                  restaurant,
                  index,
                );

              const isSelected =
                restaurant.external_id
                === selectedRestaurantId;

              return (
                <Pressable
                  key={
                    restaurant.external_id
                  }
                  onPress={() =>
                    onSelectRestaurant(
                      restaurant.external_id,
                    )
                  }
                  style={[
                    styles.marker,
                    {
                      left: position.left,
                      top: position.top,
                    },
                    isSelected
                      && styles.markerSelected,
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
                </Pressable>
              );
            },
          )}
        </View>
      );
    },
  );


const styles = createThemedStyleSheet({
  map: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    backgroundColor: "#EDF2F8",
  },

  mapGridLineOne: {
    position: "absolute",
    left: "-10%",
    top: "28%",
    width: "125%",
    height: 2,
    backgroundColor:
      "rgba(183, 194, 205, 0.52)",
    transform: [
      {
        rotate: "-11deg",
      },
    ],
  },

  mapGridLineTwo: {
    position: "absolute",
    left: "-15%",
    top: "48%",
    width: "135%",
    height: 2,
    backgroundColor:
      "rgba(183, 194, 205, 0.56)",
    transform: [
      {
        rotate: "8deg",
      },
    ],
  },

  mapGridLineThree: {
    position: "absolute",
    left: "-15%",
    top: "64%",
    width: "135%",
    height: 2,
    backgroundColor:
      "rgba(183, 194, 205, 0.48)",
    transform: [
      {
        rotate: "-7deg",
      },
    ],
  },

  mapGridLineFour: {
    position: "absolute",
    left: "22%",
    top: "-5%",
    width: 2,
    height: "115%",
    backgroundColor:
      "rgba(183, 194, 205, 0.52)",
    transform: [
      {
        rotate: "17deg",
      },
    ],
  },

  mapGridLineFive: {
    position: "absolute",
    left: "51%",
    top: "-5%",
    width: 2,
    height: "115%",
    backgroundColor:
      "rgba(183, 194, 205, 0.47)",
    transform: [
      {
        rotate: "-9deg",
      },
    ],
  },

  mapGridLineSix: {
    position: "absolute",
    left: "72%",
    top: "-5%",
    width: 2,
    height: "115%",
    backgroundColor:
      "rgba(183, 194, 205, 0.5)",
    transform: [
      {
        rotate: "13deg",
      },
    ],
  },

  water: {
    position: "absolute",
    right: "-16%",
    bottom: "-16%",
    width: "58%",
    height: "40%",
    borderTopLeftRadius: 140,
    backgroundColor:
      "rgba(69, 187, 226, 0.46)",
    transform: [
      {
        rotate: "-8deg",
      },
    ],
  },

  parkOne: {
    position: "absolute",
    left: "7%",
    top: "18%",
    width: 60,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      "rgba(146, 210, 151, 0.43)",
  },

  parkTwo: {
    position: "absolute",
    right: "18%",
    top: "29%",
    width: 64,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      "rgba(146, 210, 151, 0.43)",
  },

  parkThree: {
    position: "absolute",
    left: "39%",
    bottom: "22%",
    width: 72,
    height: 46,
    borderRadius: 13,
    backgroundColor:
      "rgba(146, 210, 151, 0.38)",
  },

  cityLabel: {
    position: "absolute",
    left: "39%",
    bottom: "10%",
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 4,
    color:
      "rgba(7, 17, 31, 0.84)",
  },

  regionLabelOne: {
    position: "absolute",
    left: "37%",
    top: "41%",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 3,
    color:
      "rgba(80, 93, 112, 0.55)",
  },

  regionLabelTwo: {
    position: "absolute",
    right: "15%",
    bottom: "25%",
    width: 125,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    color:
      "rgba(80, 93, 112, 0.55)",
    textAlign: "center",
  },

  regionLabelThree: {
    position: "absolute",
    left: "8%",
    top: "58%",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    color:
      "rgba(80, 93, 112, 0.48)",
  },

  marker: {
    position: "absolute",
    alignItems: "center",
    transform: [
      {
        translateX: -22,
      },
      {
        translateY: -48,
      },
    ],
  },

  markerSelected: {
    zIndex: 100,
    transform: [
      {
        translateX: -24,
      },
      {
        translateY: -54,
      },
      {
        scale: 1.12,
      },
    ],
  },

  markerCircle: {
    minWidth: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 22,
    backgroundColor: "#202B38",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  markerCircleSelected: {
    minWidth: 49,
    height: 49,
    borderRadius: 25,
    backgroundColor: "#F3344A",
  },

  markerText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  markerTextSelected: {
    fontSize: 17,
  },

  markerPoint: {
    width: 14,
    height: 14,
    marginTop: -7,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#202B38",
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