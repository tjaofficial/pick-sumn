import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  Camera,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Settings,
  SlidersHorizontal,
  UserCircle,
  UserRoundPlus,
  Utensils,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  useAuth,
} from "@/features/auth/AuthContext";
import {
  Avatar,
} from "@/components/ui/Avatar";
import {
  ProfileCompletionCard,
} from "@/features/profile/ProfileCompletionCard";
import {
  deleteProfileAvatar,
  getProfile,
} from "@/features/profile/profileService";
import type {
  Profile,
} from "@/features/profile/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  choosePhotoForCrop,
} from "@/services/photoPicker";


type ProfileRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
};


function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: ProfileRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          danger && styles.dangerIcon,
        ]}
      >
        {icon}
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            danger && styles.dangerText,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>

      {!danger && (
        <ChevronRight
          size={21}
          color="#9298A2"
        />
      )}
    </Pressable>
  );
}


export default function ProfileScreen() {
  const {
    user,
    logout,
    refreshUser,
  } = useAuth();

  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
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

  const loadProfile =
    useCallback(async () => {
      try {
        setError(null);

        const result =
          await getProfile();

        setProfile(result);
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
    }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function handleLogout() {
    try {
      await logout();
    } catch {
      Alert.alert(
        "Logout issue",
        "Your local session will be cleared.",
      );
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Log out?",
      "You’ll need to sign in again to use Pick Sum’N.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: handleLogout,
        },
      ],
    );
  }

  function chooseProfilePhoto() {
    Alert.alert(
      profile?.avatar
        ? "Profile Photo"
        : "Add Profile Photo",
      "Choose what you would like to do.",
      [
        {
          text: "Choose Photo",
          onPress: () => {
            void choosePhotoForCrop({
              type: "profile",
            });
          },
        },
        ...(profile?.avatar
          ? [
              {
                text: "Remove Photo",
                style:
                  "destructive" as const,
                onPress: () => {
                  Alert.alert(
                    "Remove profile photo?",
                    (
                      "Your initial will appear "
                      + "instead."
                    ),
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            const result =
                              await deleteProfileAvatar();

                            setProfile(result);

                            await refreshUser();
                          } catch (
                            requestError
                          ) {
                            setError(
                              getApiErrorMessage(
                                requestError,
                                (
                                  "Unable to remove "
                                  + "your photo."
                                ),
                              ),
                            );
                          }
                        },
                      },
                    ],
                  );
                },
              },
            ]
          : []),
        {
          text: "Cancel",
          style: "cancel",
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

          <Text style={styles.loadingText}>
            Loading your profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Profile unavailable
          </Text>

          <Text style={styles.errorMessage}>
            {error
              ?? "Your profile could not be loaded."}
          </Text>

          <Pressable
            onPress={() =>
              void loadProfile()
            }
            style={styles.retryButton}
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

  const displayName =
    profile.display_name
    || user?.display_name
    || "Pick Sum’N User";

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={chooseProfilePhoto}
            style={styles.avatarButton}
            accessibilityLabel="Change profile photo"
          >
            <Avatar
              imageUrl={profile.avatar}
              name={displayName}
              size={104}
              shape="circle"
              backgroundColor="#F3344A"
              textColor="#FFFFFF"
              borderColor="#FFD158"
              borderWidth={4}
            />

            <View style={styles.cameraBadge}>
              <Camera
                size={17}
                color="#FFFFFF"
              />
            </View>
          </Pressable>

          <Pressable
            onPress={chooseProfilePhoto}
          >
            <Text style={styles.photoActionText}>
              {profile.avatar
                ? "Change Photo"
                : "Add Photo"}
            </Text>
          </Pressable>

          <Text style={styles.name}>
            {displayName}
          </Text>

          <Text style={styles.email}>
            {profile.email}
          </Text>

          {!!profile.location_display && (
            <View
              style={styles.locationRow}
            >
              <MapPin
                size={15}
                color="#69707C"
              />

              <Text
                style={styles.location}
              >
                {profile.location_display}
              </Text>
            </View>
          )}

          {!!profile.bio && (
            <Text style={styles.bio}>
              {profile.bio}
            </Text>
          )}

          <Pressable
            onPress={() =>
              router.push(
                "/profile/edit",
              )
            }
            style={styles.editButton}
          >
            <UserCircle
              size={18}
              color="#F3344A"
            />

            <Text
              style={
                styles.editButtonText
              }
            >
              Edit Profile
            </Text>
          </Pressable>
        </View>

        <ProfileCompletionCard
          percentage={
            profile.completion_percentage
          }
          missingSections={
            profile.missing_sections
          }
          onPress={() =>
            router.push(
              "/preferences",
            )
          }
        />

        <Text style={styles.sectionTitle}>
          Social
        </Text>

        <View style={styles.sectionCard}>
          <ProfileRow
            icon={
              <UserRoundPlus
                size={21}
                color="#F3344A"
              />
            }
            title="Friends"
            subtitle="Manage friends, requests, and your friend code"
            onPress={() => router.push("/friends")}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Food & Matching
        </Text>

        <View style={styles.sectionCard}>
          <ProfileRow
            icon={
              <Utensils
                size={21}
                color="#F3344A"
              />
            }
            title="Food Preferences"
            subtitle="Favorite cuisines and dietary needs"
            onPress={() =>
              router.push(
                "/preferences",
              )
            }
          />

          <View style={styles.divider} />

          <ProfileRow
            icon={
              <SlidersHorizontal
                size={21}
                color="#F3344A"
              />
            }
            title="Default Search Settings"
            subtitle={`${profile.default_search_radius_miles} miles · Price ${"$".repeat(
              profile.default_price_min,
            )}–${"$".repeat(
              profile.default_price_max,
            )}`}
            onPress={() =>
              router.push(
                "/profile/edit",
              )
            }
          />

          <View style={styles.divider} />

          <ProfileRow
            icon={
              <Heart
                size={21}
                color="#F3344A"
              />
            }
            title="Saved Restaurants"
            subtitle="Restaurants you want to remember"
            onPress={() =>
              router.push(
                "/saved-restaurants",
              )
            }
          />

          <View style={styles.divider} />

          <ProfileRow
            icon={
              <MapPin
                size={21}
                color="#F3344A"
              />
            }
            title="Saved Locations"
            subtitle="Places and areas you search often"
            onPress={() =>
              router.push(
                "/saved-locations",
              )
            }
          />
        </View>

        <Text style={styles.sectionTitle}>
          Account
        </Text>

        <View style={styles.sectionCard}>
          <ProfileRow
            icon={
              <Settings
                size={21}
                color="#69707C"
              />
            }
            title="App Settings"
            subtitle="Notifications, privacy, and appearance"
            onPress={() => {
              Alert.alert(
                "Coming soon",
                "App settings will be added later.",
              );
            }}
          />

          <View style={styles.divider} />

          <ProfileRow
            icon={
              <LogOut
                size={21}
                color="#C62828"
              />
            }
            title="Log Out"
            subtitle="Sign out of this device"
            danger
            onPress={confirmLogout}
          />
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  avatarButton: {
    position: "relative",
  },

  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF9F2",
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  photoActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },

  name: {
    marginTop: 14,
    fontSize: 29,
    fontWeight: "900",
    color: "#07111F",
  },

  email: {
    marginTop: 4,
    fontSize: 14,
    color: "#69707C",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },

  location: {
    fontSize: 14,
    color: "#69707C",
  },

  bio: {
    maxWidth: 360,
    marginTop: 11,
    fontSize: 14,
    lineHeight: 21,
    color: "#4E5662",
    textAlign: "center",
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 15,
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  editButtonText: {
    color: "#F3344A",
    fontWeight: "900",
  },

  sectionTitle: {
    marginTop: 26,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  sectionCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },

  rowPressed: {
    backgroundColor: "#F8F8F9",
  },

  rowIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  dangerIcon: {
    backgroundColor: "#FFF1F1",
  },

  rowContent: {
    flex: 1,
    marginLeft: 12,
  },

  rowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#07111F",
  },

  rowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#737A85",
  },

  dangerText: {
    color: "#C62828",
  },

  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: "#ECEDEF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  loadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#69707C",
  },

  errorTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#07111F",
  },

  errorMessage: {
    maxWidth: 340,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});