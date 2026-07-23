import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  RefreshCw,
  Star,
  Store,
  Trash2,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCallback,
  useState,
} from "react";

import {
  getSavedRestaurants,
  removeSavedRestaurant,
} from "@/features/savedRestaurants/savedRestaurantsService";
import type {
  SavedRestaurant,
} from "@/features/savedRestaurants/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


function getRestaurantType(
  restaurant: SavedRestaurant,
): string {
  if (
    restaurant.primary_type_display_name
  ) {
    return (
      restaurant.primary_type_display_name
    );
  }

  if (!restaurant.primary_type) {
    return "Restaurant";
  }

  return restaurant.primary_type
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}


function getPriceText(
  priceLevel: string,
): string {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "Free";

    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";

    case "PRICE_LEVEL_MODERATE":
      return "$$";

    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";

    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";

    default:
      return "Price unavailable";
  }
}


type SavedRestaurantCardProps = {
  restaurant: SavedRestaurant;
  isRemoving: boolean;
  onRemove: () => void;
};


function SavedRestaurantCard({
  restaurant,
  isRemoving,
  onRemove,
}: SavedRestaurantCardProps) {
  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname:
            "/saved-restaurants/[id]",
          params: {
            id: String(
              restaurant.id,
            ),
          },
        });
      }}
      style={({ pressed }) => [
        styles.restaurantCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageBox}>
        {restaurant.photo_url ? (
          <Image
            source={{
              uri:
                restaurant.photo_url,
            }}
            style={
              styles.restaurantImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.imageFallback
            }
          >
            <Store
              size={34}
              color={themeColor("#F3344A", "color")}
            />
          </View>
        )}

        <View style={styles.savedBadge}>
          <Heart
            size={16}
            color={themeColor("#FFFFFF", "color")}
            fill="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View
            style={
              styles.cardTitleContent
            }
          >
            <Text
              style={
                styles.restaurantName
              }
              numberOfLines={1}
            >
              {restaurant.name}
            </Text>

            <Text
              style={
                styles.restaurantType
              }
              numberOfLines={1}
            >
              {getRestaurantType(
                restaurant,
              )}{" "}
              ·{" "}
              {getPriceText(
                restaurant.price_level,
              )}
            </Text>
          </View>

          <Pressable
            disabled={isRemoving}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            style={({ pressed }) => [
              styles.removeButton,
              pressed
                && styles.pressed,
            ]}
          >
            {isRemoving ? (
              <ActivityIndicator
                size="small"
                color={themeColor("#F3344A", "color")}
              />
            ) : (
              <Trash2
                size={18}
                color={themeColor("#F3344A", "color")}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.ratingRow}>
          <Star
            size={15}
            color={themeColor("#E3A008", "color")}
            fill="#E3A008"
          />

          <Text style={styles.ratingText}>
            {restaurant.rating !== null
              ? restaurant.rating.toFixed(
                  1,
                )
              : "No rating"}
          </Text>

          {restaurant.user_rating_count
            > 0 && (
            <Text
              style={
                styles.reviewCount
              }
            >
              (
              {
                restaurant.user_rating_count
              }
              )
            </Text>
          )}
        </View>

        <View style={styles.addressRow}>
          <MapPin
            size={15}
            color={themeColor("#69707C", "color")}
          />

          <Text
            style={styles.addressText}
            numberOfLines={2}
          >
            {restaurant.formatted_address
              || "Address unavailable"}
          </Text>
        </View>

        <View style={styles.cardBottomRow}>
          <Text style={styles.savedText}>
            Saved restaurant
          </Text>

          <ChevronRight
            size={19}
            color={themeColor("#9298A2", "color")}
          />
        </View>
      </View>
    </Pressable>
  );
}


export default function SavedRestaurantsScreen() {
  useAppTheme();

  const [
    savedRestaurants,
    setSavedRestaurants,
  ] = useState<SavedRestaurant[]>(
    [],
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    removingId,
    setRemovingId,
  ] = useState<number | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadSavedRestaurants =
    useCallback(async () => {
      try {
        setError(null);

        const restaurants =
          await getSavedRestaurants();

        setSavedRestaurants(
          restaurants,
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your saved restaurants.",
          ),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedRestaurants();
    }, [loadSavedRestaurants]),
  );

  async function handleRefresh() {
    setIsRefreshing(true);

    await loadSavedRestaurants();
  }

  async function confirmRemove(
    restaurant: SavedRestaurant,
  ) {
    Alert.alert(
      "Remove saved restaurant?",
      `${restaurant.name} will be removed from your saved restaurants.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void handleRemove(
              restaurant,
            );
          },
        },
      ],
    );
  }

  async function handleRemove(
    restaurant: SavedRestaurant,
  ) {
    try {
      setRemovingId(
        restaurant.id,
      );

      setError(null);

      await removeSavedRestaurant(
        restaurant.id,
      );

      setSavedRestaurants(
        (currentRestaurants) =>
          currentRestaurants.filter(
            (currentRestaurant) =>
              currentRestaurant.id
              !== restaurant.id,
          ),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to remove this restaurant.",
        ),
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft
            size={25}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Saved Restaurants
          </Text>

          <Text style={styles.subtitle}>
            Your favorite places in one spot
          </Text>
        </View>

        <View style={styles.headerHeart}>
          <Heart
            size={22}
            color={themeColor("#F3344A", "color")}
            fill="#F3344A"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />

          <Text style={styles.stateText}>
            Loading saved restaurants...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={themeColor("#F3344A", "color")}
            />
          }
        >
          {error && (
            <View style={styles.errorCard}>
              <Text
                style={styles.errorText}
              >
                {error}
              </Text>

              <Pressable
                onPress={() =>
                  void loadSavedRestaurants()
                }
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed
                    && styles.pressed,
                ]}
              >
                <RefreshCw
                  size={16}
                  color={themeColor("#FFFFFF", "color")}
                />

                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Try Again
                </Text>
              </Pressable>
            </View>
          )}

          {!error
            && savedRestaurants.length
              === 0 && (
            <View style={styles.emptyState}>
              <View
                style={
                  styles.emptyHeartCircle
                }
              >
                <Heart
                  size={42}
                  color={themeColor("#F3344A", "color")}
                />
              </View>

              <Text
                style={styles.emptyTitle}
              >
                No saved restaurants yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Tap the heart on a restaurant
                to save it here for later.
              </Text>

              <Pressable
                onPress={() =>
                  router.replace(
                    "/(tabs)/map",
                  )
                }
                style={({ pressed }) => [
                  styles.findButton,
                  pressed
                    && styles.pressed,
                ]}
              >
                <MapPin
                  size={18}
                  color={themeColor("#FFFFFF", "color")}
                />

                <Text
                  style={
                    styles.findButtonText
                  }
                >
                  Find Restaurants
                </Text>
              </Pressable>
            </View>
          )}

          {!error
            && savedRestaurants.length
              > 0 && (
            <>
              <Text
                style={styles.resultCount}
              >
                {savedRestaurants.length} saved{" "}
                {savedRestaurants.length
                  === 1
                  ? "restaurant"
                  : "restaurants"}
              </Text>

              <View style={styles.list}>
                {savedRestaurants.map(
                  (restaurant) => (
                    <SavedRestaurantCard
                      key={restaurant.id}
                      restaurant={
                        restaurant
                      }
                      isRemoving={
                        removingId
                        === restaurant.id
                      }
                      onRemove={() =>
                        void confirmRemove(
                          restaurant,
                        )
                      }
                    />
                  ),
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}


const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    backgroundColor: "#FFFDFB",
  },

  header: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F2F3F5",
  },

  headerText: {
    flex: 1,
    marginHorizontal: 13,
  },

  title: {
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
  },

  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#69707C",
  },

  headerHeart: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  resultCount: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#69707C",
  },

  list: {
    gap: 12,
  },

  restaurantCard: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  imageBox: {
    position: "relative",
    width: 104,
    height: 112,
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#FFF0F2",
  },

  restaurantImage: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  savedBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },

  cardTitleContent: {
    flex: 1,
    minWidth: 0,
  },

  restaurantName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: "#07111F",
  },

  restaurantType: {
    marginTop: 2,
    fontSize: 10,
    color: "#69707C",
  },

  removeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#FFF0F2",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },

  ratingText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#343B46",
  },

  reviewCount: {
    fontSize: 9,
    color: "#7B818B",
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 7,
  },

  addressText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 13,
    color: "#69707C",
  },

  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 6,
  },

  savedText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#F3344A",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },

  stateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#69707C",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 25,
  },

  emptyHeartCircle: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
    backgroundColor: "#FFF0F2",
  },

  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  emptyText: {
    maxWidth: 285,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#69707C",
    textAlign: "center",
  },

  findButton: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 21,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  findButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorCard: {
    alignItems: "center",
    marginBottom: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 17,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#9F2424",
    textAlign: "center",
  },

  retryButton: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F3344A",
  },

  retryButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  pressed: {
    opacity: 0.76,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },
});