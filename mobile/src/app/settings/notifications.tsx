import {
  router,
} from "expo-router";
import {
  ArrowLeft,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
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
  AppSettings,
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


type NotificationKey =
  | "notification_friend_requests"
  | "notification_group_invites"
  | "notification_pick_session_invites"
  | "notification_group_vote_started"
  | "notification_voting_reminders"
  | "notification_session_results"
  | "notification_general";


const OPTIONS: {
  key: NotificationKey;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "notification_friend_requests",
    title: "Friend Requests",
    subtitle: "New friend requests and request updates",
  },
  {
    key: "notification_group_invites",
    title: "Group Invites",
    subtitle: "Invitations to join dining groups",
  },
  {
    key: "notification_pick_session_invites",
    title: "Pick Session Invites",
    subtitle: "Invitations to join a Pick Sum’N session",
  },
  {
    key: "notification_group_vote_started",
    title: "Group Vote Started",
    subtitle: "Know when it is time for your group to vote",
  },
  {
    key: "notification_voting_reminders",
    title: "Voting Reminders",
    subtitle: "Reminders when your vote is still needed",
  },
  {
    key: "notification_session_results",
    title: "Session Results",
    subtitle: "Final restaurant picks and completed votes",
  },
  {
    key: "notification_general",
    title: "General Notifications",
    subtitle: "Other useful Pick Sum’N updates",
  },
];


export default function NotificationsSettingsScreen() {
  useAppTheme();

  const [
    settings,
    setSettings,
  ] = useState<AppSettings | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setSettings(
          await getAppSettings(),
        );
      } catch (requestError) {
        Alert.alert(
          "Unable to load notifications",
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
  }, []);

  async function toggle(
    key: NotificationKey,
    value: boolean,
  ) {
    if (!settings) {
      return;
    }

    const previous = settings;

    setSettings({
      ...settings,
      [key]: value,
    });

    try {
      setSettings(
        await updateAppSettings({
          [key]: value,
        }),
      );
    } catch (requestError) {
      setSettings(previous);

      Alert.alert(
        "Unable to save",
        getApiErrorMessage(
          requestError,
          "Your notification setting could not be saved.",
        ),
      );
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
          Notifications
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
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <Text style={styles.description}>
            Choose the types of Pick Sum’N notifications you want to receive.
          </Text>

          <View style={styles.card}>
            {OPTIONS.map(
              (
                option,
                index,
              ) => (
                <View
                  key={option.key}
                >
                  <View
                    style={
                      styles.row
                    }
                  >
                    <View
                      style={
                        styles.rowContent
                      }
                    >
                      <Text
                        style={
                          styles.rowTitle
                        }
                      >
                        {option.title}
                      </Text>

                      <Text
                        style={
                          styles.rowSubtitle
                        }
                      >
                        {option.subtitle}
                      </Text>
                    </View>

                    <Switch
                      value={
                        Boolean(
                          settings?.[
                            option.key
                          ],
                        )
                      }
                      onValueChange={(
                        value,
                      ) =>
                        void toggle(
                          option.key,
                          value,
                        )
                      }
                      trackColor={{
                        false:
                          "#D5D8DD",
                        true:
                          "#F6A3AC",
                      }}
                      thumbColor={
                        settings?.[
                          option.key
                        ]
                          ? "#F3344A"
                          : "#FFFFFF"
                      }
                    />
                  </View>

                  {index
                  < OPTIONS.length
                    - 1 && (
                    <View
                      style={
                        styles.divider
                      }
                    />
                  )}
                </View>
              ),
            )}
          </View>

          <Text style={styles.note}>
            These preferences are stored now. Each notification-producing
            backend flow should check the matching preference before sending
            its push notification.
          </Text>
        </ScrollView>
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
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },
  spacer: {
    width: 42,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#69707C",
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
