import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowLeft,
  ShieldBan,
  UserRoundX,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Avatar,
} from "@/components/ui/Avatar";
import {
  getBlockedUsers,
  unblockUser,
} from "@/features/friends/friendsService";
import type {
  BlockedUser,
} from "@/features/friends/types";
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


function userName(
  item: BlockedUser,
): string {
  const fullName = [
    item.user.first_name,
    item.user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName
    || item.user.display_name
    || item.user.email
  );
}


export default function BlockedUsersScreen() {
  useAppTheme();

  const [
    blockedUsers,
    setBlockedUsers,
  ] = useState<BlockedUser[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    unblockingId,
    setUnblockingId,
  ] = useState<number | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadBlockedUsers =
    useCallback(async () => {
      try {
        setError(null);

        setBlockedUsers(
          await getBlockedUsers(),
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load blocked users.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBlockedUsers();
    }, [loadBlockedUsers]),
  );

  function confirmUnblock(
    item: BlockedUser,
  ) {
    Alert.alert(
      `Unblock ${userName(item)}?`,
      (
        "Unblocking removes this person from your blocked list. "
        + "It does not restore your friendship. You will need to "
        + "send a new friend request to become friends again."
      ),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              setUnblockingId(
                item.user.id,
              );

              await unblockUser(
                item.user.id,
              );

              setBlockedUsers(
                (current) =>
                  current.filter(
                    (blocked) =>
                      blocked.user.id
                      !== item.user.id,
                  ),
              );
            } catch (
              requestError
            ) {
              Alert.alert(
                "Unable to unblock",
                getApiErrorMessage(
                  requestError,
                  "This user could not be unblocked.",
                ),
              );
            } finally {
              setUnblockingId(
                null,
              );
            }
          },
        },
      ],
    );
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
          Blocked Users
        </Text>

        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />
          <Text style={styles.stateText}>
            Loading blocked users...
          </Text>
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
          <View style={styles.infoCard}>
            <ShieldBan
              size={23}
              color={themeColor("#F3344A", "color")}
            />
            <Text style={styles.infoText}>
              Blocked users cannot maintain a friendship with you.
              Unblocking someone only removes the block and does not
              automatically add them back as a friend.
            </Text>
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}

          {!error
            && blockedUsers.length === 0
            && (
              <View style={styles.emptyCard}>
                <UserRoundX
                  size={35}
                  color={themeColor("#9298A2", "color")}
                />
                <Text style={styles.emptyTitle}>
                  No blocked users
                </Text>
                <Text style={styles.emptyText}>
                  People you block will appear here so you can manage them.
                </Text>
              </View>
            )}

          <View style={styles.list}>
            {blockedUsers.map(
              (item) => (
                <View
                  key={
                    item.friendship_id
                  }
                  style={styles.userCard}
                >
                  <Avatar
                    imageUrl={
                      item.user.avatar
                    }
                    name={
                      userName(item)
                    }
                    size={48}
                  />

                  <View
                    style={
                      styles.userContent
                    }
                  >
                    <Text
                      style={
                        styles.userName
                      }
                    >
                      {userName(item)}
                    </Text>

                    <Text
                      style={
                        styles.userEmail
                      }
                    >
                      {item.user.email}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      confirmUnblock(
                        item,
                      )
                    }
                    disabled={
                      unblockingId
                      === item.user.id
                    }
                    style={
                      styles.unblockButton
                    }
                  >
                    {unblockingId
                    === item.user.id ? (
                      <ActivityIndicator
                        size="small"
                        color={themeColor("#F3344A", "color")}
                      />
                    ) : (
                      <Text
                        style={
                          styles.unblockText
                        }
                      >
                        Unblock
                      </Text>
                    )}
                  </Pressable>
                </View>
              ),
            )}
          </View>
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: "#FFF0F2",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#5F6671",
  },
  list: {
    gap: 10,
    marginTop: 18,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },
  userContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 9,
  },
  userName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  userEmail: {
    marginTop: 3,
    fontSize: 11,
    color: "#777E89",
  },
  unblockButton: {
    minWidth: 78,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  unblockText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    marginTop: 11,
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },
  emptyText: {
    maxWidth: 300,
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: "#69707C",
  },
  errorCard: {
    marginTop: 16,
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: {
    color: "#69707C",
    fontWeight: "700",
  },
});
