import * as Location from "expo-location";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  LocateFixed,
  MapPin,
  Search,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
  getLocationDetails,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/features/pickSessions/locationService";
import {
  getProfile,
  getSavedLocations,
} from "@/features/profile/profileService";
import type {
  SavedLocation,
} from "@/features/profile/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];


function locationsMatch(
  savedLocation: SavedLocation,
  locationLabel: string,
  latitude: number | null,
  longitude: number | null,
): boolean {
  const labelMatches =
    savedLocation.location_label
      .trim()
      .toLowerCase()
    === locationLabel
      .trim()
      .toLowerCase();

  if (!labelMatches) {
    return false;
  }

  if (
    latitude === null
    || longitude === null
  ) {
    return true;
  }

  const latitudeMatches =
    Math.abs(
      Number(savedLocation.latitude)
      - latitude,
    ) < 0.000001;

  const longitudeMatches =
    Math.abs(
      Number(savedLocation.longitude)
      - longitude,
    ) < 0.000001;

  return (
    latitudeMatches
    && longitudeMatches
  );
}

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/pick");
}

export default function PickLocationScreen() {
  const {
    draft,
    updateLocation,
  } = usePickDraft();

  const [locationLabel, setLocationLabel] =
    useState(draft.locationLabel);
  const [latitude, setLatitude] =
    useState<number | null>(draft.latitude);
  const [longitude, setLongitude] =
    useState<number | null>(draft.longitude);
  const [searchRadiusMiles, setSearchRadiusMiles] =
    useState(draft.searchRadiusMiles);
  const [suggestions, setSuggestions] =
    useState<LocationSuggestion[]>([]);
  const [savedLocations, setSavedLocations] =
    useState<SavedLocation[]>([]);
  const [
    savedLocationsOpen,
    setSavedLocationsOpen,
  ] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    async function loadDefaults() {
      try {
        const [
          profile,
          saved,
        ] = await Promise.all([
          getProfile(),
          getSavedLocations(),
        ]);

        setSavedLocations(saved);

        if (!draft.locationLabel) {
          if (
            profile.default_location_label
            && profile.default_location_latitude
              !== null
            && profile.default_location_longitude
              !== null
          ) {
            setLocationLabel(
              profile.default_location_label,
            );
            setLatitude(
              Number(
                profile.default_location_latitude,
              ),
            );
            setLongitude(
              Number(
                profile.default_location_longitude,
              ),
            );
          } else if (
            profile.location_display
          ) {
            setLocationLabel(
              profile.location_display,
            );
          }

          setSearchRadiusMiles(
            profile.default_search_radius_miles,
          );
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your location defaults.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDefaults();
  }, [draft.locationLabel]);

  useEffect(() => {
    const query = locationLabel.trim();

    if (
      query.length < 2
      || (latitude !== null && longitude !== null)
    ) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const nextRequestId = requestId.current + 1;
    requestId.current = nextRequestId;

    const timeout = setTimeout(() => {
      async function search() {
        try {
          setIsSearching(true);
          const results = await getLocationSuggestions(query);
          if (requestId.current === nextRequestId) {
            setSuggestions(results);
          }
        } catch (requestError) {
          if (requestId.current === nextRequestId) {
            setSuggestions([]);
            setError(
              getApiErrorMessage(
                requestError,
                "Unable to search for locations.",
              ),
            );
          }
        } finally {
          if (requestId.current === nextRequestId) {
            setIsSearching(false);
          }
        }
      }

      void search();
    }, 350);

    return () => clearTimeout(timeout);
  }, [locationLabel, latitude, longitude]);

  async function selectSuggestion(
    suggestion: LocationSuggestion,
  ) {
    try {
      setIsSelecting(true);
      setSuggestions([]);
      setError(null);

      const result = await getLocationDetails(
        suggestion.place_id,
      );

      setLocationLabel(result.label);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
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
      setIsSelecting(false);
    }
  }

  function selectSavedLocation(
    location: SavedLocation,
  ) {
    setLocationLabel(
      location.location_label,
    );
    setLatitude(
      Number(location.latitude),
    );
    setLongitude(
      Number(location.longitude),
    );
    setSuggestions([]);
    setError(null);
  }


  async function useCurrentLocation() {
    try {
      setIsGettingLocation(true);
      setError(null);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setError(
          "Location permission is required to use your current location.",
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const nextLatitude = position.coords.latitude;
      const nextLongitude = position.coords.longitude;

      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      setSuggestions([]);

      const addresses = await Location.reverseGeocodeAsync({
        latitude: nextLatitude,
        longitude: nextLongitude,
      });

      const address = addresses[0];
      const parts = [
        address?.city,
        address?.region,
      ].filter(Boolean);

      setLocationLabel(
        parts.length > 0
          ? parts.join(", ")
          : "Current Location",
      );
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

  function handleSave() {
    if (!locationLabel.trim()) {
      setError("Enter an area or use your current location.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError("Select a location from the suggestions before saving.");
      return;
    }

    updateLocation({
      locationLabel: locationLabel.trim(),
      latitude,
      longitude,
      searchRadiusMiles,
    });

    router.replace("/(tabs)/pick");
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#F3344A" />
          <Text style={styles.loadingText}>Loading location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={23} color="#07111F" />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Location</Text>
          <Text style={styles.topBarSubtitle}>Choose where to search</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <MapPin size={27} color="#F3344A" />
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>Where should we look?</Text>
            <Text style={styles.introText}>
              Pick an address, city, or current location and choose the search distance.
            </Text>
          </View>
        </View>

        <View style={styles.savedCard}>
          <Pressable
            onPress={() =>
              setSavedLocationsOpen(
                !savedLocationsOpen,
              )
            }
            style={styles.savedHeader}
          >
            <View>
              <Text style={styles.savedTitle}>
                Saved Locations
              </Text>
              <Text style={styles.savedSubtitle}>
                Choose one of your favorite areas
              </Text>
            </View>

            {savedLocationsOpen ? (
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

          {savedLocationsOpen && (
            <View style={styles.savedBody}>
              {savedLocations.length === 0 ? (
                <Text style={styles.savedEmpty}>
                  You do not have any saved locations yet.
                </Text>
              ) : (
                savedLocations.map(
                  (location) => {
                    const isSelected =
                      locationsMatch(
                        location,
                        locationLabel,
                        latitude,
                        longitude,
                      );

                    return (
                      <Pressable
                        key={location.id}
                        onPress={() =>
                          selectSavedLocation(
                            location,
                          )
                        }
                        style={[
                          styles.savedRow,
                          isSelected
                            && styles.savedRowSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.savedLocationIcon,
                            isSelected
                              && styles.savedLocationIconSelected,
                          ]}
                        >
                          {isSelected ? (
                            <Check
                              size={16}
                              color="#FFFFFF"
                              strokeWidth={3}
                            />
                          ) : (
                            <MapPin
                              size={18}
                              color="#F3344A"
                            />
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <View
                            style={
                              styles.savedNameRow
                            }
                          >
                            <Text
                              style={[
                                styles.savedName,
                                isSelected
                                  && styles.savedNameSelected,
                              ]}
                            >
                              {location.name}
                            </Text>

                            {isSelected && (
                              <View
                                style={
                                  styles.selectedBadge
                                }
                              >
                                <Text
                                  style={
                                    styles.selectedBadgeText
                                  }
                                >
                                  Selected
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={styles.savedLabel}
                          >
                            {location.location_label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  },
                )
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => void useCurrentLocation()}
          disabled={isGettingLocation}
          style={[styles.locationButton, isGettingLocation && styles.disabled]}
        >
          {isGettingLocation ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <LocateFixed size={22} color="#FFFFFF" />
          )}
          <Text style={styles.locationButtonText}>
            {isGettingLocation ? "Getting Location..." : "Use Current Location"}
          </Text>
        </Pressable>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.inputWrapper, suggestions.length > 0 && styles.inputOpen]}>
            <Search size={20} color="#9298A2" />
            <TextInput
              value={locationLabel}
              onChangeText={(value) => {
                setLocationLabel(value);
                setLatitude(null);
                setLongitude(null);
                setError(null);
              }}
              placeholder="City, neighborhood, or address"
              placeholderTextColor="#9298A2"
              autoCorrect={false}
              autoCapitalize="words"
              style={styles.input}
            />
            {(isSearching || isSelecting) && (
              <ActivityIndicator size="small" color="#F3344A" />
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestionsCard}>
              {suggestions.map((suggestion, index) => (
                <Pressable
                  key={suggestion.place_id}
                  onPress={() => void selectSuggestion(suggestion)}
                  style={[
                    styles.suggestionRow,
                    index < suggestions.length - 1 && styles.suggestionBorder,
                  ]}
                >
                  <MapPin size={18} color="#F3344A" />
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionMain}>{suggestion.main_text}</Text>
                    {!!suggestion.secondary_text && (
                      <Text style={styles.suggestionSecondary}>
                        {suggestion.secondary_text}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {latitude !== null && longitude !== null && (
          <View style={styles.successRow}>
            <Check size={17} color="#168B4F" strokeWidth={3} />
            <Text style={styles.successText}>Location selected</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Search Distance</Text>
        <View style={styles.optionRow}>
          {RADIUS_OPTIONS.map((radius) => {
            const selected = searchRadiusMiles === radius;
            return (
              <Pressable
                key={radius}
                onPress={() => setSearchRadiusMiles(radius)}
                style={[styles.radiusOption, selected && styles.radiusSelected]}
              >
                <Text style={[styles.radiusText, selected && styles.radiusTextSelected]}>
                  {radius} mi
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Check size={21} color="#FFFFFF" strokeWidth={2.8} />
          <Text style={styles.saveText}>Save Location</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  topBarCenter: { alignItems: "center" },
  topBarTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  topBarSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "#9298A2" },
  spacer: { width: 42 },
  content: { padding: 20, paddingBottom: 50 },
  introCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 17, borderRadius: 20, backgroundColor: "#FFF0F2" },
  introContent: { flex: 1 },
  introTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  introText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#69707C" },
  savedCard: {
    marginTop: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  savedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  savedSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#69707C",
  },
  savedBody: {
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
  },
  savedRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F4",
  },
  savedRowSelected: {
    backgroundColor: "#EFFAF3",
  },

  savedLocationIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFF0F2",
  },

  savedLocationIconSelected: {
    backgroundColor: "#168B4F",
  },

  savedNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  savedNameSelected: {
    color: "#116A3D",
  },

  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#DDF4E6",
  },

  selectedBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#168B4F",
  },

  savedName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#07111F",
  },
  savedLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#69707C",
  },
  savedEmpty: {
    padding: 15,
    fontSize: 12,
    color: "#69707C",
  },
  locationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 56, marginTop: 22, borderRadius: 17, backgroundColor: "#F3344A" },
  locationButtonText: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 11, marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: "#D9DDE3" },
  orText: { fontSize: 11, fontWeight: "900", color: "#9298A2" },
  searchContainer: { position: "relative", zIndex: 10 },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: "#D9DDE3", borderRadius: 17, backgroundColor: "#FFFFFF" },
  inputOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  input: { flex: 1, fontSize: 16, color: "#07111F" },
  suggestionsCard: { overflow: "hidden", borderWidth: 1, borderTopWidth: 0, borderColor: "#D9DDE3", borderBottomLeftRadius: 17, borderBottomRightRadius: 17, backgroundColor: "#FFFFFF" },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 62, paddingHorizontal: 16, paddingVertical: 11 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  suggestionContent: { flex: 1 },
  suggestionMain: { fontSize: 15, fontWeight: "800", color: "#07111F" },
  suggestionSecondary: { marginTop: 3, fontSize: 12, lineHeight: 16, color: "#69707C" },
  successRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  successText: { fontSize: 12, fontWeight: "800", color: "#168B4F" },
  sectionTitle: { marginTop: 27, marginBottom: 11, fontSize: 20, fontWeight: "900", color: "#07111F" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  radiusOption: { minWidth: 60, alignItems: "center", paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: "#D9DDE3", borderRadius: 14, backgroundColor: "#FFFFFF" },
  radiusSelected: { borderColor: "#168B4F", backgroundColor: "#168B4F" },
  radiusText: { fontSize: 13, fontWeight: "800", color: "#343B46" },
  radiusTextSelected: { color: "#FFFFFF" },
  errorCard: { marginTop: 18, padding: 14, borderWidth: 1, borderColor: "#F3C5C5", borderRadius: 16, backgroundColor: "#FFF1F1" },
  errorText: { color: "#9F2424", fontWeight: "700", textAlign: "center" },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 58, marginTop: 25, borderRadius: 18, backgroundColor: "#F3344A" },
  saveText: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "700", color: "#69707C" },
});
