import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  ExternalLink,
  Globe2,
  MapPin,
  Navigation,
  Phone,
  Star,
  Store,
  Utensils,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getGroupVote,
} from "@/features/pickSessions/pickSessionsService";
import type {
  GroupVoteOption,
} from "@/features/pickSessions/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


async function openUrl(
  url: string,
) {
  if (!url) {
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "Unable to open link",
      "This link could not be opened.",
    );
  }
}


function getDirectionsUrl(
  option: GroupVoteOption,
): string {
  const restaurant =
    option.restaurant;

  if (
    restaurant.latitude !== null
    && restaurant.longitude !== null
  ) {
    return (
      "https://www.google.com/maps/dir/?api=1"
      + "&destination="
      + encodeURIComponent(
        (
          `${restaurant.latitude},`
          + `${restaurant.longitude}`
        ),
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


export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string | string[];
    optionId?: string | string[];
  }>();

  const sessionId =
    Array.isArray(params.sessionId)
      ? params.sessionId[0]
      : params.sessionId;

  const optionId =
    Array.isArray(params.optionId)
      ? params.optionId[0]
      : params.optionId;

  const [
    option,
    setOption,
  ] = useState<GroupVoteOption | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  useEffect(() => {
    async function loadRestaurant() {
      if (
        !sessionId
        || !optionId
      ) {
        setError(
          "Restaurant information is missing.",
        );

        setIsLoading(false);

        return;
      }

      try {
        const voteState =
          await getGroupVote(
            sessionId,
          );

        const result =
          voteState.options.find(
            (item) =>
              item.id === optionId,
          ) ?? null;

        if (!result) {
          setError(
            "This restaurant is no longer available.",
          );
        }

        setOption(result);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load this restaurant.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRestaurant();
  }, [
    optionId,
    sessionId,
  ]);


  const reasons = useMemo(
    () =>
      option?.restaurant
        .match_reasons ?? [],
    [option],
  );


  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text style={styles.loadingText}>
            Loading restaurant...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  if (!option) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.center}>
          <Text style={styles.errorTitle}>
            Restaurant unavailable
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.backHomeButton}
          >
            <Text
              style={styles.backHomeText}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  const restaurant =
    option.restaurant;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Restaurant
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.photoBox}>
          {restaurant.photo_url ? (
            <Image
              source={{
                uri: restaurant.photo_url,
              }}
              style={styles.photo}
            />
          ) : (
            <View
              style={styles.photoFallback}
            >
              <Store
                size={46}
                color="#F3344A"
              />

              <Text
                style={
                  styles.photoFallbackText
                }
              >
                Photo unavailable
              </Text>
            </View>
          )}

          <View style={styles.matchBadge}>
            <Text
              style={styles.matchNumber}
            >
              {option.match_score}%
            </Text>

            <Text
              style={styles.matchLabel}
            >
              MATCH
            </Text>
          </View>
        </View>

        <Text style={styles.name}>
          {option.name}
        </Text>

        <Text style={styles.type}>
          {
            restaurant
              .primary_type_display_name
            || "Restaurant"
          }
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Star
              size={17}
              color="#E3A008"
              fill="#E3A008"
            />

            <Text style={styles.metaText}>
              {restaurant.rating !== null
                ? (
                    `${restaurant.rating.toFixed(1)} `
                    + `(${restaurant.user_rating_count})`
                  )
                : "Rating unavailable"}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Navigation
              size={17}
              color="#168B4F"
            />

            <Text style={styles.metaText}>
              {restaurant.distance_miles
              !== null
                ? (
                    `${restaurant.distance_miles
                      .toFixed(1)} mi`
                  )
                : "Distance unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.addressCard}>
          <MapPin
            size={19}
            color="#69707C"
          />

          <Text style={styles.addressText}>
            {restaurant.formatted_address
              || "Address unavailable"}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() =>
              void openUrl(
                getDirectionsUrl(option),
              )
            }
            style={styles.primaryAction}
          >
            <Navigation
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.primaryActionText
              }
            >
              Directions
            </Text>
          </Pressable>

          <Pressable
            disabled={
              !restaurant.phone_number
            }
            onPress={() =>
              void openUrl(
                `tel:${restaurant.phone_number}`,
              )
            }
            style={[
              styles.secondaryAction,
              !restaurant.phone_number
                && styles.disabledAction,
            ]}
          >
            <Phone
              size={20}
              color={
                restaurant.phone_number
                  ? "#F3344A"
                  : "#A7ADB6"
              }
            />

            <Text
              style={
                styles.secondaryActionText
              }
            >
              Call
            </Text>
          </Pressable>
        </View>

        {reasons.length > 0 && (
          <View style={styles.reasonCard}>
            <Text style={styles.sectionTitle}>
              Why it matched
            </Text>

            <View style={styles.reasonList}>
              {reasons.map((reason) => (
                <View
                  key={reason}
                  style={styles.reasonRow}
                >
                  <View
                    style={
                      styles.reasonBullet
                    }
                  >
                    <Text
                      style={
                        styles.reasonCheck
                      }
                    >
                      ✓
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.reasonText
                    }
                  >
                    {reason}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.linkList}>
          {!!restaurant.website_uri && (
            <Pressable
              onPress={() =>
                void openUrl(
                  restaurant.website_uri,
                )
              }
              style={styles.linkButton}
            >
              <Globe2
                size={20}
                color="#F3344A"
              />

              <Text style={styles.linkText}>
                Restaurant Website
              </Text>

              <ExternalLink
                size={17}
                color="#9298A2"
              />
            </Pressable>
          )}

          {!!restaurant.menu_uri && (
            <Pressable
              onPress={() =>
                void openUrl(
                  restaurant.menu_uri,
                )
              }
              style={styles.linkButton}
            >
              <Utensils
                size={20}
                color="#F3344A"
              />

              <Text style={styles.linkText}>
                View Menu
              </Text>

              <ExternalLink
                size={17}
                color="#9298A2"
              />
            </Pressable>
          )}
        </View>
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

  topBarSpacer: {
    width: 42,
  },

  content: {
    padding: 18,
    paddingBottom: 45,
  },

  photoBox: {
    position: "relative",
    height: 260,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#FFF0F2",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  photoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  photoFallbackText: {
    fontWeight: "800",
    color: "#69707C",
  },

  matchBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#168B4F",
  },

  matchNumber: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  matchLabel: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#FFFFFF",
  },

  name: {
    marginTop: 18,
    fontSize: 27,
    fontWeight: "900",
    color: "#07111F",
  },

  type: {
    marginTop: 4,
    fontSize: 13,
    color: "#69707C",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginTop: 14,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F5662",
  },

  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 15,
    padding: 14,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  addressText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#4F5662",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },

  primaryAction: {
    flex: 1,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  primaryActionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  secondaryAction: {
    flex: 1,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  secondaryActionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#F3344A",
  },

  disabledAction: {
    borderColor: "#D8DCE2",
    backgroundColor: "#F4F5F6",
  },

  reasonCard: {
    marginTop: 18,
    padding: 17,
    borderRadius: 20,
    backgroundColor: "#F2FAF5",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#168B4F",
  },

  reasonList: {
    gap: 10,
    marginTop: 12,
  },

  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  reasonBullet: {
    width: 19,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#168B4F",
    borderRadius: 10,
  },

  reasonCheck: {
    fontSize: 10,
    fontWeight: "900",
    color: "#168B4F",
  },

  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#3C5146",
  },

  linkList: {
    gap: 9,
    marginTop: 17,
  },

  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 55,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#E3E6EA",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#07111F",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  loadingText: {
    fontWeight: "700",
    color: "#69707C",
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#07111F",
  },

  errorText: {
    maxWidth: 340,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },

  backHomeButton: {
    marginTop: 8,
    paddingHorizontal: 19,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  backHomeText: {
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
