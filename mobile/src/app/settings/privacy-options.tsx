import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  Check,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useEffect,
  useState,
} from "react";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  getAppSettings,
  updateAppSettings,
} from "@/features/settings/settingsService";
import type {
  FriendRequestPrivacy,
  GroupInvitePrivacy,
} from "@/features/settings/types";
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


type Option = {
  value: string;
  title: string;
  subtitle: string;
};


export default function PrivacyOptionsScreen() {
  useAppTheme();

  const params =
    useLocalSearchParams<{
      type?: string | string[];
    }>();

  const type = Array.isArray(
    params.type,
  )
    ? params.type[0]
    : params.type;

  const isFriendRequest =
    type === "friend_requests";

  const options: Option[] =
    isFriendRequest
      ? [
          {
            value: "everyone",
            title: "Everyone",
            subtitle: "Any Pick Sum’N user can send you a friend request.",
          },
          {
            value: "friends_of_friends",
            title: "Friends of Friends",
            subtitle: "Only people who share at least one friend with you can send a request.",
          },
          {
            value: "nobody",
            title: "Nobody",
            subtitle: "New friend requests will be turned off.",
          },
        ]
      : [
          {
            value: "friends_only",
            title: "Friends Only",
            subtitle: "Only your current friends can invite you to groups.",
          },
          {
            value: "nobody",
            title: "Nobody",
            subtitle: "New group invitations will be turned off.",
          },
        ];

  const [
    selected,
    setSelected,
  ] = useState<string>("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const settings =
          await getAppSettings();

        setSelected(
          isFriendRequest
            ? settings
                .friend_request_privacy
            : settings
                .group_invite_privacy,
        );
      } catch (requestError) {
        Alert.alert(
          "Unable to load privacy settings",
          getApiErrorMessage(
            requestError,
            "Please try again.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [isFriendRequest]);

  async function selectOption(
    value: string,
  ) {
    try {
      setIsSaving(true);

      const saved =
        await updateAppSettings(
          isFriendRequest
            ? {
                friend_request_privacy:
                  value as FriendRequestPrivacy,
              }
            : {
                group_invite_privacy:
                  value as GroupInvitePrivacy,
              },
        );

      setSelected(
        isFriendRequest
          ? saved
              .friend_request_privacy
          : saved
              .group_invite_privacy,
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to save",
        getApiErrorMessage(
          requestError,
          "Your privacy setting could not be saved.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          {isFriendRequest
            ? "Friend Request Privacy"
            : "Group Invite Privacy"}
        </Text>

        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.description}>
            {isFriendRequest
              ? "Choose who is allowed to send you new friend requests."
              : "Choose who is allowed to send you new group invitations."}
          </Text>

          <View style={styles.card}>
            {options.map(
              (
                option,
                index,
              ) => {
                const active =
                  selected
                  === option.value;

                return (
                  <View
                    key={
                      option.value
                    }
                  >
                    <Pressable
                      onPress={() =>
                        void selectOption(
                          option.value,
                        )
                      }
                      disabled={
                        isSaving
                      }
                      style={
                        styles.optionRow
                      }
                    >
                      <View
                        style={
                          styles.optionContent
                        }
                      >
                        <Text
                          style={
                            styles.optionTitle
                          }
                        >
                          {option.title}
                        </Text>

                        <Text
                          style={
                            styles.optionSubtitle
                          }
                        >
                          {option.subtitle}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.checkCircle,
                          active
                            && styles.checkCircleActive,
                        ]}
                      >
                        {active && (
                          <Check
                            size={16}
                            color={themeColor("#FFFFFF", "color")}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                    </Pressable>

                    {index
                    < options.length
                      - 1 && (
                      <View
                        style={
                          styles.divider
                        }
                      />
                    )}
                  </View>
                );
              },
            )}
          </View>

          {!isFriendRequest && (
            <Text style={styles.note}>
              This preference is now stored in your account. The existing
              group-invite creation flow should be updated next to enforce
              this setting before an invitation is created.
            </Text>
          )}
        </View>
      )}
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
    justifyContent:
      "space-between",
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
  topTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },
  spacer: {
    width: 42,
  },
  content: {
    padding: 20,
  },
  description: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
  },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },
  optionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },
  checkCircle: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#CDD1D7",
    borderRadius: 14,
  },
  checkCircleActive: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },
  divider: {
    height: 1,
    marginLeft: 17,
    backgroundColor: "#ECEDEF",
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "#777E89",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
