import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  MapPin,
  Save,
  Search,
} from "lucide-react-native";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  getLocationDetails,
  getLocationSuggestions,
  type LocationSuggestion,
} from "@/features/pickSessions/locationService";
import {
  getProfile,
  updateProfile,
} from "@/features/profile/profileService";
import type { Profile } from "@/features/profile/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function EditProfileScreen() {
  useAppTheme();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");

  const [
    defaultLocationLabel,
    setDefaultLocationLabel,
  ] = useState("");
  const [
    defaultLocationLatitude,
    setDefaultLocationLatitude,
  ] = useState<number | null>(null);
  const [
    defaultLocationLongitude,
    setDefaultLocationLongitude,
  ] = useState<number | null>(null);
  const [
    locationSuggestions,
    setLocationSuggestions,
  ] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] =
    useState(false);
  const [isSelectingLocation, setIsSelectingLocation] =
    useState(false);

  const [radius, setRadius] = useState("10");
  const [priceMin, setPriceMin] = useState("1");
  const [priceMax, setPriceMax] = useState("3");
  const [excludeDays, setExcludeDays] = useState("7");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationRequestId = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const result = await getProfile();

        setProfile(result);
        setDisplayName(result.display_name);
        setFirstName(result.first_name);
        setLastName(result.last_name);
        setBio(result.bio);

        setDefaultLocationLabel(
          result.default_location_label
          || result.location_display
          || "",
        );
        setDefaultLocationLatitude(
          result.default_location_latitude === null
            ? null
            : Number(
                result.default_location_latitude,
              ),
        );
        setDefaultLocationLongitude(
          result.default_location_longitude === null
            ? null
            : Number(
                result.default_location_longitude,
              ),
        );

        setRadius(
          String(result.default_search_radius_miles),
        );
        setPriceMin(
          String(result.default_price_min),
        );
        setPriceMax(
          String(result.default_price_max),
        );
        setExcludeDays(
          String(result.exclude_recent_days),
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your profile.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    const query = defaultLocationLabel.trim();

    if (
      query.length < 2
      || (
        defaultLocationLatitude !== null
        && defaultLocationLongitude !== null
      )
    ) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    const nextRequestId =
      locationRequestId.current + 1;
    locationRequestId.current =
      nextRequestId;

    const timeout = setTimeout(() => {
      async function search() {
        try {
          setIsSearchingLocation(true);

          const results =
            await getLocationSuggestions(query);

          if (
            locationRequestId.current
            === nextRequestId
          ) {
            setLocationSuggestions(results);
          }
        } catch (requestError) {
          if (
            locationRequestId.current
            === nextRequestId
          ) {
            setLocationSuggestions([]);
            setError(
              getApiErrorMessage(
                requestError,
                "Unable to search for locations.",
              ),
            );
          }
        } finally {
          if (
            locationRequestId.current
            === nextRequestId
          ) {
            setIsSearchingLocation(false);
          }
        }
      }

      void search();
    }, 350);

    return () => clearTimeout(timeout);
  }, [
    defaultLocationLabel,
    defaultLocationLatitude,
    defaultLocationLongitude,
  ]);

  async function selectLocationSuggestion(
    suggestion: LocationSuggestion,
  ) {
    try {
      setIsSelectingLocation(true);
      setLocationSuggestions([]);
      setError(null);

      const result = await getLocationDetails(
        suggestion.place_id,
      );

      setDefaultLocationLabel(result.label);
      setDefaultLocationLatitude(
        Number(result.latitude),
      );
      setDefaultLocationLongitude(
        Number(result.longitude),
      );
    } catch (requestError) {
      setDefaultLocationLatitude(null);
      setDefaultLocationLongitude(null);
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

  async function handleSave() {
    const radiusNumber = Number(radius);
    const minimumPrice = Number(priceMin);
    const maximumPrice = Number(priceMax);
    const recentDays = Number(excludeDays);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    if (
      defaultLocationLabel.trim()
      && (
        defaultLocationLatitude === null
        || defaultLocationLongitude === null
      )
    ) {
      setError(
        "Select your default location from the suggestions.",
      );
      return;
    }

    if (
      !Number.isInteger(radiusNumber)
      || radiusNumber < 1
    ) {
      setError("Search radius must be at least 1 mile.");
      return;
    }

    if (
      minimumPrice < 1
      || minimumPrice > 4
      || maximumPrice < 1
      || maximumPrice > 4
    ) {
      setError("Price values must be between 1 and 4.");
      return;
    }

    if (minimumPrice > maximumPrice) {
      setError(
        "Minimum price cannot be greater than maximum price.",
      );
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await updateProfile({
        display_name: displayName.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),

        default_location_label:
          defaultLocationLabel.trim(),
        default_location_latitude:
          defaultLocationLabel.trim()
            ? defaultLocationLatitude
            : null,
        default_location_longitude:
          defaultLocationLabel.trim()
            ? defaultLocationLongitude
            : null,

        default_search_radius_miles: radiusNumber,
        default_price_min: minimumPrice,
        default_price_max: maximumPrice,
        exclude_recent_days: recentDays,
      });

      router.back();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to save your profile.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            {error ?? "Profile unavailable."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasSelectedDefaultLocation =
    defaultLocationLatitude !== null
    && defaultLocationLongitude !== null;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.topBarButton}
          >
            <ArrowLeft
              size={23}
              color={themeColor("#07111F", "color")}
            />
          </Pressable>

          <Text style={styles.topBarTitle}>
            Edit Profile
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>
            Personal Information
          </Text>

          <Text style={styles.label}>
            Display name
          </Text>

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Tobe"
            style={styles.input}
          />

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Text style={styles.label}>
                First name
              </Text>

              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                style={styles.input}
              />
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>
                Last name
              </Text>

              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Bio</Text>

          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell your group something about yourself."
            multiline
            maxLength={280}
            style={[
              styles.input,
              styles.textArea,
            ]}
          />

          <Text style={styles.sectionTitle}>
            Default Location
          </Text>

          <Text style={styles.locationHelpText}>
            Choose the address or area Pick Sum'N should use
            as your default starting location. You can still
            change the location for each Pick session.
          </Text>

          <View style={styles.searchContainer}>
            <View
              style={[
                styles.locationInputWrapper,
                locationSuggestions.length > 0
                  && styles.locationInputOpen,
              ]}
            >
              <Search
                size={20}
                color={themeColor("#9298A2", "color")}
              />

              <TextInput
                value={defaultLocationLabel}
                onChangeText={(value) => {
                  setDefaultLocationLabel(value);
                  setDefaultLocationLatitude(null);
                  setDefaultLocationLongitude(null);
                  setError(null);
                }}
                placeholder="Search address, city, or area"
                placeholderTextColor={themeColor("#9298A2", "color")}
                autoCorrect={false}
                autoCapitalize="words"
                style={styles.locationInput}
              />

              {(
                isSearchingLocation
                || isSelectingLocation
              ) && (
                <ActivityIndicator
                  size="small"
                  color={themeColor("#F3344A", "color")}
                />
              )}
            </View>

            {locationSuggestions.length > 0 && (
              <View style={styles.suggestionsCard}>
                {locationSuggestions.map(
                  (suggestion, index) => (
                    <Pressable
                      key={suggestion.place_id}
                      onPress={() =>
                        void selectLocationSuggestion(
                          suggestion,
                        )
                      }
                      style={[
                        styles.suggestionRow,
                        index
                          < locationSuggestions.length - 1
                          && styles.suggestionBorder,
                      ]}
                    >
                      <MapPin
                        size={18}
                        color={themeColor("#F3344A", "color")}
                      />

                      <View
                        style={styles.suggestionContent}
                      >
                        <Text
                          style={styles.suggestionMain}
                        >
                          {suggestion.main_text}
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

          {hasSelectedDefaultLocation && (
            <View style={styles.locationSelectedRow}>
              <Check
                size={17}
                color={themeColor("#168B4F", "color")}
                strokeWidth={3}
              />
              <Text style={styles.locationSelectedText}>
                Default location selected
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            Default Match Settings
          </Text>

          <Text style={styles.label}>
            Search radius in miles
          </Text>

          <TextInput
            value={radius}
            onChangeText={setRadius}
            keyboardType="number-pad"
            style={styles.input}
          />

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Text style={styles.label}>
                Minimum price
              </Text>

              <TextInput
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.column}>
              <Text style={styles.label}>
                Maximum price
              </Text>

              <TextInput
                value={priceMax}
                onChangeText={setPriceMax}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.helpText}>
            Price levels range from 1 ($) to 4 ($$$$).
          </Text>

          <Text style={styles.label}>
            Hide restaurants visited within
          </Text>

          <TextInput
            value={excludeDays}
            onChangeText={setExcludeDays}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.helpText}>
            Enter 0 to allow recently visited restaurants.
          </Text>

          {error && (
            <Text style={styles.errorText}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={() => void handleSave()}
            disabled={isSaving}
            style={[
              styles.saveButton,
              isSaving
                && styles.saveButtonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={themeColor("#FFFFFF", "color")}
              />
            ) : (
              <Save
                size={20}
                color={themeColor("#FFFFFF", "color")}
              />
            )}

            <Text style={styles.saveButtonText}>
              {isSaving
                ? "Saving..."
                : "Save Profile"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 18,
    paddingVertical: 12,
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
    padding: 21,
    paddingBottom: 50,
  },

  sectionTitle: {
    marginTop: 11,
    marginBottom: 15,
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
    minHeight: 55,
    marginBottom: 17,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#07111F",
  },

  textArea: {
    minHeight: 110,
    paddingTop: 15,
    textAlignVertical: "top",
  },

  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },

  column: {
    flex: 1,
  },

  locationHelpText: {
    marginTop: -7,
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    color: "#777E89",
  },

  searchContainer: {
    position: "relative",
    zIndex: 10,
  },

  locationInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  locationInputOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  locationInput: {
    flex: 1,
    fontSize: 16,
    color: "#07111F",
  },

  suggestionsCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#D9DDE3",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },

  suggestionContent: {
    flex: 1,
  },

  suggestionMain: {
    fontSize: 15,
    fontWeight: "800",
    color: "#07111F",
  },

  suggestionSecondary: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: "#69707C",
  },

  locationSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
    marginBottom: 4,
  },

  locationSelectedText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#168B4F",
  },

  helpText: {
    marginTop: -9,
    marginBottom: 17,
    fontSize: 12,
    color: "#777E89",
  },

  errorText: {
    marginVertical: 12,
    color: "#C62828",
    fontWeight: "700",
    textAlign: "center",
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 13,
    paddingVertical: 17,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
