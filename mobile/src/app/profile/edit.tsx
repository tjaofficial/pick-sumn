import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Save,
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
  useState,
} from "react";

import {
  getProfile,
  updateProfile,
} from "@/features/profile/profileService";
import type { Profile } from "@/features/profile/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

export default function EditProfileScreen() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [radius, setRadius] = useState("10");
  const [priceMin, setPriceMin] = useState("1");
  const [priceMax, setPriceMax] = useState("3");
  const [excludeDays, setExcludeDays] = useState("7");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getProfile();

        setProfile(result);
        setDisplayName(result.display_name);
        setFirstName(result.first_name);
        setLastName(result.last_name);
        setBio(result.bio);
        setCity(result.city);
        setStateValue(result.state);
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

    load();
  }, []);

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
      !Number.isInteger(radiusNumber) ||
      radiusNumber < 1
    ) {
      setError("Search radius must be at least 1 mile.");
      return;
    }

    if (
      minimumPrice < 1 ||
      minimumPrice > 4 ||
      maximumPrice < 1 ||
      maximumPrice > 4
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
        city: city.trim(),
        state: stateValue.trim(),
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
            color="#F3344A"
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

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
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
            Location
          </Text>

          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Text style={styles.label}>City</Text>

              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Waterford"
                style={styles.input}
              />
            </View>

            <View style={styles.smallColumn}>
              <Text style={styles.label}>State</Text>

              <TextInput
                value={stateValue}
                onChangeText={(value) =>
                  setStateValue(value.toUpperCase())
                }
                placeholder="MI"
                maxLength={30}
                style={styles.input}
              />
            </View>
          </View>

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
            onPress={handleSave}
            disabled={isSaving}
            style={[
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
            ]}
          >
            <Save
              size={20}
              color="#FFFFFF"
            />

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

  smallColumn: {
    width: 110,
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