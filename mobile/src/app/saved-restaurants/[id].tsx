import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ChevronLeft,
  Clock3,
  ExternalLink,
  Globe2,
  Heart,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Star,
  Store,
  Trash2,
  Truck,
  Utensils,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getSavedRestaurant,
  removeSavedRestaurant,
} from "@/features/savedRestaurants/savedRestaurantsService";
import type {
  SavedRestaurant,
} from "@/features/savedRestaurants/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


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


function getServiceText(
  restaurant: SavedRestaurant,
): string {
  const services: string[] = [];

  if (restaurant.dine_in === true) {
    services.push("Dine-in");
  }

  if (restaurant.takeout === true) {
    services.push("Takeout");
  }

  if (restaurant.delivery === true) {
    services.push("Delivery");
  }

  if (services.length === 0) {
    return "Service details unavailable";
  }

  return services.join(" · ");
}


async function openExternalUrl(
  url: string,
): Promise<void> {
  if (!url) {
    return;
  }

  try {
    const supported =
      await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        "Unable to open link",
        "This link is not supported on this device.",
      );

      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Unable to open link",
      "Something went wrong while opening this link.",
    );
  }
}


async function callRestaurant(
  phoneNumber: string,
): Promise<void> {
  if (!phoneNumber) {
    Alert.alert(
      "Phone number unavailable",
      "This restaurant does not have a phone number listed.",
    );

    return;
  }

  const cleanedPhoneNumber =
    phoneNumber.replace(
      /[^0-9+]/g,
      "",
    );

  await openExternalUrl(
    `tel:${cleanedPhoneNumber}`,
  );
}


function getAppleMapsUrl(
  restaurant: SavedRestaurant,
): string {
  if (
    restaurant.latitude !== null
    && restaurant.longitude !== null
  ) {
    const label =
      encodeURIComponent(
        restaurant.name,
      );

    return (
      "http://maps.apple.com/?daddr="
      + `${restaurant.latitude},`
      + `${restaurant.longitude}`
      + `&q=${label}`
    );
  }

  return (
    "http://maps.apple.com/?daddr="
    + encodeURIComponent(
      restaurant.formatted_address,
    )
  );
}


function getGoogleMapsUrl(
  restaurant: SavedRestaurant,
): string {
  if (restaurant.google_maps_uri) {
    return restaurant.google_maps_uri;
  }

  if (
    restaurant.latitude !== null
    && restaurant.longitude !== null
  ) {
    return (
      "https://www.google.com/maps/dir/?api=1"
      + "&destination="
      + encodeURIComponent(
        `${restaurant.latitude},${restaurant.longitude}`,
      )
      + "&destination_place_id="
      + encodeURIComponent(
        restaurant.external_id,
      )
    );
  }

  return (
    "https://www.google.com/maps/dir/?api=1"
    + "&destination="
    + encodeURIComponent(
      restaurant.formatted_address,
    )
  );
}


function openDirections(
  restaurant: SavedRestaurant,
): void {
  const appleMapsUrl =
    getAppleMapsUrl(
      restaurant,
    );

  const googleMapsUrl =
    getGoogleMapsUrl(
      restaurant,
    );

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title:
          `Directions to ${restaurant.name}`,
        options: [
          "Cancel",
          "Apple Maps",
          "Google Maps",
        ],
        cancelButtonIndex: 0,
      },
      (selectedIndex) => {
        if (selectedIndex === 1) {
          void openExternalUrl(
            appleMapsUrl,
          );
        }

        if (selectedIndex === 2) {
          void openExternalUrl(
            googleMapsUrl,
          );
        }
      },
    );

    return;
  }

  Alert.alert(
    `Directions to ${restaurant.name}`,
    "Choose a directions app.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Google Maps",
        onPress: () => {
          void openExternalUrl(
            googleMapsUrl,
          );
        },
      },
    ],
  );
}


type ActionButtonProps = {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
};


function ActionButton({
  label,
  icon,
  disabled = false,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled
          && styles.actionButtonDisabled,
        pressed
          && !disabled
          && styles.pressed,
      ]}
    >
      <View
        style={styles.actionIcon}
      >
        {icon}
      </View>

      <Text
        style={[
          styles.actionLabel,
          disabled
            && styles.actionLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}


export default function SavedRestaurantDetailScreen() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const savedRestaurantId =
    Number(
      Array.isArray(params.id)
        ? params.id[0]
        : params.id,
    );

  const [
    restaurant,
    setRestaurant,
  ] = useState<SavedRestaurant | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRemoving,
    setIsRemoving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadRestaurant =
    useCallback(async () => {
      if (
        !Number.isFinite(
          savedRestaurantId,
        )
        || savedRestaurantId <= 0
      ) {
        setError(
          "This saved restaurant could not be found.",
        );

        setIsLoading(false);

        return;
      }

      try {
        setError(null);

        const result =
          await getSavedRestaurant(
            savedRestaurantId,
          );

        setRestaurant(result);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load this saved restaurant.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, [savedRestaurantId]);

  useEffect(() => {
    void loadRestaurant();
  }, [loadRestaurant]);

  async function handleRemove() {
    if (!restaurant) {
      return;
    }

    try {
      setIsRemoving(true);
      setError(null);

      await removeSavedRestaurant(
        restaurant.id,
      );

      router.back();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to remove this restaurant.",
        ),
      );

      setIsRemoving(false);
    }
  }

  function confirmRemove() {
    if (!restaurant) {
      return;
    }

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
            void handleRemove();
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text style={styles.stateText}>
            Loading restaurant...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorHeader}>
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.backButton,
              pressed
                && styles.pressed,
            ]}
          >
            <ChevronLeft
              size={25}
              color="#07111F"
            />
          </Pressable>
        </View>

        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Restaurant unavailable
          </Text>

          <Text style={styles.errorText}>
            {error
              ?? "This restaurant could not be loaded."}
          </Text>

          <Pressable
            onPress={() =>
              void loadRestaurant()
            }
            style={({ pressed }) => [
              styles.retryButton,
              pressed
                && styles.pressed,
            ]}
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.hero}>
          {restaurant.photo_url ? (
            <Image
              source={{
                uri:
                  restaurant.photo_url,
              }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={styles.heroFallback}
            >
              <Store
                size={56}
                color="#F3344A"
              />

              <Text
                style={
                  styles.heroFallbackText
                }
              >
                Photo unavailable
              </Text>
            </View>
          )}

          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.floatingBackButton,
              pressed
                && styles.pressed,
            ]}
          >
            <ChevronLeft
              size={25}
              color="#07111F"
            />
          </Pressable>

          <Pressable
            disabled={isRemoving}
            onPress={confirmRemove}
            style={({ pressed }) => [
              styles.floatingHeartButton,
              pressed
                && !isRemoving
                && styles.pressed,
            ]}
          >
            {isRemoving ? (
              <ActivityIndicator
                size="small"
                color="#F3344A"
              />
            ) : (
              <Heart
                size={23}
                color="#F3344A"
                fill="#F3344A"
              />
            )}
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>
            {restaurant.name}
          </Text>

          <Text style={styles.typeText}>
            {getRestaurantType(
              restaurant,
            )}{" "}
            ·{" "}
            {getPriceText(
              restaurant.price_level,
            )}
          </Text>

          <View style={styles.ratingRow}>
            <Star
              size={18}
              color="#E3A008"
              fill="#E3A008"
            />

            <Text
              style={styles.ratingValue}
            >
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
                  styles.ratingCount
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

          <View style={styles.actionRow}>
            <ActionButton
              label="Directions"
              icon={
                <Navigation
                  size={22}
                  color="#F3344A"
                />
              }
              onPress={() =>
                openDirections(
                  restaurant,
                )
              }
            />

            <ActionButton
              label="Call"
              disabled={
                !restaurant.phone_number
              }
              icon={
                <Phone
                  size={22}
                  color={
                    restaurant.phone_number
                      ? "#F3344A"
                      : "#A7ADB6"
                  }
                />
              }
              onPress={() => {
                void callRestaurant(
                  restaurant.phone_number,
                );
              }}
            />

            <ActionButton
              label="Website"
              disabled={
                !restaurant.website_uri
              }
              icon={
                <Globe2
                  size={22}
                  color={
                    restaurant.website_uri
                      ? "#F3344A"
                      : "#A7ADB6"
                  }
                />
              }
              onPress={() => {
                void openExternalUrl(
                  restaurant.website_uri,
                );
              }}
            />

            {!!restaurant.menu_uri && (
              <ActionButton
                label="Menu"
                icon={
                  <Menu
                    size={22}
                    color="#F3344A"
                  />
                }
                onPress={() => {
                  void openExternalUrl(
                    restaurant.menu_uri,
                  );
                }}
              />
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MapPin
                  size={19}
                  color="#69707C"
                />
              </View>

              <View style={styles.infoContent}>
                <Text
                  style={styles.infoLabel}
                >
                  Address
                </Text>

                <Text
                  style={styles.infoValue}
                >
                  {restaurant.formatted_address
                    || "Address unavailable"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Utensils
                  size={19}
                  color="#69707C"
                />
              </View>

              <View style={styles.infoContent}>
                <Text
                  style={styles.infoLabel}
                >
                  Services
                </Text>

                <Text
                  style={styles.infoValue}
                >
                  {getServiceText(
                    restaurant,
                  )}
                </Text>
              </View>
            </View>

            {restaurant.delivery === true && (
              <>
                <View
                  style={styles.divider}
                />

                <View
                  style={styles.infoRow}
                >
                  <View
                    style={styles.infoIcon}
                  >
                    <Truck
                      size={19}
                      color="#7C4DCC"
                    />
                  </View>

                  <View
                    style={
                      styles.infoContent
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Delivery
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      Delivery is available
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Clock3
                  size={19}
                  color="#69707C"
                />
              </View>

              <View style={styles.infoContent}>
                <Text
                  style={styles.infoLabel}
                >
                  Saved
                </Text>

                <Text
                  style={styles.infoValue}
                >
                  {new Date(
                    restaurant.saved_at,
                  ).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {!!restaurant.website_uri && (
            <Pressable
              onPress={() => {
                void openExternalUrl(
                  restaurant.website_uri,
                );
              }}
              style={({ pressed }) => [
                styles.websiteButton,
                pressed
                  && styles.pressed,
              ]}
            >
              <ExternalLink
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.websiteButtonText
                }
              >
                Visit Restaurant Website
              </Text>
            </Pressable>
          )}

          <Pressable
            disabled={isRemoving}
            onPress={confirmRemove}
            style={({ pressed }) => [
              styles.removeButton,
              pressed
                && !isRemoving
                && styles.pressed,
            ]}
          >
            {isRemoving ? (
              <ActivityIndicator
                size="small"
                color="#C62828"
              />
            ) : (
              <Trash2
                size={19}
                color="#C62828"
              />
            )}

            <Text
              style={
                styles.removeButtonText
              }
            >
              Remove from Saved Restaurants
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFDFB",
  },

  content: {
    paddingBottom: 42,
  },

  hero: {
    position: "relative",
    height: 290,
    backgroundColor: "#FFF0F2",
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  heroFallbackText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#69707C",
  },

  floatingBackButton: {
    position: "absolute",
    top: 16,
    left: 18,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.13,
    shadowRadius: 9,
    elevation: 5,
  },

  floatingHeartButton: {
    position: "absolute",
    top: 16,
    right: 18,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.13,
    shadowRadius: 9,
    elevation: 5,
  },

  body: {
    marginTop: -22,
    paddingHorizontal: 18,
    paddingTop: 24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFDFB",
  },

  name: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    color: "#07111F",
  },

  typeText: {
    marginTop: 5,
    fontSize: 13,
    color: "#69707C",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },

  ratingValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#343B46",
  },

  ratingCount: {
    fontSize: 12,
    color: "#69707C",
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 19,
  },

  actionButton: {
    flex: 1,
    minHeight: 75,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  actionButtonDisabled: {
    backgroundColor: "#F5F6F7",
  },

  actionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#FFF0F2",
  },

  actionLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#07111F",
  },

  actionLabelDisabled: {
    color: "#A7ADB6",
  },

  infoCard: {
    marginTop: 19,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 15,
  },

  infoIcon: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#69707C",
    textTransform: "uppercase",
  },

  infoValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: "#343B46",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECEDEF",
  },

  websiteButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  websiteButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  removeButton: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
  },

  removeButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#C62828",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 25,
  },

  stateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#69707C",
  },

  errorHeader: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F2F3F5",
  },

  errorTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  errorText: {
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  retryButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  pressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
});