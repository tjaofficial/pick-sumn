import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getLocationDetails,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/features/pickSessions/locationService";
import {
  createSavedLocation,
  deleteSavedLocation,
  getSavedLocations,
} from "@/features/profile/profileService";
import type {
  SavedLocation,
} from "@/features/profile/types";
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


export default function SavedLocationsScreen() {
  useAppTheme();

  const [locations, setLocations] =
    useState<SavedLocation[]>([]);
  const [name, setName] =
    useState("");
  const [query, setQuery] =
    useState("");
  const [latitude, setLatitude] =
    useState<number | null>(null);
  const [longitude, setLongitude] =
    useState<number | null>(null);
  const [suggestions, setSuggestions] =
    useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [isSearching, setIsSearching] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const requestId = useRef(0);

  const loadLocations = useCallback(
    async () => {
      try {
        setLocations(
          await getSavedLocations(),
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load saved locations.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadLocations();
    }, [loadLocations]),
  );

  useEffect(() => {
    const cleanQuery = query.trim();

    if (
      cleanQuery.length < 2
      || (
        latitude !== null
        && longitude !== null
      )
    ) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const nextId =
      ++requestId.current;

    const timeout = setTimeout(
      () => {
        async function runSearch() {
          try {
            setIsSearching(true);

            const results =
              await getLocationSuggestions(
                cleanQuery,
              );

            if (
              requestId.current
              === nextId
            ) {
              setSuggestions(results);
            }
          } catch (requestError) {
            setError(
              getApiErrorMessage(
                requestError,
                "Unable to search locations.",
              ),
            );
          } finally {
            if (
              requestId.current
              === nextId
            ) {
              setIsSearching(false);
            }
          }
        }

        void runSearch();
      },
      350,
    );

    return () =>
      clearTimeout(timeout);
  }, [
    query,
    latitude,
    longitude,
  ]);

  async function selectSuggestion(
    suggestion: LocationSuggestion,
  ) {
    try {
      const result =
        await getLocationDetails(
          suggestion.place_id,
        );

      setQuery(result.label);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setSuggestions([]);
      setError(null);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to select that location.",
        ),
      );
    }
  }

  async function saveLocation() {
    if (!name.trim()) {
      setError(
        "Give this location a name, such as Home or Work.",
      );
      return;
    }

    if (
      !query.trim()
      || latitude === null
      || longitude === null
    ) {
      setError(
        "Choose an address from the search results.",
      );
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await createSavedLocation({
        name: name.trim(),
        location_label:
          query.trim(),
        latitude,
        longitude,
      });

      setName("");
      setQuery("");
      setLatitude(null);
      setLongitude(null);

      await loadLocations();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to save this location.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(
    location: SavedLocation,
  ) {
    Alert.alert(
      "Delete saved location?",
      `Remove ${location.name} from your saved locations?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSavedLocation(
              location.id,
            );

            setLocations(
              (current) =>
                current.filter(
                  (item) =>
                    item.id
                    !== location.id,
                ),
            );
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          Saved Locations
        </Text>

        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>
          Add a location
        </Text>

        <Text style={styles.label}>
          Name
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Home, Work, Downtown..."
          placeholderTextColor={themeColor("#9298A2", "color")}
          style={styles.input}
        />

        <Text style={styles.label}>
          Address
        </Text>

        <View style={styles.searchWrap}>
          <View style={styles.searchInput}>
            <Search
              size={19}
              color={themeColor("#9298A2", "color")}
            />
            <TextInput
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setLatitude(null);
                setLongitude(null);
              }}
              placeholder="Search for an address"
              placeholderTextColor={themeColor("#9298A2", "color")}
              style={{ flex: 1 }}
            />
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={themeColor("#F3344A", "color")}
              />
            )}
          </View>

          {suggestions.length > 0 && (
            <View
              style={styles.suggestions}
            >
              {suggestions.map(
                (suggestion) => (
                  <Pressable
                    key={
                      suggestion.place_id
                    }
                    onPress={() =>
                      void selectSuggestion(
                        suggestion,
                      )
                    }
                    style={
                      styles.suggestion
                    }
                  >
                    <MapPin
                      size={17}
                      color={themeColor("#F3344A", "color")}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={
                          styles.suggestionMain
                        }
                      >
                        {
                          suggestion.main_text
                        }
                      </Text>
                      {!!suggestion.secondary_text && (
                        <Text
                          style={
                            styles.suggestionSecondary
                          }
                        >
                          {
                            suggestion.secondary_text
                          }
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ),
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={() =>
            void saveLocation()
          }
          disabled={isSaving}
          style={styles.addButton}
        >
          <Plus
            size={20}
            color={themeColor("#FFFFFF", "color")}
          />
          <Text style={styles.addText}>
            {isSaving
              ? "Saving..."
              : "Save Location"}
          </Text>
        </Pressable>

        {error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        <Text style={styles.sectionTitle}>
          Your saved locations
        </Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />
        ) : locations.length === 0 ? (
          <View style={styles.emptyCard}>
            <MapPin
              size={30}
              color={themeColor("#F3344A", "color")}
            />
            <Text style={styles.emptyTitle}>
              No saved locations yet
            </Text>
          </View>
        ) : (
          locations.map(
            (location) => (
              <View
                key={location.id}
                style={
                  styles.locationCard
                }
              >
                <MapPin
                  size={21}
                  color={themeColor("#F3344A", "color")}
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.locationName
                    }
                  >
                    {location.name}
                  </Text>
                  <Text
                    style={
                      styles.locationLabel
                    }
                  >
                    {
                      location.location_label
                    }
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    confirmDelete(
                      location,
                    )
                  }
                  style={
                    styles.deleteButton
                  }
                >
                  <Trash2
                    size={18}
                    color={themeColor("#C62828", "color")}
                  />
                </Pressable>
              </View>
            ),
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
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
  topTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 12,
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
  },
  label: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "800",
    color: "#343B46",
  },
  input: {
    minHeight: 54,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  searchWrap: {
    position: "relative",
    zIndex: 10,
  },
  searchInput: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  suggestions: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  suggestion: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
  },
  suggestionMain: {
    fontWeight: "800",
    color: "#07111F",
  },
  suggestionSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: "#69707C",
  },
  addButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },
  addText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  error: {
    marginTop: 12,
    color: "#C62828",
    fontWeight: "700",
    textAlign: "center",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 9,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  locationName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  locationLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#69707C",
  },
  deleteButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    marginTop: 8,
    fontWeight: "900",
    color: "#07111F",
  },
});
