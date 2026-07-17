import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldQuestion,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
  Star,
  Store,
  Truck,
  Utensils,
  X,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  Modal,
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
  useMemo,
  useState,
} from "react";

import {
  getPickSessionMatches,
} from "@/features/pickSessions/pickSessionsService";
import type {
  NearbyRestaurantMatch,
  PickSessionMatchesResponse,
} from "@/features/pickSessions/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";


type SortOption =
  | "best_match"
  | "price_high_low"
  | "price_low_high"
  | "furthest_closest"
  | "closest_furthest";


type SortOptionItem = {
  value: SortOption;
  label: string;
};


const SORT_OPTIONS: SortOptionItem[] = [
  {
    value: "best_match",
    label: "Best match first",
  },
  {
    value: "price_high_low",
    label: "$$$$ - $",
  },
  {
    value: "price_low_high",
    label: "$ - $$$$",
  },
  {
    value: "furthest_closest",
    label: "Furthest - Closest",
  },
  {
    value: "closest_furthest",
    label: "Closest - Furthest",
  },
];


function getStringParam(
  value?: string | string[],
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}


function formatPlaceType(
  value: string,
): string {
  if (!value) {
    return "Restaurant";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}


function getPriceText(
  restaurant: NearbyRestaurantMatch,
): string {
  if (restaurant.price_number) {
    return "$".repeat(
      restaurant.price_number,
    );
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


function getSortablePrice(
  restaurant: NearbyRestaurantMatch,
): number | null {
  if (
    typeof restaurant.price_number === "number"
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


function getServiceText(
  restaurant: NearbyRestaurantMatch,
): string {
  const services: string[] = [];

  if (restaurant.dine_in) {
    services.push("Dine-in");
  }

  if (restaurant.takeout) {
    services.push("Takeout");
  }

  if (restaurant.delivery) {
    services.push("Delivery");
  }

  if (services.length === 0) {
    return "Service details unavailable";
  }

  return services.join(" · ");
}


function getScoreMessage(
  score: number,
): string {
  if (score >= 90) {
    return "Excellent group match";
  }

  if (score >= 80) {
    return "Strong group match";
  }

  if (score >= 70) {
    return "Good group match";
  }

  if (score >= 60) {
    return "Possible match";
  }

  return "Worth a look";
}


function sortRestaurants(
  restaurants: NearbyRestaurantMatch[],
  sortOption: SortOption,
): NearbyRestaurantMatch[] {
  const sortedRestaurants = [
    ...restaurants,
  ];

  switch (sortOption) {
    case "price_high_low":
      return sortedRestaurants.sort(
        (firstRestaurant, secondRestaurant) => {
          const firstPrice = getSortablePrice(
            firstRestaurant,
          );

          const secondPrice = getSortablePrice(
            secondRestaurant,
          );

          if (
            firstPrice === null
            && secondPrice === null
          ) {
            return (
              secondRestaurant.match_score
              - firstRestaurant.match_score
            );
          }

          if (firstPrice === null) {
            return 1;
          }

          if (secondPrice === null) {
            return -1;
          }

          if (secondPrice !== firstPrice) {
            return secondPrice - firstPrice;
          }

          return (
            secondRestaurant.match_score
            - firstRestaurant.match_score
          );
        },
      );

    case "price_low_high":
      return sortedRestaurants.sort(
        (firstRestaurant, secondRestaurant) => {
          const firstPrice = getSortablePrice(
            firstRestaurant,
          );

          const secondPrice = getSortablePrice(
            secondRestaurant,
          );

          if (
            firstPrice === null
            && secondPrice === null
          ) {
            return (
              secondRestaurant.match_score
              - firstRestaurant.match_score
            );
          }

          if (firstPrice === null) {
            return 1;
          }

          if (secondPrice === null) {
            return -1;
          }

          if (firstPrice !== secondPrice) {
            return firstPrice - secondPrice;
          }

          return (
            secondRestaurant.match_score
            - firstRestaurant.match_score
          );
        },
      );

    case "furthest_closest":
      return sortedRestaurants.sort(
        (firstRestaurant, secondRestaurant) => {
          const firstDistance =
            firstRestaurant.distance_miles;

          const secondDistance =
            secondRestaurant.distance_miles;

          if (
            firstDistance === null
            && secondDistance === null
          ) {
            return (
              secondRestaurant.match_score
              - firstRestaurant.match_score
            );
          }

          if (firstDistance === null) {
            return 1;
          }

          if (secondDistance === null) {
            return -1;
          }

          if (
            secondDistance !== firstDistance
          ) {
            return (
              secondDistance
              - firstDistance
            );
          }

          return (
            secondRestaurant.match_score
            - firstRestaurant.match_score
          );
        },
      );

    case "closest_furthest":
      return sortedRestaurants.sort(
        (firstRestaurant, secondRestaurant) => {
          const firstDistance =
            firstRestaurant.distance_miles;

          const secondDistance =
            secondRestaurant.distance_miles;

          if (
            firstDistance === null
            && secondDistance === null
          ) {
            return (
              secondRestaurant.match_score
              - firstRestaurant.match_score
            );
          }

          if (firstDistance === null) {
            return 1;
          }

          if (secondDistance === null) {
            return -1;
          }

          if (
            firstDistance !== secondDistance
          ) {
            return (
              firstDistance
              - secondDistance
            );
          }

          return (
            secondRestaurant.match_score
            - firstRestaurant.match_score
          );
        },
      );

    case "best_match":
    default:
      return sortedRestaurants;
  }
}


async function openExternalUrl(
  url: string,
): Promise<void> {
  if (!url) {
    return;
  }

  const supported =
    await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
  }
}


type SortSelectProps = {
  selectedValue: SortOption;
  onChange: (
    value: SortOption,
  ) => void;
};


function SortSelect({
  selectedValue,
  onChange,
}: SortSelectProps) {
  const [
    isModalVisible,
    setIsModalVisible,
  ] = useState(false);

  const selectedOption =
    SORT_OPTIONS.find(
      (option) =>
        option.value === selectedValue,
    ) ?? SORT_OPTIONS[0];

  function handleSelect(
    value: SortOption,
  ) {
    onChange(value);
    setIsModalVisible(false);
  }

  return (
    <>
      <Pressable
        onPress={() =>
          setIsModalVisible(true)
        }
        style={({ pressed }) => [
          styles.sortSelect,
          pressed
            && styles.sortSelectPressed,
        ]}
      >
        <Text
          style={styles.sortSelectText}
          numberOfLines={1}
        >
          {selectedOption.label}
        </Text>

        <ChevronDown
          size={16}
          color="#69707C"
        />
      </Pressable>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setIsModalVisible(false)
        }
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() =>
            setIsModalVisible(false)
          }
        >
          <Pressable
            style={styles.sortModal}
            onPress={(
              event,
            ) => event.stopPropagation()}
          >
            <View
              style={
                styles.sortModalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sortModalTitle
                  }
                >
                  Order Matches
                </Text>

                <Text
                  style={
                    styles.sortModalSubtitle
                  }
                >
                  Choose how restaurants are
                  organized.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setIsModalVisible(false)
                }
                style={
                  styles.modalCloseButton
                }
              >
                <X
                  size={20}
                  color="#07111F"
                />
              </Pressable>
            </View>

            <View
              style={
                styles.sortOptionList
              }
            >
              {SORT_OPTIONS.map(
                (option) => {
                  const isSelected =
                    option.value
                    === selectedValue;

                  return (
                    <Pressable
                      key={
                        option.value
                      }
                      onPress={() =>
                        handleSelect(
                          option.value,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.sortOption,
                        isSelected
                          && styles.sortOptionSelected,
                        pressed
                          && styles.sortOptionPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sortOptionText,
                          isSelected
                            && styles.sortOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {isSelected && (
                        <View
                          style={
                            styles.sortCheckCircle
                          }
                        >
                          <Check
                            size={15}
                            color="#FFFFFF"
                            strokeWidth={3}
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                },
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}



function getDietaryConfidenceLabel(
  value: "high" | "moderate" | "low" | "unknown",
): string {
  switch (value) {
    case "high":
      return "High confidence";
    case "moderate":
      return "Moderate confidence";
    case "low":
      return "Limited evidence";
    default:
      return "Evidence not found";
  }
}


function getDietaryConfidenceColor(
  value: "high" | "moderate" | "low" | "unknown",
): string {
  switch (value) {
    case "high":
      return "#168B4F";
    case "moderate":
      return "#A66B00";
    case "low":
      return "#B05C00";
    default:
      return "#69707C";
  }
}


type RestaurantCardProps = {
  restaurant: NearbyRestaurantMatch;
  rank: number;
  requestedDietarySlugs: string[];
};


function RestaurantCard({
  restaurant,
  rank,
  requestedDietarySlugs,
}: RestaurantCardProps) {
  const placeType =
    restaurant.primary_type_display_name
    || formatPlaceType(
      restaurant.primary_type,
    );

  const requestedDietarySet = new Set(
    requestedDietarySlugs,
  );

  const dietaryEvidence = (
    restaurant.dietary_evidence ?? []
  ).filter(
    (item) =>
      requestedDietarySet.has(
        item.slug,
      ),
  );

  const dietaryTags = (
    restaurant.dietary_tags ?? []
  ).filter(
    (item) =>
      requestedDietarySet.has(
        item.slug,
      ),
  );

  const matchReasons =
    restaurant.match_reasons ?? [];

  const matchWarnings =
    restaurant.match_warnings ?? [];

  const [
    dietaryExpanded,
    setDietaryExpanded,
  ] = useState(false);

  return (
    <View style={styles.restaurantCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>
            #{rank}
          </Text>
        </View>

        <View
          style={styles.restaurantHeading}
        >
          <Text
            style={styles.restaurantName}
            numberOfLines={2}
          >
            {restaurant.name}
          </Text>

          <Text
            style={styles.restaurantType}
          >
            {placeType}
          </Text>
        </View>

        <View style={styles.scoreBadge}>
          <Text
            style={styles.scoreNumber}
          >
            {restaurant.match_score}%
          </Text>

          <Text
            style={styles.scoreLabel}
          >
            MATCH
          </Text>
        </View>
      </View>

      <Text style={styles.scoreMessage}>
        {getScoreMessage(
          restaurant.match_score,
        )}
      </Text>

      {!!restaurant.formatted_address && (
        <View style={styles.detailRow}>
          <MapPin
            size={17}
            color="#69707C"
          />

          <Text
            style={styles.detailText}
            numberOfLines={2}
          >
            {
              restaurant
                .formatted_address
            }
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Star
            size={17}
            color="#E3A008"
            fill="#E3A008"
          />

          <Text style={styles.statText}>
            {restaurant.rating !== null
              ? restaurant.rating.toFixed(
                  1,
                )
              : "No rating"}
          </Text>

          {restaurant.user_rating_count
            > 0 && (
            <Text
              style={styles.statSubtext}
            >
              (
              {
                restaurant
                  .user_rating_count
              }
              )
            </Text>
          )}
        </View>

        <View style={styles.statItem}>
          <Navigation
            size={17}
            color="#168B4F"
          />

          <Text style={styles.statText}>
            {restaurant.distance_miles
              !== null
              ? `${restaurant.distance_miles.toFixed(
                  1,
                )} mi`
              : "Distance unavailable"}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Store
            size={17}
            color="#F3344A"
          />

          <Text style={styles.statText}>
            {getPriceText(
              restaurant,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.serviceRow}>
        <Utensils
          size={16}
          color="#69707C"
        />

        <Text
          style={styles.serviceText}
        >
          {getServiceText(
            restaurant,
          )}
        </Text>
      </View>

      {matchReasons.length
        > 0 && (
        <View
          style={styles.reasonSection}
        >
          <Text
            style={
              styles.reasonSectionTitle
            }
          >
            Why it matched
          </Text>

          <View style={styles.reasonList}>
            {matchReasons.map(
              (reason) => (
                <View
                  key={reason}
                  style={styles.reasonRow}
                >
                  <CheckCircle2
                    size={16}
                    color="#168B4F"
                  />

                  <Text
                    style={
                      styles.reasonText
                    }
                  >
                    {reason}
                  </Text>
                </View>
              ),
            )}
          </View>
        </View>
      )}

      {dietaryEvidence.length
        > 0 && (
        <View style={styles.dietarySection}>
          <Pressable
            onPress={() =>
              setDietaryExpanded(
                (currentValue) =>
                  !currentValue,
              )
            }
            style={({ pressed }) => [
              styles.dietaryHeading,
              pressed
                && styles.dietaryHeadingPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{
              expanded: dietaryExpanded,
            }}
            accessibilityLabel={
              dietaryExpanded
                ? "Collapse dietary details"
                : "Expand dietary details"
            }
          >
            <View
              style={
                styles.dietaryHeadingContent
              }
            >
              <ShieldCheck
                size={18}
                color="#168B4F"
              />

              <View
                style={
                  styles.dietaryHeadingText
                }
              >
                <Text
                  style={
                    styles.dietaryTitle
                  }
                >
                  Dietary details
                </Text>

                <Text
                  style={
                    styles.dietarySummary
                  }
                >
                  {dietaryEvidence.length}{" "}
                  {dietaryEvidence.length
                    === 1
                    ? "dietary result"
                    : "dietary results"}
                </Text>
              </View>
            </View>

            {dietaryExpanded ? (
              <ChevronUp
                size={20}
                color="#168B4F"
              />
            ) : (
              <ChevronDown
                size={20}
                color="#168B4F"
              />
            )}
          </Pressable>

          {dietaryExpanded
            && dietaryEvidence.map(
            (dietaryItem) => {
              const confidenceColor =
                getDietaryConfidenceColor(
                  dietaryItem.confidence_level,
                );

              return (
                <View
                  key={dietaryItem.slug}
                  style={styles.dietaryItem}
                >
                  <View
                    style={
                      styles.dietaryItemHeader
                    }
                  >
                    <Text
                      style={
                        styles.dietaryItemLabel
                      }
                    >
                      {dietaryItem.label}
                    </Text>

                    <View
                      style={[
                        styles.confidenceBadge,
                        {
                          borderColor:
                            confidenceColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.confidenceBadgeText,
                          {
                            color:
                              confidenceColor,
                          },
                        ]}
                      >
                        {getDietaryConfidenceLabel(
                          dietaryItem.confidence_level,
                        )}
                      </Text>
                    </View>
                  </View>

                  {(dietaryItem.evidence ?? []).map(
                    (evidence) => (
                      <View
                        key={evidence}
                        style={
                          styles.dietaryEvidenceRow
                        }
                      >
                        <CheckCircle2
                          size={15}
                          color="#168B4F"
                        />

                        <Text
                          style={
                            styles.dietaryEvidenceText
                          }
                        >
                          {evidence}
                        </Text>
                      </View>
                    ),
                  )}

                  {(dietaryItem.contextual_review_snippets
                    ?? []).length > 0 && (
                    <View
                      style={
                        styles.contextualReviewSection
                      }
                    >
                      <Text
                        style={
                          styles.contextualReviewTitle
                        }
                      >
                        Relevant Google review
                      </Text>

                      {(dietaryItem.contextual_review_snippets
                        ?? [])
                        .slice(0, 2)
                        .map((snippet) => (
                          <View
                            key={snippet}
                            style={
                              styles.contextualReviewCard
                            }
                          >
                            <Text
                              style={
                                styles.contextualReviewText
                              }
                            >
                              “{snippet}”
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}

                  {(dietaryItem.concerns ?? []).map(
                    (concern) => (
                      <View
                        key={concern}
                        style={
                          styles.dietaryConcernRow
                        }
                      >
                        <AlertTriangle
                          size={15}
                          color="#A66B00"
                        />

                        <Text
                          style={
                            styles.dietaryConcernText
                          }
                        >
                          {concern}
                        </Text>
                      </View>
                    ),
                  )}

                  {(dietaryItem.evidence ?? []).length
                    === 0
                    && (dietaryItem.concerns ?? []).length
                    === 0 && (
                    <View
                      style={
                        styles.dietaryUnknownRow
                      }
                    >
                      <ShieldQuestion
                        size={15}
                        color="#69707C"
                      />

                      <Text
                        style={
                          styles.dietaryUnknownText
                        }
                      >
                        No specific menu or review
                        evidence was found.
                      </Text>
                    </View>
                  )}

                  {(dietaryItem.official_menu_items ?? []).length
                    > 0 && (
                    <View
                      style={
                        styles.officialItemsSection
                      }
                    >
                      <Text
                        style={
                          styles.officialItemsTitle
                        }
                      >
                        Official menu findings
                      </Text>

                      {(dietaryItem.official_menu_items ?? [])
                        .slice(0, 5)
                        .map((menuItem) => (
                          <View
                            key={menuItem}
                            style={
                              styles.officialItemRow
                            }
                          >
                            <View
                              style={
                                styles.officialItemDot
                              }
                            />

                            <Text
                              style={
                                styles.officialItemText
                              }
                            >
                              {menuItem}
                            </Text>
                          </View>
                        ))}

                      {(dietaryItem.official_menu_items ?? []).length
                        > 5 && (
                        <Text
                          style={
                            styles.moreItemsText
                          }
                        >
                          +
                          {
                            dietaryItem
                              .official_menu_items
                              .length - 5
                          }{" "}
                          more official menu findings
                        </Text>
                      )}
                    </View>
                  )}

                  {!!(
                    dietaryItem.official_source_url
                    || dietaryItem.menu_uri
                  ) && (
                    <Pressable
                      onPress={() =>
                        void openExternalUrl(
                          dietaryItem
                            .official_source_url
                          || dietaryItem.menu_uri,
                        )
                      }
                    >
                      <Text
                        style={
                          styles.menuLinkText
                        }
                      >
                        View official dietary source
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname:
                          "/restaurants/[placeId]/dietary",
                        params: {
                          placeId:
                            restaurant.external_id,
                          dietarySlug:
                            dietaryItem.slug,
                          restaurantName:
                            restaurant.name,
                          sourceUrl:
                            dietaryItem.official_source_url
                            || dietaryItem.menu_uri,
                        },
                      })
                    }
                    style={styles.dietaryDetailsButton}
                  >
                    <Text
                      style={
                        styles.dietaryDetailsButtonText
                      }
                    >
                      View Dietary Details
                    </Text>
                  </Pressable>
                </View>
              );
            },
          )}
        </View>
      )}

      {dietaryEvidence.length === 0
        && dietaryTags.length > 0 && (
        <View style={styles.dietarySection}>
          <Pressable
            onPress={() =>
              setDietaryExpanded(
                (currentValue) =>
                  !currentValue,
              )
            }
            style={({ pressed }) => [
              styles.dietaryHeading,
              pressed
                && styles.dietaryHeadingPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{
              expanded: dietaryExpanded,
            }}
            accessibilityLabel={
              dietaryExpanded
                ? "Collapse dietary details"
                : "Expand dietary details"
            }
          >
            <View
              style={
                styles.dietaryHeadingContent
              }
            >
              <ShieldQuestion
                size={18}
                color="#69707C"
              />

              <View
                style={
                  styles.dietaryHeadingText
                }
              >
                <Text
                  style={
                    styles.dietaryTitle
                  }
                >
                  Dietary details
                </Text>

                <Text
                  style={
                    styles.dietarySummary
                  }
                >
                  {dietaryTags.length}{" "}
                  {dietaryTags.length
                    === 1
                    ? "dietary tag"
                    : "dietary tags"}
                </Text>
              </View>
            </View>

            {dietaryExpanded ? (
              <ChevronUp
                size={20}
                color="#69707C"
              />
            ) : (
              <ChevronDown
                size={20}
                color="#69707C"
              />
            )}
          </Pressable>

          {dietaryExpanded
            && dietaryTags.map((dietaryTag) => (
            <View
              key={dietaryTag.slug}
              style={styles.dietaryItem}
            >
              <View style={styles.dietaryItemHeader}>
                <Text style={styles.dietaryItemLabel}>
                  {dietaryTag.label}
                </Text>

                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      borderColor: "#69707C",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confidenceBadgeText,
                      {
                        color: "#69707C",
                      },
                    ]}
                  >
                    Details available
                  </Text>
                </View>
              </View>

              <Text style={styles.dietaryUnknownText}>
                Open the full dietary page to review official
                evidence and community reports.
              </Text>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      "/restaurants/[placeId]/dietary",
                    params: {
                      placeId:
                        restaurant.external_id,
                      dietarySlug:
                        dietaryTag.slug,
                      restaurantName:
                        restaurant.name,
                      sourceUrl:
                        restaurant.menu_uri
                        || restaurant.website_uri,
                    },
                  })
                }
                style={styles.dietaryDetailsButton}
              >
                <Text
                  style={
                    styles.dietaryDetailsButtonText
                  }
                >
                  View Dietary Details
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {matchWarnings.length
        > 0 && (
        <View style={styles.warningSection}>
          {matchWarnings.map(
            (warning) => (
              <Text
                key={warning}
                style={styles.warningText}
              >
                • {warning}
              </Text>
            ),
          )}
        </View>
      )}

      <View style={styles.statusRow}>
        <View
          style={[
            styles.openBadge,
            restaurant.open_now === false
              && styles.closedBadge,
            restaurant.open_now === null
              && styles.unknownBadge,
          ]}
        >
          <Clock3
            size={14}
            color={
              restaurant.open_now
              === false
                ? "#C62828"
                : restaurant.open_now
                    === null
                  ? "#777E89"
                  : "#168B4F"
            }
          />

          <Text
            style={[
              styles.openBadgeText,
              restaurant.open_now
                === false
                && styles.closedBadgeText,
              restaurant.open_now
                === null
                && styles.unknownBadgeText,
            ]}
          >
            {restaurant.open_now === true
              ? "Open now"
              : restaurant.open_now
                  === false
                ? "Closed"
                : "Hours unavailable"}
          </Text>
        </View>

        {restaurant.delivery === true && (
          <View
            style={
              styles.deliveryBadge
            }
          >
            <Truck
              size={14}
              color="#7C4DCC"
            />

            <Text
              style={
                styles.deliveryBadgeText
              }
            >
              Delivery
            </Text>
          </View>
        )}
      </View>

      {(restaurant.google_maps_uri
        || restaurant.website_uri) && (
        <View style={styles.actionRow}>
          {!!restaurant.google_maps_uri
            && (
            <Pressable
              onPress={() =>
                void openExternalUrl(
                  restaurant
                    .google_maps_uri,
                )
              }
              style={({ pressed }) => [
                styles.mapButton,
                pressed
                  && styles.buttonPressed,
              ]}
            >
              <Navigation
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.mapButtonText
                }
              >
                View on Maps
              </Text>
            </Pressable>
          )}

          {!!restaurant.website_uri && (
            <Pressable
              onPress={() =>
                void openExternalUrl(
                  restaurant.website_uri,
                )
              }
              style={({ pressed }) => [
                styles.websiteButton,
                pressed
                  && styles.buttonPressed,
              ]}
            >
              <ExternalLink
                size={18}
                color="#F3344A"
              />

              <Text
                style={
                  styles.websiteButtonText
                }
              >
                Website
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}


export default function MatchesScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string | string[];
    decisionMode?: string | string[];
  }>();

  const sessionId = getStringParam(
    params.sessionId,
  );

  const decisionMode = getStringParam(
    params.decisionMode,
  );

  const [
    results,
    setResults,
  ] = useState<
    PickSessionMatchesResponse | null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    sortOption,
    setSortOption,
  ] = useState<SortOption>(
    "best_match",
  );

  const loadMatches = useCallback(
    async () => {
      if (!sessionId) {
        setResults(null);

        setError(
          "No Pick Session was provided. Start a new session from the Pick Sum’N tab.",
        );

        setIsLoading(false);
        setIsRefreshing(false);

        return;
      }

      try {
        setError(null);

        const response =
          await getPickSessionMatches(
            sessionId,
          );

        setResults(response);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load restaurant matches.",
          ),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sessionId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadMatches();
    }, [loadMatches]),
  );

  const displayedMatches = useMemo(
    () => {
      if (!results) {
        return [];
      }

      let availableMatches =
        results.matches;

      if (
        decisionMode === "pick_for_us"
      ) {
        availableMatches =
          results.matches.slice(0, 1);
      }

      if (
        decisionMode === "group_vote"
      ) {
        availableMatches =
          results.matches.slice(0, 5);
      }

      return sortRestaurants(
        availableMatches,
        sortOption,
      );
    },
    [
      decisionMode,
      results,
      sortOption,
    ],
  );

  const headingText =
    decisionMode === "pick_for_us"
      ? "We Picked Sum’N!"
      : decisionMode === "group_vote"
        ? "Group Vote Options"
        : "Your Best Matches";

  const descriptionText =
    decisionMode === "pick_for_us"
      ? "No debate needed. This is the strongest match for the group."
      : decisionMode === "group_vote"
        ? "These are the top five options for the group. Voting comes next."
        : "Ranked using everyone’s food preferences, distance, price, and restaurant quality.";

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadMatches();
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View
          style={styles.centerState}
        >
          <View
            style={styles.loadingIcon}
          >
            <Sparkles
              size={35}
              color="#F3344A"
            />
          </View>

          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text
            style={styles.loadingTitle}
          >
            Finding your best matches...
          </Text>

          <Text
            style={styles.loadingText}
          >
            Comparing nearby restaurants
            with everyone’s preferences.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.replace(
              "/(tabs)/pick",
            )
          }
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Matches
        </Text>

        <Pressable
          onPress={() =>
            void loadMatches()
          }
          style={styles.topBarButton}
        >
          <RefreshCw
            size={20}
            color="#07111F"
          />
        </Pressable>
      </View>

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
            tintColor="#F3344A"
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Sparkles
              size={30}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroTitle}>
            {headingText}
          </Text>

          <Text
            style={
              styles.heroDescription
            }
          >
            {descriptionText}
          </Text>

          {!!results && (
            <View
              style={styles.heroMetaRow}
            >
              <View
                style={
                  styles.heroMetaItem
                }
              >
                <MapPin
                  size={16}
                  color="#F7A4AE"
                />

                <Text
                  style={
                    styles.heroMetaText
                  }
                  numberOfLines={1}
                >
                  {
                    results.session
                      .location_label
                  }
                </Text>
              </View>

              <View
                style={
                  styles.heroMetaItem
                }
              >
                <Navigation
                  size={16}
                  color="#F7A4AE"
                />

                <Text
                  style={
                    styles.heroMetaText
                  }
                >
                  Within{" "}
                  {
                    results.session
                      .search_radius_miles
                  }{" "}
                  miles
                </Text>
              </View>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorTitle}
            >
              Matches unavailable
            </Text>

            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              onPress={() =>
                void loadMatches()
              }
              style={styles.retryButton}
            >
              <RefreshCw
                size={18}
                color="#FFFFFF"
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
          && displayedMatches.length
            === 0 && (
          <View style={styles.emptyCard}>
            <View
              style={styles.emptyIcon}
            >
              <Store
                size={34}
                color="#F3344A"
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No matches found
            </Text>

            <Text
              style={styles.emptyText}
            >
              Try increasing the distance
              or turning off some filters.
            </Text>

            <Pressable
              onPress={() =>
                router.replace(
                  "/pick/setup",
                )
              }
              style={
                styles.adjustButton
              }
            >
              <Text
                style={
                  styles.adjustButtonText
                }
              >
                Adjust Filters
              </Text>
            </Pressable>
          </View>
        )}

        {!error
          && displayedMatches.length
            > 0 && (
          <>
            <View
              style={styles.resultsHeader}
            >
              <Text
                style={styles.resultsTitle}
              >
                {decisionMode
                  === "pick_for_us"
                  ? "Tonight’s Pick"
                  : `${displayedMatches.length} Match${
                      displayedMatches.length
                      === 1
                        ? ""
                        : "es"
                    }`}
              </Text>

              {decisionMode
                !== "pick_for_us" && (
                <SortSelect
                  selectedValue={
                    sortOption
                  }
                  onChange={
                    setSortOption
                  }
                />
              )}
            </View>

            <View
              style={styles.matchesList}
            >
              {displayedMatches.map(
                (
                  restaurant,
                  index,
                ) => (
                  <RestaurantCard
                    key={
                      restaurant.external_id
                    }
                    restaurant={
                      restaurant
                    }
                    rank={index + 1}
                    requestedDietarySlugs={
                      results?.session
                        .requested_dietary_slugs
                      ?? []
                    }
                  />
                ),
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },

  topBarButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  content: {
    padding: 18,
    paddingBottom: 42,
  },

  hero: {
    alignItems: "center",
    padding: 22,
    borderRadius: 25,
    backgroundColor: "#07111F",
  },

  heroIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#F3344A",
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },

  heroDescription: {
    maxWidth: 340,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: "#C1C7D0",
    textAlign: "center",
  },

  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
  },

  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "80%",
  },

  heroMetaText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#F7A4AE",
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },

  resultsTitle: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "900",
    color: "#07111F",
  },

  sortSelect: {
    maxWidth: 190,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },

  sortSelectPressed: {
    opacity: 0.72,
  },

  sortSelectText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#4F5662",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(7, 17, 31, 0.55)",
  },

  sortModal: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },

  sortModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 15,
  },

  sortModalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
  },

  sortModalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },

  sortOptionList: {
    gap: 8,
    marginTop: 18,
  },

  sortOption: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E2E5EA",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  sortOptionSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#FFF0F2",
  },

  sortOptionPressed: {
    opacity: 0.72,
  },

  sortOptionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#343B46",
  },

  sortOptionTextSelected: {
    color: "#F3344A",
  },

  sortCheckCircle: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F3344A",
  },

  matchesList: {
    gap: 13,
  },

  restaurantCard: {
    padding: 17,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 23,
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

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  rankBadge: {
    minWidth: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#FFF0F2",
  },

  rankText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#F3344A",
  },

  restaurantHeading: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  restaurantName: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    color: "#07111F",
  },

  restaurantType: {
    marginTop: 4,
    fontSize: 12,
    color: "#69707C",
  },

  scoreBadge: {
    minWidth: 59,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#E8F7EF",
  },

  scoreNumber: {
    fontSize: 17,
    fontWeight: "900",
    color: "#168B4F",
  },

  scoreLabel: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#168B4F",
  },

  scoreMessage: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#168B4F",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 14,
  },

  detailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 14,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#343B46",
  },

  statSubtext: {
    marginLeft: -2,
    fontSize: 10,
    color: "#9298A2",
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 13,
  },

  serviceText: {
    flex: 1,
    fontSize: 11,
    color: "#69707C",
  },

  reasonSection: {
    marginTop: 15,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#F2FAF5",
  },

  reasonSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#168B4F",
  },

  reasonList: {
    gap: 7,
    marginTop: 9,
  },

  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  reasonText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#3C5146",
  },

  dietarySection: {
    marginTop: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#BFE2CF",
    borderRadius: 16,
    backgroundColor: "#F2FAF5",
  },

  dietaryHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 42,
  },

  dietaryHeadingPressed: {
    opacity: 0.7,
  },

  dietaryHeadingContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dietaryHeadingText: {
    flex: 1,
  },

  dietarySummary: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#69707C",
  },

  dietaryTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#168B4F",
  },

  dietaryItem: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#D7ECE0",
  },

  dietaryItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  dietaryItemLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#07111F",
  },

  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 999,
  },

  confidenceBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  dietaryEvidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 6,
  },

  dietaryEvidenceText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#3C5146",
  },

  contextualReviewSection: {
    marginTop: 10,
  },

  contextualReviewTitle: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: "900",
    color: "#168B4F",
  },

  contextualReviewCard: {
    marginTop: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#168B4F",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },

  contextualReviewText: {
    fontSize: 10,
    lineHeight: 16,
    fontStyle: "italic",
    color: "#3C5146",
  },

  dietaryConcernRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 6,
  },

  dietaryConcernText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#7A5A19",
  },

  dietaryUnknownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 4,
  },

  dietaryUnknownText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#69707C",
  },

  officialItemsSection: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  officialItemsTitle: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "900",
    color: "#07111F",
  },

  officialItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 5,
  },

  officialItemDot: {
    width: 5,
    height: 5,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: "#168B4F",
  },

  officialItemText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: "#3C5146",
  },

  moreItemsText: {
    marginTop: 7,
    fontSize: 10,
    fontWeight: "800",
    color: "#69707C",
  },

  menuLinkText: {
    marginTop: 9,
    fontSize: 11,
    fontWeight: "900",
    color: "#F3344A",
  },

  dietaryDetailsButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: "#168B4F",
  },

  dietaryDetailsButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  warningSection: {
    marginTop: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F0D79C",
    borderRadius: 16,
    backgroundColor: "#FFF8E8",
  },

  warningHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  warningTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    color: "#8A5C00",
  },

  warningList: {
    gap: 5,
    marginTop: 8,
  },

  warningText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#7A5A19",
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },

  openBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8F7EF",
  },

  openBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#168B4F",
  },

  closedBadge: {
    backgroundColor: "#FFF0F0",
  },

  closedBadgeText: {
    color: "#C62828",
  },

  unknownBadge: {
    backgroundColor: "#F1F2F4",
  },

  unknownBadgeText: {
    color: "#777E89",
  },

  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F2ECFF",
  },

  deliveryBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#7C4DCC",
  },

  actionRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
  },

  mapButton: {
    flex: 1,
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  mapButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  websiteButton: {
    flex: 1,
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: "#F3B6BE",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  websiteButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#F3344A",
  },

  buttonPressed: {
    opacity: 0.76,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  errorCard: {
    alignItems: "center",
    marginTop: 20,
    padding: 21,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 22,
    backgroundColor: "#FFF1F1",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#9F2424",
  },

  errorText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: "#9F2424",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  emptyCard: {
    alignItems: "center",
    marginTop: 20,
    padding: 26,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
  },

  emptyIcon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#FFF0F2",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyText: {
    maxWidth: 320,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: "#69707C",
    textAlign: "center",
  },

  adjustButton: {
    marginTop: 15,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  adjustButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  loadingIcon: {
    width: 67,
    height: 67,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#FFF0F2",
  },

  loadingTitle: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  loadingText: {
    maxWidth: 330,
    fontSize: 13,
    lineHeight: 20,
    color: "#69707C",
    textAlign: "center",
  },
});