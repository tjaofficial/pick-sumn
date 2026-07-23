import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router, useFocusEffect } from "expo-router";
import {
  ChevronDown,
  Clock3,
  ExternalLink,
  Filter,
  Globe2,
  Heart,
  List,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  Store,
  Truck,
  Utensils,
  X,
} from "lucide-react-native";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import {
  RestaurantMap,
  type RestaurantMapHandle,
} from "@/components/RestaurantMap";
import {
  getCurrentPickSession,
  getExploreNearbyRestaurants,
  getPickSessionMatches,
  getRecentPickSessions,
  recordRestaurantDetailView,
  selectPickSessionRestaurant,
} from "@/features/pickSessions/pickSessionsService";
import type {
  NearbyRestaurantMatch,
  PickSession,
  PickSessionMatchesResponse,
} from "@/features/pickSessions/types";
import {
  getSavedRestaurantStatus,
  getSavedRestaurants,
  removeSavedRestaurantByExternalId,
  saveRestaurant,
} from "@/features/savedRestaurants/savedRestaurantsService";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

const pickSumnLogo = require("../../../assets/images/pick-sumn-logo.png");

function getPriceText(restaurant: NearbyRestaurantMatch): string {
  if (typeof restaurant.price_number === "number") {
    if (restaurant.price_number === 0) {
      return "Free";
    }

    return "$".repeat(restaurant.price_number);
  }

  switch (restaurant.price_level) {
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

function getRestaurantType(restaurant: NearbyRestaurantMatch): string {
  if (restaurant.primary_type_display_name) {
    return restaurant.primary_type_display_name;
  }

  if (!restaurant.primary_type) {
    return "Restaurant";
  }

  return restaurant.primary_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getHoursText(restaurant: NearbyRestaurantMatch): string {
  if (restaurant.open_now === true) {
    return "Open now";
  }

  if (restaurant.open_now === false) {
    return "Closed";
  }

  return "Hours unavailable";
}

function getServiceText(restaurant: NearbyRestaurantMatch): string {
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

async function openExternalUrl(url: string): Promise<void> {
  if (!url) {
    return;
  }

  try {
    const supported = await Linking.canOpenURL(url);

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

async function callRestaurant(phoneNumber: string): Promise<void> {
  if (!phoneNumber) {
    Alert.alert(
      "Phone number unavailable",
      "This restaurant does not have a phone number listed.",
    );

    return;
  }

  const cleanPhoneNumber = phoneNumber.replace(/[^0-9+]/g, "");

  await openExternalUrl(`tel:${cleanPhoneNumber}`);
}

function getAppleMapsUrl(restaurant: NearbyRestaurantMatch): string {
  if (restaurant.latitude !== null && restaurant.longitude !== null) {
    const label = encodeURIComponent(restaurant.name);

    return (
      `http://maps.apple.com/?daddr=` +
      `${restaurant.latitude},` +
      `${restaurant.longitude}` +
      `&q=${label}`
    );
  }

  return (
    "http://maps.apple.com/?daddr=" +
    encodeURIComponent(restaurant.formatted_address)
  );
}

function getGoogleMapsDirectionsUrl(restaurant: NearbyRestaurantMatch): string {
  if (restaurant.latitude !== null && restaurant.longitude !== null) {
    return (
      "https://www.google.com/maps/dir/?api=1" +
      "&destination=" +
      encodeURIComponent(`${restaurant.latitude},${restaurant.longitude}`) +
      "&destination_place_id=" +
      encodeURIComponent(restaurant.external_id)
    );
  }

  return (
    "https://www.google.com/maps/dir/?api=1" +
    "&destination=" +
    encodeURIComponent(restaurant.formatted_address)
  );
}

function openDirections(restaurant: NearbyRestaurantMatch): void {
  const appleMapsUrl = getAppleMapsUrl(restaurant);

  const googleMapsUrl =
    restaurant.google_maps_uri || getGoogleMapsDirectionsUrl(restaurant);

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Directions to ${restaurant.name}`,
        options: ["Cancel", "Apple Maps", "Google Maps"],
        cancelButtonIndex: 0,
      },
      (selectedIndex) => {
        if (selectedIndex === 1) {
          void openExternalUrl(appleMapsUrl);
        }

        if (selectedIndex === 2) {
          void openExternalUrl(googleMapsUrl);
        }
      },
    );

    return;
  }

  Alert.alert(`Directions to ${restaurant.name}`, "Choose a directions app.", [
    {
      text: "Cancel",
      style: "cancel",
    },
    {
      text: "Google Maps",
      onPress: () => {
        void openExternalUrl(googleMapsUrl);
      },
    },
  ]);
}

const EXPLORE_BATCH_SIZE = 15;
const EXPLORE_RADIUS_OPTIONS = [5, 10, 15, 25];

function shuffleRestaurants(
  restaurants: NearbyRestaurantMatch[],
): NearbyRestaurantMatch[] {
  const shuffled = [...restaurants];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1),
    );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getRestaurantPriceNumber(
  restaurant: NearbyRestaurantMatch,
): number | null {
  if (
    typeof restaurant.price_number
    === "number"
  ) {
    return restaurant.price_number;
  }

  switch (restaurant.price_level) {
    case "PRICE_LEVEL_FREE":
      return 0;
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return null;
  }
}

function pickExploreBatch(
  candidates: NearbyRestaurantMatch[],
  previousIds: Set<string>,
): NearbyRestaurantMatch[] {
  const unseen = candidates.filter(
    (restaurant) =>
      !previousIds.has(
        restaurant.external_id,
      ),
  );

  const source =
    unseen.length >= Math.min(
      EXPLORE_BATCH_SIZE,
      candidates.length,
    )
      ? unseen
      : candidates;

  return shuffleRestaurants(source).slice(
    0,
    EXPLORE_BATCH_SIZE,
  );
}


type MatchListCardProps = {
  restaurant: NearbyRestaurantMatch;
  index: number;
  isSelected: boolean;
  onPress: () => void;
  exploreMode?: boolean;
  isSaved?: boolean;
  isInHistory?: boolean;
};

function MatchListCard({
  restaurant,
  index,
  isSelected,
  onPress,
  exploreMode = false,
  isSaved = false,
  isInHistory = false,
}: MatchListCardProps) {
  const photoUrl = restaurant.photo_url || "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.matchCard,
        isSelected && styles.matchCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.imageBox}>
        {photoUrl ? (
          <Image
            source={{
              uri: photoUrl,
            }}
            style={styles.restaurantImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Store size={30} color={themeColor("#F3344A", "color")} />
          </View>
        )}

        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant.name}
          </Text>

          {exploreMode ? (
            <View style={styles.exploreCardBadges}>
              {isSaved && (
                <Heart
                  size={15}
                  color={themeColor("#F3344A", "color")}
                  fill="#F3344A"
                />
              )}

              {isInHistory && (
                <Clock3
                  size={15}
                  color={themeColor("#69707C", "color")}
                />
              )}
            </View>
          ) : (
            <Text style={styles.matchScore}>
              {restaurant.match_score}%
            </Text>
          )}
        </View>

        <Text style={styles.restaurantMeta} numberOfLines={1}>
          {getRestaurantType(restaurant)} · {getPriceText(restaurant)} ·{" "}
          {restaurant.distance_miles !== null
            ? `${restaurant.distance_miles.toFixed(1)} mi`
            : "Distance unavailable"}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Star size={14} color={themeColor("#E3A008", "color")} fill="#E3A008" />

            <Text style={styles.statText}>
              {restaurant.rating !== null
                ? restaurant.rating.toFixed(1)
                : "No rating"}
            </Text>
          </View>

          <View style={styles.stat}>
            <Navigation size={14} color={themeColor("#168B4F", "color")} />

            <Text style={styles.statText}>
              {restaurant.distance_miles !== null
                ? `${restaurant.distance_miles.toFixed(1)} mi`
                : "--"}
            </Text>
          </View>

          {!exploreMode && (
            <View style={styles.stat}>
              <Heart
                size={14}
                color={themeColor("#F3344A", "color")}
              />

              <Text style={styles.statText}>
                Group fit
              </Text>
            </View>
          )}

          {exploreMode && isSaved && (
            <View style={styles.stat}>
              <Heart
                size={14}
                color={themeColor("#F3344A", "color")}
                fill="#F3344A"
              />

              <Text style={styles.statText}>
                Saved
              </Text>
            </View>
          )}

          {exploreMode && isInHistory && (
            <View style={styles.stat}>
              <Clock3
                size={14}
                color={themeColor("#69707C", "color")}
              />

              <Text style={styles.statText}>
                Picked before
              </Text>
            </View>
          )}
        </View>

        <View style={styles.pillRow}>
          {!exploreMode && restaurant.match_reasons.slice(0, 2).map((reason) => (
            <View key={reason} style={styles.reasonPill}>
              <Text style={styles.reasonPillText} numberOfLines={1}>
                {reason}
              </Text>
            </View>
          ))}

          {restaurant.open_now === true && (
            <View style={styles.openPill}>
              <Text style={styles.openPillText}>Open now</Text>
            </View>
          )}

          {restaurant.delivery === true && (
            <View style={styles.deliveryPill}>
              <Text style={styles.deliveryPillText}>Delivery</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

type DetailActionProps = {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onPress: () => void;
};

function DetailAction({
  label,
  icon,
  disabled = false,
  onPress,
}: DetailActionProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.detailAction,
        disabled && styles.detailActionDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.detailActionIcon}>{icon}</View>

      <Text
        style={[
          styles.detailActionText,
          disabled && styles.detailActionTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type RestaurantDetailProps = {
  restaurant: NearbyRestaurantMatch;
  rank: number;
  onClose: () => void;
  onSelect: () => void;
  isSelecting: boolean;
  allowSelection: boolean;
  exploreMode?: boolean;
};

function RestaurantDetail({
  restaurant,
  rank,
  onClose,
  onSelect,
  isSelecting,
  allowSelection,
  exploreMode = false,
}: RestaurantDetailProps) {
  const photoUrl = restaurant.photo_url || "";

  const [isSaved, setIsSaved] = useState(false);

  const [isCheckingSaved, setIsCheckingSaved] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedStatus() {
      try {
        setIsCheckingSaved(true);

        const status = await getSavedRestaurantStatus(restaurant.external_id);

        if (isMounted) {
          setIsSaved(status.is_saved);
        }
      } catch {
        if (isMounted) {
          setIsSaved(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSaved(false);
        }
      }
    }

    void loadSavedStatus();

    return () => {
      isMounted = false;
    };
  }, [restaurant.external_id]);

  async function toggleSavedRestaurant() {
    if (isSaving || isCheckingSaved) {
      return;
    }

    try {
      setIsSaving(true);

      if (isSaved) {
        await removeSavedRestaurantByExternalId(restaurant.external_id);

        setIsSaved(false);

        return;
      }

      await saveRestaurant({
        external_id: restaurant.external_id,

        name: restaurant.name,

        formatted_address: restaurant.formatted_address || "",

        latitude: restaurant.latitude,

        longitude: restaurant.longitude,

        primary_type: restaurant.primary_type || "",

        primary_type_display_name: restaurant.primary_type_display_name || "",

        rating: restaurant.rating,

        user_rating_count: restaurant.user_rating_count,

        price_level: restaurant.price_level || "",

        phone_number: restaurant.phone_number || "",

        website_uri: restaurant.website_uri || "",

        google_maps_uri: restaurant.google_maps_uri || "",

        menu_uri: restaurant.menu_uri || "",

        photo_url: restaurant.photo_url || "",

        delivery: restaurant.delivery,

        dine_in: restaurant.dine_in,

        takeout: restaurant.takeout,
      });

      setIsSaved(true);
    } catch (requestError) {
      Alert.alert(
        "Unable to update favorites",
        getApiErrorMessage(
          requestError,
          isSaved
            ? "Unable to remove this restaurant from your saved restaurants."
            : "Unable to save this restaurant.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailTopRow}>
        <View style={styles.detailRank}>
          <Text style={styles.detailRankText}>#{rank}</Text>
        </View>

        <View style={styles.detailHeading}>
          <Text style={styles.detailName} numberOfLines={2}>
            {restaurant.name}
          </Text>

          <Text style={styles.detailType}>{getRestaurantType(restaurant)}</Text>
        </View>

        <View style={styles.detailHeaderActions}>
          <Pressable
            disabled={isSaving || isCheckingSaved}
            onPress={() => {
              void toggleSavedRestaurant();
            }}
            style={({ pressed }) => [
              styles.favoriteButton,
              isSaved && styles.favoriteButtonSaved,
              pressed && styles.pressed,
            ]}
          >
            {isSaving || isCheckingSaved ? (
              <ActivityIndicator size="small" color={themeColor("#F3344A", "color")} />
            ) : (
              <Heart
                size={21}
                color={themeColor("#F3344A", "color")}
                fill={isSaved ? "#F3344A" : "transparent"}
              />
            )}
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <X size={21} color={themeColor("#07111F", "color")} />
          </Pressable>
        </View>
      </View>

      <View style={styles.detailScoreRow}>
        {exploreMode ? (
          <>
            <View style={styles.exploreDetailIcon}>
              <MapPin
                size={25}
                color={themeColor("#168B4F", "color")}
              />
            </View>

            <View style={styles.detailSummary}>
              <Text style={styles.detailSummaryTitle}>
                Explore nearby
              </Text>

              <Text style={styles.detailSummaryText}>
                Found near your current or saved location.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.detailScoreBadge}>
              <Text style={styles.detailScoreNumber}>
                {restaurant.match_score}%
              </Text>

              <Text style={styles.detailScoreLabel}>MATCH</Text>
            </View>

            <View style={styles.detailSummary}>
              <Text style={styles.detailSummaryTitle}>
                Great match for your group
              </Text>

              <Text style={styles.detailSummaryText}>
                Ranked using cuisine preferences, distance, and customer ratings.
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.actionGrid}>
        <DetailAction
          label="Directions"
          icon={<Navigation size={21} color={themeColor("#F3344A", "color")} />}
          onPress={() => openDirections(restaurant)}
        />

        <DetailAction
          label="Call"
          disabled={!restaurant.phone_number}
          icon={
            <Phone
              size={21}
              color={restaurant.phone_number ? "#F3344A" : "#A7ADB6"}
            />
          }
          onPress={() => {
            void callRestaurant(restaurant.phone_number);
          }}
        />

        <DetailAction
          label="Website"
          disabled={!restaurant.website_uri}
          icon={
            <Globe2
              size={21}
              color={restaurant.website_uri ? "#F3344A" : "#A7ADB6"}
            />
          }
          onPress={() => {
            void openExternalUrl(restaurant.website_uri);
          }}
        />

        {!!restaurant.menu_uri && (
          <DetailAction
            label="Menu"
            icon={<Menu size={21} color={themeColor("#F3344A", "color")} />}
            onPress={() => {
              void openExternalUrl(restaurant.menu_uri);
            }}
          />
        )}
      </View>

      <View style={styles.detailStats}>
        <View style={styles.detailStat}>
          <Clock3
            size={18}
            color={restaurant.open_now === false ? "#C62828" : "#168B4F"}
          />

          <Text style={styles.detailStatLabel}>Hours</Text>

          <Text
            style={[
              styles.detailStatValue,
              restaurant.open_now === false && styles.closedText,
            ]}
          >
            {getHoursText(restaurant)}
          </Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailStat}>
          <Star size={18} color={themeColor("#E3A008", "color")} fill="#E3A008" />

          <Text style={styles.detailStatLabel}>Ratings</Text>

          <Text style={styles.detailStatValue}>
            {restaurant.rating !== null
              ? `${restaurant.rating.toFixed(
                  1,
                )} (${restaurant.user_rating_count})`
              : "Unavailable"}
          </Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailStat}>
          <Navigation size={18} color={themeColor("#168B4F", "color")} />

          <Text style={styles.detailStatLabel}>Distance</Text>

          <Text style={styles.detailStatValue}>
            {restaurant.distance_miles !== null
              ? `${restaurant.distance_miles.toFixed(1)} mi`
              : "Unavailable"}
          </Text>
        </View>
      </View>

      <View style={styles.detailAddress}>
        <MapPin size={18} color={themeColor("#69707C", "color")} />

        <Text style={styles.detailAddressText}>
          {restaurant.formatted_address || "Address unavailable"}
        </Text>
      </View>

      <View style={styles.detailPhotoBox}>
        {photoUrl ? (
          <Image
            source={{
              uri: photoUrl,
            }}
            style={styles.detailPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.detailPhotoFallback}>
            <Store size={42} color={themeColor("#F3344A", "color")} />

            <Text style={styles.detailPhotoFallbackText}>
              Photo unavailable
            </Text>
          </View>
        )}
      </View>

      {!exploreMode && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Why it matched</Text>

          <View style={styles.detailReasonList}>
            {restaurant.match_reasons.map((reason) => (
              <View key={reason} style={styles.detailReasonRow}>
                <View style={styles.detailCheckCircle}>
                  <Text style={styles.detailCheckText}>✓</Text>
                </View>

                <Text style={styles.detailReasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.detailPillRow}>
        <View style={styles.servicePill}>
          <Utensils size={14} color={themeColor("#4F5662", "color")} />

          <Text style={styles.servicePillText}>
            {getServiceText(restaurant)}
          </Text>
        </View>

        {restaurant.delivery === true && (
          <View style={styles.detailDeliveryPill}>
            <Truck size={14} color={themeColor("#7C4DCC", "color")} />

            <Text style={styles.detailDeliveryText}>Delivery</Text>
          </View>
        )}

        {restaurant.dietary_tags.map((tag) => (
          <View
            key={tag.slug}
            style={[
              styles.dietaryPill,
              !tag.confirmed && styles.unverifiedPill,
            ]}
          >
            <Text
              style={[
                styles.dietaryPillText,
                !tag.confirmed && styles.unverifiedPillText,
              ]}
            >
              {tag.confirmed ? tag.label : `${tag.label}: Verify`}
            </Text>
          </View>
        ))}
      </View>

      {allowSelection && (
      <Pressable
        onPress={onSelect}
        disabled={isSelecting}
        style={[
          styles.selectRestaurantButton,
          isSelecting
            && styles.selectRestaurantButtonDisabled,
        ]}
      >
        {isSelecting ? (
          <ActivityIndicator
            size="small"
            color={themeColor("#FFFFFF", "color")}
          />
        ) : (
          <Sparkles
            size={19}
            color={themeColor("#FFFFFF", "color")}
          />
        )}

        <Text style={styles.selectRestaurantButtonText}>
          {isSelecting
            ? "Selecting..."
            : "Select This Restaurant"}
        </Text>
      </Pressable>
      )}

      {!!restaurant.website_uri && (
        <Pressable
          onPress={() => {
            void openExternalUrl(restaurant.website_uri);
          }}
          style={({ pressed }) => [
            styles.fullWebsiteButton,
            pressed && styles.pressed,
          ]}
        >
          <ExternalLink size={18} color={themeColor("#FFFFFF", "color")} />

          <Text style={styles.fullWebsiteButtonText}>
            Visit Restaurant Website
          </Text>
        </Pressable>
      )}
    </BottomSheetScrollView>
  );
}

function FilterToggle({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <View style={styles.filterToggleRow}>
      <View style={styles.filterToggleText}>
        <Text style={styles.filterToggleLabel}>
          {label}
        </Text>

        {!!subtitle && (
          <Text style={styles.filterToggleSubtitle}>
            {subtitle}
          </Text>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: themeColor("#D8DCE2", "backgroundColor"),
          true: themeColor("#F7A4AE", "backgroundColor"),
        }}
        thumbColor={
          value
            ? themeColor("#F3344A", "backgroundColor")
            : themeColor("#FFFFFF", "backgroundColor")
        }
      />
    </View>
  );
}


export default function MapScreen() {
  useAppTheme();

  const mapRef = useRef<RestaurantMapHandle | null>(null);

  const bottomSheetRef = useRef<BottomSheet | null>(null);

  const sheetPosition = useSharedValue(0);

  const floatingMapButtonsStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: Math.min(Math.max(sheetPosition.value - 135, 210), 390),
      },
    ],
  }));

  const snapPoints = useMemo(() => ["12%", "46%", "88%"], []);

  const [activeSession, setActiveSession] = useState<PickSession | null>(null);

  const [response, setResponse] = useState<PickSessionMatchesResponse | null>(
    null,
  );

  const [explorePool, setExplorePool] = useState<
    NearbyRestaurantMatch[]
  >([]);

  const [exploreBatch, setExploreBatch] = useState<
    NearbyRestaurantMatch[]
  >([]);

  const [exploreRadius, setExploreRadius] = useState(10);
  const [explorePriceMin, setExplorePriceMin] = useState(0);
  const [explorePriceMax, setExplorePriceMax] = useState(4);
  const [exploreOpenNow, setExploreOpenNow] = useState(false);
  const [exploreFavoritesOnly, setExploreFavoritesOnly] = useState(false);
  const [exploreSomethingNew, setExploreSomethingNew] = useState(false);
  const [exploreLocationLabel, setExploreLocationLabel] = useState("");
  const [isExploreRefreshing, setIsExploreRefreshing] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const [savedRestaurantIds, setSavedRestaurantIds] = useState<Set<string>>(
    new Set(),
  );

  const [historyRestaurantIds, setHistoryRestaurantIds] = useState<Set<string>>(
    new Set(),
  );

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);

  const [detailRestaurantId, setDetailRestaurantId] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);


  const [
    selectingRestaurantId,
    setSelectingRestaurantId,
  ] = useState<string | null>(
    null,
  );

  const [error, setError] = useState<string | null>(null);

  const getExploreCoordinates = useCallback(
    async (): Promise<{
      latitude: number | null;
      longitude: number | null;
    }> => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          return {
            latitude: null,
            longitude: null,
          };
        }

        const current =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        return {
          latitude:
            current.coords.latitude,
          longitude:
            current.coords.longitude,
        };
      } catch {
        return {
          latitude: null,
          longitude: null,
        };
      }
    },
    [],
  );

  const loadExplore = useCallback(
    async (
      radiusMiles: number,
    ) => {
      const coordinates =
        await getExploreCoordinates();

      const [
        exploreResponse,
        savedRestaurants,
        recentSessions,
      ] = await Promise.all([
        getExploreNearbyRestaurants({
          latitude:
            coordinates.latitude,
          longitude:
            coordinates.longitude,
          radiusMiles,
        }),
        getSavedRestaurants(),
        getRecentPickSessions(),
      ]);

      const savedIds = new Set(
        savedRestaurants.map(
          (restaurant) =>
            restaurant.external_id,
        ),
      );

      const historyIds = new Set(
        recentSessions
          .map(
            (session) =>
              session
                .selected_restaurant_external_id,
          )
          .filter(Boolean),
      );

      setSavedRestaurantIds(savedIds);
      setHistoryRestaurantIds(historyIds);
      setExploreLocationLabel(
        exploreResponse.location.label,
      );
      setExplorePool(
        exploreResponse.restaurants,
      );
    },
    [getExploreCoordinates],
  );

  const loadMatches = useCallback(async () => {
    try {
      setError(null);

      const currentSession =
        await getCurrentPickSession();

      setActiveSession(currentSession);

      if (!currentSession) {
        setResponse(null);
        setSelectedRestaurantId(null);
        setDetailRestaurantId(null);

        await loadExplore(
          exploreRadius,
        );

        return;
      }

      const matchesResponse =
        await getPickSessionMatches(
          currentSession.id,
        );

      setResponse(matchesResponse);

      setSelectedRestaurantId(matchesResponse.matches[0]?.external_id ?? null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load map matches."));
    } finally {
      setIsLoading(false);
    }
  }, [
    exploreRadius,
    loadExplore,
  ]);

  useFocusEffect(
    useCallback(() => {
      void loadMatches();
    }, [loadMatches]),
  );

  const filteredExploreCandidates =
    useMemo(() => {
      return explorePool.filter(
        (restaurant) => {
          if (
            exploreOpenNow
            && restaurant.open_now
            !== true
          ) {
            return false;
          }

          if (
            exploreFavoritesOnly
            && !savedRestaurantIds.has(
              restaurant.external_id,
            )
          ) {
            return false;
          }

          if (
            exploreSomethingNew
            && historyRestaurantIds.has(
              restaurant.external_id,
            )
          ) {
            return false;
          }

          const price =
            getRestaurantPriceNumber(
              restaurant,
            );

          if (
            price !== null
            && (
              price < explorePriceMin
              || price > explorePriceMax
            )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      exploreFavoritesOnly,
      exploreOpenNow,
      explorePool,
      explorePriceMax,
      explorePriceMin,
      exploreSomethingNew,
      historyRestaurantIds,
      savedRestaurantIds,
    ]);

  useEffect(() => {
    if (activeSession) {
      return;
    }

    setExploreBatch(
      (currentBatch) =>
        pickExploreBatch(
          filteredExploreCandidates,
          new Set(
            currentBatch.map(
              (restaurant) =>
                restaurant.external_id,
            ),
          ),
        ),
    );
  }, [
    activeSession,
    filteredExploreCandidates,
  ]);

  const refreshExploreBatch =
    useCallback(() => {
      setExploreBatch(
        (currentBatch) =>
          pickExploreBatch(
            filteredExploreCandidates,
            new Set(
              currentBatch.map(
                (restaurant) =>
                  restaurant.external_id,
              ),
            ),
          ),
      );
    }, [
      filteredExploreCandidates,
    ]);

  const applyExploreRadius =
    useCallback(
      async (
        radiusMiles: number,
      ) => {
        try {
          setIsExploreRefreshing(true);
          setError(null);
          setExploreRadius(
            radiusMiles,
          );

          await loadExplore(
            radiusMiles,
          );
        } catch (requestError) {
          setError(
            getApiErrorMessage(
              requestError,
              "Unable to explore nearby restaurants.",
            ),
          );
        } finally {
          setIsExploreRefreshing(false);
        }
      },
      [loadExplore],
    );

  const matches =
    activeSession
      ? response?.matches ?? []
      : exploreBatch;

  const selectedRestaurant =
    matches.find(
      (restaurant) => restaurant.external_id === selectedRestaurantId,
    ) ??
    matches[0] ??
    null;

  const detailRestaurant =
    matches.find(
      (restaurant) => restaurant.external_id === detailRestaurantId,
    ) ?? null;

  const fallbackLatitude =
    selectedRestaurant?.latitude ??
    matches.find((restaurant) => restaurant.latitude !== null)?.latitude ??
    42.3314;

  const fallbackLongitude =
    selectedRestaurant?.longitude ??
    matches.find((restaurant) => restaurant.longitude !== null)?.longitude ??
    -83.0458;

  const selectMapRestaurant = useCallback(
    (restaurantId: string) => {
      setSelectedRestaurantId(
        restaurantId,
      );

      setDetailRestaurantId(
        restaurantId,
      );

      requestAnimationFrame(
        () => {
          bottomSheetRef.current
            ?.snapToIndex(1);
        },
      );
    },
    [],
  );

  const openRestaurantDetails = useCallback(
    (restaurant: NearbyRestaurantMatch) => {
      setSelectedRestaurantId(restaurant.external_id);

      setDetailRestaurantId(restaurant.external_id);

      if (activeSession) {
        void recordRestaurantDetailView(
          activeSession.id,
          restaurant,
        );
      }

      mapRef.current?.focusRestaurant(restaurant);

      bottomSheetRef.current?.snapToIndex(2);
    },
    [activeSession],
  );

  function closeRestaurantDetails() {
    setDetailRestaurantId(null);

    bottomSheetRef.current?.snapToIndex(1);
  }

  async function completeSelection(
    restaurant: NearbyRestaurantMatch,
  ) {
    if (!activeSession) {
      return;
    }

    try {
      setSelectingRestaurantId(
        restaurant.external_id,
      );

      await selectPickSessionRestaurant(
        activeSession.id,
        restaurant.external_id,
        activeSession.decision_mode
        === "pick_for_us"
          ? "surprise_me"
          : "ranked_manual",
      );

    } catch (requestError) {
      Alert.alert(
        "Unable to select restaurant",
        getApiErrorMessage(
          requestError,
          "This restaurant could not be selected.",
        ),
      );
    } finally {
      setSelectingRestaurantId(
        null,
      );
    }
  }


  function confirmSelection(
    restaurant: NearbyRestaurantMatch,
  ) {
    Alert.alert(
      `Choose ${restaurant.name}?`,
      (
        activeSession?.decision_mode
        === "pick_for_us"
          ? (
              "Pick Sum’N chose this restaurant. "
              + "Are you going with this pick?"
            )
          : (
              "This will complete the Pick Session "
              + "and notify everyone that this is "
              + "where the group is eating."
            )
      ),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Pick This Place",
          onPress: () =>
            void completeSelection(
              restaurant,
            ),
        },
      ],
    );
  }


  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={themeColor("#F3344A", "color")} />

        <Text style={styles.loadingText}>Loading your map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <RestaurantMap
        ref={mapRef}
        restaurants={matches}
        selectedRestaurantId={selectedRestaurantId}
        fallbackLatitude={fallbackLatitude}
        fallbackLongitude={fallbackLongitude}
        onSelectRestaurant={selectMapRestaurant}
      />

      <View pointerEvents="none" style={styles.topHeader}>
        <Image source={pickSumnLogo} style={styles.logo} resizeMode="contain" />
      </View>

      <Animated.View style={[styles.mapButtons, floatingMapButtonsStyle]}>
        <Pressable
          onPress={() => {
            if (selectedRestaurant) {
              mapRef.current?.focusRestaurant(selectedRestaurant);
            }
          }}
          style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
        >
          <LocateFixed size={20} color={themeColor("#F3344A", "color")} />
        </Pressable>

        <Pressable
          onPress={() => {
            setDetailRestaurantId(null);

            mapRef.current?.focusAllRestaurants();

            bottomSheetRef.current?.snapToIndex(0);
          }}
          style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
        >
          <List size={20} color={themeColor("#F3344A", "color")} />
        </Pressable>
      </Animated.View>

      <BottomSheet
        ref={bottomSheetRef}
        animatedPosition={sheetPosition}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        enableContentPanningGesture
        enableHandlePanningGesture
        animateOnMount
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        style={styles.sheetShadow}
      >
        {detailRestaurant ? (
          <RestaurantDetail
            restaurant={detailRestaurant}
            rank={
              matches.findIndex(
                (restaurant) =>
                  restaurant.external_id === detailRestaurant.external_id,
              ) + 1
            }
            onClose={closeRestaurantDetails}
            onSelect={() =>
              confirmSelection(
                detailRestaurant,
              )
            }
            isSelecting={
              selectingRestaurantId
              === detailRestaurant.external_id
            }
            allowSelection={
              Boolean(activeSession)
              && activeSession?.decision_mode
                !== "group_vote"
            }
            exploreMode={!activeSession}
          />
        ) : (
          <>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeading}>
                <Text style={styles.sheetTitle}>
                  {activeSession
                    ? `${matches.length} Great Match${
                        matches.length === 1 ? "" : "es"
                      } ✨`
                    : "Explore restaurants around you."}
                </Text>

                <Text style={styles.sheetSubtitle}>
                  {activeSession
                    ? "Ranked by how well everyone will love it"
                    : exploreLocationLabel
                      ? `${matches.length} nearby places · ${exploreLocationLabel}`
                      : `${matches.length} nearby places`}
                </Text>
              </View>

              <View style={styles.headerActions}>
                {activeSession ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/matches",
                        params: {
                          sessionId: activeSession.id,
                          decisionMode: activeSession.decision_mode,
                        },
                      })
                    }
                    style={styles.bestMatchButton}
                  >
                    <Text style={styles.bestMatchText}>Best Match</Text>

                    <ChevronDown
                      size={12}
                      color={themeColor("#F3344A", "color")}
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={refreshExploreBatch}
                    disabled={isExploreRefreshing}
                    style={styles.bestMatchButton}
                  >
                    {isExploreRefreshing ? (
                      <ActivityIndicator
                        size="small"
                        color={themeColor("#F3344A", "color")}
                      />
                    ) : (
                      <RefreshCw
                        size={13}
                        color={themeColor("#F3344A", "color")}
                      />
                    )}

                    <Text style={styles.bestMatchText}>
                      Refresh Places
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    if (activeSession) {
                      router.push("/pick/setup");
                      return;
                    }

                    setIsFilterModalVisible(true);
                  }}
                  style={styles.roundFilterButton}
                >
                  <Filter
                    size={16}
                    color={themeColor("#07111F", "color")}
                  />
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Map unavailable</Text>

                <Text style={styles.errorText}>{error}</Text>

                <Pressable
                  onPress={() => void loadMatches()}
                  style={styles.retryButton}
                >
                  <RefreshCw size={16} color={themeColor("#FFFFFF", "color")} />

                  <Text style={styles.retryText}>Try Again</Text>
                </Pressable>
              </View>
            )}

            {!error && matches.length === 0 && (
              <View style={styles.emptyCard}>
                <Store
                  size={32}
                  color={themeColor("#F3344A", "color")}
                />

                <Text style={styles.emptyTitle}>
                  {activeSession
                    ? "No matches found"
                    : "No nearby places match these filters"}
                </Text>

                <Text style={styles.emptyText}>
                  {activeSession
                    ? "Change your filters and try again."
                    : "Try widening the radius or turning off a quick filter."}
                </Text>

                {!activeSession && (
                  <Pressable
                    onPress={() =>
                      setIsFilterModalVisible(true)
                    }
                    style={styles.startButton}
                  >
                    <Text style={styles.startText}>
                      Adjust Filters
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {!error && matches.length > 0 && (
              <BottomSheetScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {matches.map((restaurant, index) => (
                  <MatchListCard
                    key={restaurant.external_id}
                    restaurant={restaurant}
                    index={index}
                    isSelected={
                      restaurant.external_id
                      === selectedRestaurantId
                    }
                    onPress={() =>
                      openRestaurantDetails(
                        restaurant,
                      )
                    }
                    exploreMode={
                      !activeSession
                    }
                    isSaved={
                      savedRestaurantIds.has(
                        restaurant.external_id,
                      )
                    }
                    isInHistory={
                      historyRestaurantIds.has(
                        restaurant.external_id,
                      )
                    }
                  />
                ))}

                {!activeSession && (
                  <View style={styles.exploreCta}>
                    <Sparkles
                      size={25}
                      color={themeColor("#F3344A", "color")}
                    />

                    <Text style={styles.exploreCtaTitle}>
                      Can’t decide?
                    </Text>

                    <Text style={styles.exploreCtaText}>
                      Let Pick Sum’N narrow it down for you.
                    </Text>

                    <Pressable
                      onPress={() =>
                        router.replace(
                          "/(tabs)/pick",
                        )
                      }
                      style={styles.exploreCtaButton}
                    >
                      <Text
                        style={
                          styles.exploreCtaButtonText
                        }
                      >
                        PICK SUM’N
                      </Text>
                    </Pressable>
                  </View>
                )}
              </BottomSheetScrollView>
            )}
          </>
        )}
      </BottomSheet>

      <Modal
        visible={
          isFilterModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setIsFilterModalVisible(false)
        }
      >
        <View style={styles.filterOverlay}>
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <View>
                <Text style={styles.filterTitle}>
                  Explore Filters
                </Text>

                <Text style={styles.filterSubtitle}>
                  Keep discovery broad or narrow it down.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setIsFilterModalVisible(false)
                }
                style={styles.filterClose}
              >
                <X
                  size={20}
                  color={themeColor("#07111F", "color")}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.filterLabel}>
                Radius
              </Text>

              <View style={styles.filterOptionRow}>
                {EXPLORE_RADIUS_OPTIONS.map(
                  (radius) => (
                    <Pressable
                      key={radius}
                      onPress={() => {
                        void applyExploreRadius(
                          radius,
                        );
                      }}
                      style={[
                        styles.filterChip,
                        exploreRadius === radius
                          && styles.filterChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          exploreRadius === radius
                            && styles.filterChipTextSelected,
                        ]}
                      >
                        {radius} mi
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>

              <Text style={styles.filterLabel}>
                Price
              </Text>

              <View style={styles.priceFilterRow}>
                {[1, 2, 3, 4].map(
                  (price) => {
                    const selected =
                      price >= explorePriceMin
                      && price <= explorePriceMax;

                    return (
                      <Pressable
                        key={price}
                        onPress={() => {
                          if (
                            explorePriceMin === price
                            && explorePriceMax === price
                          ) {
                            setExplorePriceMin(0);
                            setExplorePriceMax(4);
                            return;
                          }

                          setExplorePriceMin(price);
                          setExplorePriceMax(price);
                        }}
                        style={[
                          styles.filterChip,
                          selected
                            && styles.filterChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selected
                              && styles.filterChipTextSelected,
                          ]}
                        >
                          {"$".repeat(price)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <FilterToggle
                label="Open Now"
                value={exploreOpenNow}
                onValueChange={
                  setExploreOpenNow
                }
              />

              <FilterToggle
                label="Favorites Only"
                value={
                  exploreFavoritesOnly
                }
                onValueChange={
                  setExploreFavoritesOnly
                }
              />

              <FilterToggle
                label="Something New"
                subtitle="Hide restaurants from your Recent History"
                value={
                  exploreSomethingNew
                }
                onValueChange={
                  setExploreSomethingNew
                }
              />

              <Pressable
                onPress={() => {
                  setExplorePriceMin(0);
                  setExplorePriceMax(4);
                  setExploreOpenNow(false);
                  setExploreFavoritesOnly(false);
                  setExploreSomethingNew(false);
                }}
                style={styles.clearFiltersButton}
              >
                <Text style={styles.clearFiltersText}>
                  Clear Quick Filters
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setIsFilterModalVisible(false);
                  refreshExploreBatch();
                }}
                style={styles.doneFiltersButton}
              >
                <Text style={styles.doneFiltersText}>
                  Done
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    backgroundColor: "#E9EEF5",
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFF9F2",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },

  topHeader: {
    position: "absolute",
    top: 38,
    left: 0,
    right: 0,
    height: 118,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  logo: {
    width: 218,
    height: 132,
  },

  mapButtons: {
    position: "absolute",
    top: 0,
    right: 15,
    zIndex: 5,
    gap: 10,
  },

  mapButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 4,
  },

  sheetBackground: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: "#FFFFFF",
  },

  sheetShadow: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.11,
    shadowRadius: 11,
    elevation: 9,
  },

  handleIndicator: {
    width: 52,
    height: 4,
    backgroundColor: "#D8DCE2",
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 9,
  },

  sheetHeading: {
    flex: 1,
    minWidth: 0,
  },

  sheetTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: "#07111F",
  },

  sheetSubtitle: {
    marginTop: 1,
    fontSize: 8,
    lineHeight: 11,
    color: "#69707C",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  bestMatchButton: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  bestMatchText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#F3344A",
  },

  roundFilterButton: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F1F2F4",
  },

  listContent: {
    gap: 8,
    paddingHorizontal: 15,
    paddingTop: 1,
    paddingBottom: 24,
  },

  matchCard: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.045,
    shadowRadius: 5,
    elevation: 1,
  },

  matchCardSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#FFF9FA",
  },

  imageBox: {
    position: "relative",
    width: 96,
    height: 96,
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  restaurantImage: {
    width: 96,
    height: 96,
  },

  imageFallback: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F2",
  },

  rankBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    zIndex: 2,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  rankText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  cardBody: {
    flex: 1,
    minWidth: 0,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },

  restaurantName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  matchScore: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    color: "#F3344A",
  },

  restaurantMeta: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    color: "#343B46",
  },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 6,
  },

  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  statText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#343B46",
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },

  reasonPill: {
    maxWidth: 105,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFF5DD",
  },

  reasonPillText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#805A00",
  },

  openPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E8F7EF",
  },

  openPillText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#168B4F",
  },

  deliveryPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F2ECFF",
  },

  deliveryPillText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#7C4DCC",
  },

  detailContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 45,
  },

  detailTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  detailRank: {
    minWidth: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  detailRankText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#F3344A",
  },

  detailHeading: {
    flex: 1,
    minWidth: 0,
  },

  detailName: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    color: "#07111F",
  },

  detailType: {
    marginTop: 3,
    fontSize: 12,
    color: "#69707C",
  },

  detailHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  favoriteButton: {
    width: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F7C8CE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  favoriteButtonSaved: {
    borderColor: "#F3344A",
    backgroundColor: "#FFF0F2",
  },

  closeButton: {
    width: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#F1F2F4",
  },

  detailScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 15,
    padding: 13,
    borderRadius: 18,
    backgroundColor: "#F2FAF5",
  },

  detailScoreBadge: {
    minWidth: 66,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: "#E0F5E9",
  },

  detailScoreNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#168B4F",
  },

  detailScoreLabel: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#168B4F",
  },

  detailSummary: {
    flex: 1,
  },

  detailSummaryTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#168B4F",
  },

  detailSummaryText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "#4C6156",
  },

  actionGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 15,
  },

  detailAction: {
    flex: 1,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  detailActionDisabled: {
    backgroundColor: "#F5F6F7",
  },

  detailActionIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#FFF0F2",
  },

  detailActionText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#07111F",
  },

  detailActionTextDisabled: {
    color: "#A7ADB6",
  },

  detailStats: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  detailStat: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
  },

  detailStatLabel: {
    marginTop: 5,
    fontSize: 9,
    color: "#69707C",
  },

  detailStatValue: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "900",
    color: "#168B4F",
    textAlign: "center",
  },

  closedText: {
    color: "#C62828",
  },

  detailDivider: {
    width: 1,
    backgroundColor: "#ECEDEF",
  },

  detailAddress: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#F7F8FA",
  },

  detailAddressText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#4F5662",
  },

  detailPhotoBox: {
    height: 210,
    overflow: "hidden",
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#FFF0F2",
  },

  detailPhoto: {
    width: "100%",
    height: "100%",
  },

  detailPhotoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  detailPhotoFallbackText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#69707C",
  },

  detailSection: {
    marginTop: 15,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F2FAF5",
  },

  detailSectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#168B4F",
  },

  detailReasonList: {
    gap: 9,
    marginTop: 10,
  },

  detailReasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  detailCheckCircle: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#168B4F",
    borderRadius: 9,
  },

  detailCheckText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#168B4F",
  },

  detailReasonText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#3C5146",
  },

  detailPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },

  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F1F2F4",
  },

  servicePillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4F5662",
  },

  detailDeliveryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F2ECFF",
  },

  detailDeliveryText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#7C4DCC",
  },

  dietaryPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E8F7EF",
  },

  dietaryPillText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#168B4F",
  },

  unverifiedPill: {
    backgroundColor: "#FFF5DD",
  },

  unverifiedPillText: {
    color: "#805A00",
  },

  fullWebsiteButton: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 17,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  fullWebsiteButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorCard: {
    alignItems: "center",
    marginHorizontal: 15,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFF1F1",
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#9F2424",
  },

  errorText: {
    marginTop: 6,
    fontSize: 11,
    color: "#9F2424",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 11,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "#F3344A",
  },

  retryText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  emptyCard: {
    alignItems: "center",
    marginHorizontal: 15,
    padding: 22,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 11,
    color: "#69707C",
    textAlign: "center",
  },

  startButton: {
    marginTop: 12,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "#F3344A",
  },

  startText: {
    fontSize: 10,
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
  selectRestaurantButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  selectRestaurantButtonDisabled: {
    opacity: 0.6,
  },

  selectRestaurantButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  exploreCardBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  exploreDetailIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#E0F5E9",
  },

  exploreCta: {
    alignItems: "center",
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 20,
    backgroundColor: "#FFF7F8",
  },

  exploreCtaTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  exploreCtaText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: "#69707C",
    textAlign: "center",
  },

  exploreCtaButton: {
    minWidth: 160,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  exploreCtaButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  filterOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(7, 17, 31, 0.55)",
  },

  filterCard: {
    maxHeight: "82%",
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFFFF",
  },

  filterHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },

  filterTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#07111F",
  },

  filterSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#69707C",
  },

  filterClose: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#F1F2F4",
  },

  filterLabel: {
    marginTop: 15,
    marginBottom: 9,
    fontSize: 13,
    fontWeight: "900",
    color: "#07111F",
  },

  filterOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  priceFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    minWidth: 61,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },

  filterChipSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#FFF0F2",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F5662",
  },

  filterChipTextSelected: {
    color: "#F3344A",
  },

  filterToggleRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },

  filterToggleText: {
    flex: 1,
  },

  filterToggleLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: "#07111F",
  },

  filterToggleSubtitle: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "#69707C",
  },

  clearFiltersButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 18,
  },

  clearFiltersText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#69707C",
  },

  doneFiltersButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },

  doneFiltersText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
