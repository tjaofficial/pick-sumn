import * as Location from "expo-location";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  CircleDollarSign,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePickDraft,
} from "@/features/pickSessions/PickDraftContext";
import {
  getProfile,
} from "@/features/profile/profileService";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import {
  getLocationDetails,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/features/pickSessions/locationService";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];
const PRICE_OPTIONS = [1, 2, 3, 4];

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/pick");
}

export default function PickFiltersScreen() {
  const {
    draft,
    updateFilters,
  } = usePickDraft();

  const [locationLabel, setLocationLabel] =
    useState(draft.locationLabel);

  const [latitude, setLatitude] =
    useState<number | null>(
      draft.latitude,
    );

  const [longitude, setLongitude] =
    useState<number | null>(
      draft.longitude,
    );

  const [
    searchRadiusMiles,
    setSearchRadiusMiles,
  ] = useState(
    draft.searchRadiusMiles,
  );

  const [priceMin, setPriceMin] =
    useState(draft.priceMin);

  const [priceMax, setPriceMax] =
    useState(draft.priceMax);

  const [openNow, setOpenNow] =
    useState(draft.openNow);

  const [
    includeDelivery,
    setIncludeDelivery,
  ] = useState(
    draft.includeDelivery,
  );

  const [
    includeDriveThrough,
    setIncludeDriveThrough,
  ] = useState(
    draft.includeDriveThrough,
  );

  const [
    somethingNew,
    setSomethingNew,
  ] = useState(
    draft.somethingNew,
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isGettingLocation,
    setIsGettingLocation,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [locationSuggestions, setLocationSuggestions] =
    useState<LocationSuggestion[]>([]);

  const [isSearchingLocations, setIsSearchingLocations] =
    useState(false);

  const [isSelectingLocation, setIsSelectingLocation] =
    useState(false);

  const locationSearchRequestId = useRef(0);

  useEffect(() => {
    async function loadDefaults() {
      try {
        setError(null);

        const profile = await getProfile();

        if (!draft.locationLabel) {
          if (profile.location_display) {
            setLocationLabel(
              profile.location_display,
            );
          }

          setSearchRadiusMiles(
            profile.default_search_radius_miles,
          );

          setPriceMin(
            profile.default_price_min,
          );

          setPriceMax(
            profile.default_price_max,
          );
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your search defaults.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDefaults();
  }, [
    draft.locationLabel,
  ]);

  useEffect(() => {
    const normalizedLocation = locationLabel.trim();

    if (
      normalizedLocation.length < 2 ||
      (latitude !== null && longitude !== null)
    ) {
      setLocationSuggestions([]);
      setIsSearchingLocations(false);
      return;
    }

    const requestId = locationSearchRequestId.current + 1;
    locationSearchRequestId.current = requestId;

    const timeout = setTimeout(() => {
      async function searchLocations() {
        try {
          setIsSearchingLocations(true);
          setError(null);

          const suggestions = await getLocationSuggestions(
            normalizedLocation,
          );

          if (locationSearchRequestId.current === requestId) {
            setLocationSuggestions(suggestions);
          }
        } catch (requestError) {
          if (locationSearchRequestId.current === requestId) {
            setLocationSuggestions([]);
            setError(
              getApiErrorMessage(
                requestError,
                "Unable to search for locations.",
              ),
            );
          }
        } finally {
          if (locationSearchRequestId.current === requestId) {
            setIsSearchingLocations(false);
          }
        }
      }

      void searchLocations();
    }, 350);

    return () => clearTimeout(timeout);
  }, [locationLabel, latitude, longitude]);

  async function selectLocationSuggestion(
    suggestion: LocationSuggestion,
  ) {
    try {
      setIsSelectingLocation(true);
      setError(null);
      setLocationSuggestions([]);

      const selectedLocation = await getLocationDetails(
        suggestion.place_id,
      );

      setLocationLabel(selectedLocation.label);
      setLatitude(selectedLocation.latitude);
      setLongitude(selectedLocation.longitude);
    } catch (requestError) {
      setLatitude(null);
      setLongitude(null);
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to select that location.",
        ),
      );
    } finally {
      setIsSelectingLocation(false);
    }
  }

  async function useCurrentLocation() {
    try {
      setIsGettingLocation(true);
      setError(null);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !==
        "granted"
      ) {
        setError(
          "Location permission is required to use your current location.",
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.Balanced,
          },
        );

      const nextLatitude =
        position.coords.latitude;

      const nextLongitude =
        position.coords.longitude;

      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      setLocationSuggestions([]);

      try {
        const addresses =
          await Location.reverseGeocodeAsync(
            {
              latitude: nextLatitude,
              longitude: nextLongitude,
            },
          );

        const address = addresses[0];

        if (address) {
          const labelParts = [
            address.city,
            address.region,
          ].filter(Boolean);

          if (labelParts.length > 0) {
            setLocationLabel(
              labelParts.join(", "),
            );
          } else {
            setLocationLabel(
              "Current Location",
            );
          }
        } else {
          setLocationLabel(
            "Current Location",
          );
        }
      } catch {
        setLocationLabel(
          "Current Location",
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to get your current location.",
      );
    } finally {
      setIsGettingLocation(false);
    }
  }

  function selectMinimumPrice(
    value: number,
  ) {
    setPriceMin(value);

    if (value > priceMax) {
      setPriceMax(value);
    }
  }

  function selectMaximumPrice(
    value: number,
  ) {
    setPriceMax(value);

    if (value < priceMin) {
      setPriceMin(value);
    }
  }

  function handleSave() {
    if (!locationLabel.trim()) {
      setError(
        "Enter a location or use your current location.",
      );
      return;
    }

    if (latitude === null || longitude === null) {
      setError(
        "Select a location from the suggestions before saving.",
      );
      return;
    }

    updateFilters({
      locationLabel:
        locationLabel.trim(),
      latitude,
      longitude,
      searchRadiusMiles,
      priceMin,
      priceMax,
      openNow,
      includeDelivery,
      includeDriveThrough,
      somethingNew,
      cuisineIds: draft.cuisineIds,
    });

    router.replace("/(tabs)/pick");
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text
            style={styles.loadingText}
          >
            Loading your search defaults...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>
            Current Filters
          </Text>

          <Text
            style={styles.topBarSubtitle}
          >
            Set what sounds good now
          </Text>
        </View>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.introCard}>
          <MapPin
            size={27}
            color="#F3344A"
          />

          <View
            style={styles.introContent}
          >
            <Text
              style={styles.introTitle}
            >
              Session filters
            </Text>

            <Text
              style={styles.introText}
            >
              These choices only apply to
              this Pick Sum’N session.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Where are you eating?
        </Text>

        <Pressable
          onPress={() =>
            void useCurrentLocation()
          }
          disabled={isGettingLocation}
          style={[
            styles.locationButton,
            isGettingLocation &&
              styles.buttonDisabled,
          ]}
        >
          {isGettingLocation ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <LocateFixed
              size={22}
              color="#FFFFFF"
            />
          )}

          <Text
            style={
              styles.locationButtonText
            }
          >
            {isGettingLocation
              ? "Getting Location..."
              : "Use Current Location"}
          </Text>
        </Pressable>

        <View style={styles.orRow}>
          <View style={styles.orLine} />

          <Text style={styles.orText}>
            OR
          </Text>

          <View style={styles.orLine} />
        </View>

        <View style={styles.locationSearchContainer}>
          <View
            style={[
              styles.inputWrapper,
              locationSuggestions.length > 0 &&
                styles.inputWrapperWithSuggestions,
            ]}
          >
            <Search
              size={20}
              color="#9298A2"
            />

            <TextInput
              value={locationLabel}
              onChangeText={(value) => {
                setLocationLabel(value);
                setLatitude(null);
                setLongitude(null);
                setError(null);
              }}
              autoCorrect={false}
              autoCapitalize="words"
              placeholder="City, neighborhood, or address"
              placeholderTextColor="#9298A2"
              style={styles.locationInput}
            />

            {(isSearchingLocations || isSelectingLocation) && (
              <ActivityIndicator
                size="small"
                color="#F3344A"
              />
            )}
          </View>

          {locationSuggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              {locationSuggestions.map((suggestion, index) => (
                <Pressable
                  key={suggestion.place_id}
                  onPress={() =>
                    void selectLocationSuggestion(suggestion)
                  }
                  disabled={isSelectingLocation}
                  style={[
                    styles.suggestionRow,
                    index < locationSuggestions.length - 1 &&
                      styles.suggestionRowBorder,
                  ]}
                >
                  <MapPin
                    size={19}
                    color="#F3344A"
                  />

                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionMainText}>
                      {suggestion.main_text}
                    </Text>

                    {!!suggestion.secondary_text && (
                      <Text style={styles.suggestionSecondaryText}>
                        {suggestion.secondary_text}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {latitude !== null &&
          longitude !== null && (
            <View
              style={
                styles.locationSuccess
              }
            >
              <Check
                size={17}
                color="#168B4F"
                strokeWidth={3}
              />

              <Text
                style={
                  styles.locationSuccessText
                }
              >
                Current coordinates captured
              </Text>
            </View>
          )}

        <Text style={styles.sectionTitle}>
          Search Distance
        </Text>

        <View style={styles.optionRow}>
          {RADIUS_OPTIONS.map(
            (radius) => {
              const selected =
                searchRadiusMiles ===
                radius;

              return (
                <Pressable
                  key={radius}
                  onPress={() =>
                    setSearchRadiusMiles(
                      radius,
                    )
                  }
                  style={[
                    styles.smallOption,
                    selected &&
                      styles.smallOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.smallOptionText,
                      selected &&
                        styles.smallOptionTextSelected,
                    ]}
                  >
                    {radius} mi
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Price Range
        </Text>

        <Text style={styles.fieldLabel}>
          Minimum
        </Text>

        <View style={styles.optionRow}>
          {PRICE_OPTIONS.map((price) => {
            const selected =
              priceMin === price;

            return (
              <Pressable
                key={`min-${price}`}
                onPress={() =>
                  selectMinimumPrice(
                    price,
                  )
                }
                style={[
                  styles.priceOption,
                  selected &&
                    styles.priceOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.priceOptionText,
                    selected &&
                      styles.priceOptionTextSelected,
                  ]}
                >
                  {"$".repeat(price)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>
          Maximum
        </Text>

        <View style={styles.optionRow}>
          {PRICE_OPTIONS.map((price) => {
            const selected =
              priceMax === price;

            return (
              <Pressable
                key={`max-${price}`}
                onPress={() =>
                  selectMaximumPrice(
                    price,
                  )
                }
                style={[
                  styles.priceOption,
                  selected &&
                    styles.priceOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.priceOptionText,
                    selected &&
                      styles.priceOptionTextSelected,
                  ]}
                >
                  {"$".repeat(price)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          Session Filters
        </Text>

        <View style={styles.toggleCard}>
          <View
            style={styles.toggleIcon}
          >
            <UtensilsCrossed
              size={21}
              color="#F3344A"
            />
          </View>

          <View
            style={styles.toggleContent}
          >
            <Text
              style={styles.toggleTitle}
            >
              Open Now
            </Text>

            <Text
              style={
                styles.toggleDescription
              }
            >
              Hide restaurants that are
              currently closed.
            </Text>
          </View>

          <Switch
            value={openNow}
            onValueChange={setOpenNow}
            trackColor={{
              false: "#D5D8DD",
              true: "#F7A4AE",
            }}
            thumbColor={
              openNow
                ? "#F3344A"
                : "#FFFFFF"
            }
          />
        </View>

        <View style={styles.toggleCard}>
          <View
            style={styles.toggleIcon}
          >
            <Truck
              size={21}
              color="#F3344A"
            />
          </View>

          <View
            style={styles.toggleContent}
          >
            <Text
              style={styles.toggleTitle}
            >
              Delivery
            </Text>

            <Text
              style={
                styles.toggleDescription
              }
            >
              Include restaurants offering
              delivery.
            </Text>
          </View>

          <Switch
            value={includeDelivery}
            onValueChange={
              setIncludeDelivery
            }
            trackColor={{
              false: "#D5D8DD",
              true: "#F7A4AE",
            }}
            thumbColor={
              includeDelivery
                ? "#F3344A"
                : "#FFFFFF"
            }
          />
        </View>

        <View style={styles.toggleCard}>
          <View
            style={styles.toggleIcon}
          >
            <CircleDollarSign
              size={21}
              color="#F3344A"
            />
          </View>

          <View
            style={styles.toggleContent}
          >
            <Text
              style={styles.toggleTitle}
            >
              Drive-Through
            </Text>

            <Text
              style={
                styles.toggleDescription
              }
            >
              Prefer fast options with a
              drive-through.
            </Text>
          </View>

          <Switch
            value={
              includeDriveThrough
            }
            onValueChange={
              setIncludeDriveThrough
            }
            trackColor={{
              false: "#D5D8DD",
              true: "#F7A4AE",
            }}
            thumbColor={
              includeDriveThrough
                ? "#F3344A"
                : "#FFFFFF"
            }
          />
        </View>

        <View style={styles.toggleCard}>
          <View
            style={styles.toggleIcon}
          >
            <Sparkles
              size={21}
              color="#E3A008"
            />
          </View>

          <View
            style={styles.toggleContent}
          >
            <Text
              style={styles.toggleTitle}
            >
              Something New
            </Text>

            <Text
              style={
                styles.toggleDescription
              }
            >
              Give unfamiliar restaurants a
              ranking bonus.
            </Text>
          </View>

          <Switch
            value={somethingNew}
            onValueChange={
              setSomethingNew
            }
            trackColor={{
              false: "#D5D8DD",
              true: "#F7A4AE",
            }}
            thumbColor={
              somethingNew
                ? "#F3344A"
                : "#FFFFFF"
            }
          />
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          style={styles.saveButton}
        >
          <Check
            size={21}
            color="#FFFFFF"
            strokeWidth={2.8}
          />

          <Text style={styles.saveButtonText}>
            Save Filters
          </Text>
        </Pressable>
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

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  topBarCenter: {
    alignItems: "center",
  },

  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  topBarSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#9298A2",
  },

  spacer: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: "#FFF0F2",
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },

  introText: {
    marginTop: 4,
    fontSize: 13,
    color: "#69707C",
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
  },

  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 55,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  locationButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginVertical: 16,
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D9DDE3",
  },

  orText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#9298A2",
  },

  locationSearchContainer: {
    position: "relative",
    zIndex: 10,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  inputWrapperWithSuggestions: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  locationInput: {
    flex: 1,
    fontSize: 16,
    color: "#07111F",
  },

  suggestionsCard: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#D9DDE3",
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  suggestionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },

  suggestionTextContainer: {
    flex: 1,
  },

  suggestionMainText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#07111F",
  },

  suggestionSecondaryText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: "#69707C",
  },

  locationSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
  },

  locationSuccessText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#168B4F",
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  smallOption: {
    minWidth: 60,
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  smallOptionSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },

  smallOptionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#343B46",
  },

  smallOptionTextSelected: {
    color: "#FFFFFF",
  },

  fieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#4E5662",
  },

  priceOption: {
    minWidth: 65,
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  priceOptionSelected: {
    borderColor: "#07111F",
    backgroundColor: "#07111F",
  },

  priceOptionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#343B46",
  },

  priceOptionTextSelected: {
    color: "#FFFFFF",
  },

  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  toggleIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  toggleContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 10,
  },

  toggleTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  toggleDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#69707C",
  },

  errorCard: {
    marginTop: 19,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 16,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    color: "#9F2424",
    fontWeight: "700",
    textAlign: "center",
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 58,
    marginTop: 25,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  saveButtonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#69707C",
  },
});