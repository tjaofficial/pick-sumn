import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Trophy,
  UserPlus,
  Vote,
  X,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { Avatar } from "@/components/ui/Avatar";
import {
  getFriendRequests,
  respondToFriendRequest,
} from "@/features/friends/friendsService";
import type {
  FriendRequest,
  FriendUser,
} from "@/features/friends/types";
import {
  getPickSessionNotifications,
  markAllPickSessionNotificationsRead,
  markPickSessionNotificationRead,
} from "@/features/pickSessions/pickSessionsService";
import type {
  PickSessionNotification,
} from "@/features/pickSessions/types";
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


type CombinedNotification =
  | {
      type: "friend_request";
      createdAt: string;
      request: FriendRequest;
    }
  | {
      type: "pick_session";
      createdAt: string;
      notification: PickSessionNotification;
    };


function friendName(
  user: FriendUser,
): string {
  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName
    || user.display_name
    || user.email
  );
}


export default function NotificationsScreen() {
  useAppTheme();

  const [
    notifications,
    setNotifications,
  ] = useState<
    PickSessionNotification[]
  >([]);

  const [
    friendRequests,
    setFriendRequests,
  ] = useState<FriendRequest[]>(
    [],
  );

  const [
    pickUnreadCount,
    setPickUnreadCount,
  ] = useState(0);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  const unreadCount =
    pickUnreadCount
    + friendRequests.length;


  const combinedNotifications =
    useMemo<CombinedNotification[]>(
      () => [
        ...friendRequests.map(
          (request) => ({
            type:
              "friend_request" as const,
            createdAt:
              request.created_at,
            request,
          }),
        ),
        ...notifications.map(
          (notification) => ({
            type:
              "pick_session" as const,
            createdAt:
              notification.created_at,
            notification,
          }),
        ),
      ].sort(
        (first, second) =>
          new Date(
            second.createdAt,
          ).getTime()
          - new Date(
            first.createdAt,
          ).getTime(),
      ),
      [
        friendRequests,
        notifications,
      ],
    );


  const loadNotifications =
    useCallback(
      async () => {
        try {
          setError(null);

          const [
            pickResponse,
            requests,
          ] = await Promise.all([
            getPickSessionNotifications(),
            getFriendRequests(),
          ]);

          setNotifications(
            pickResponse.notifications,
          );

          setPickUnreadCount(
            pickResponse.unread_count,
          );

          setFriendRequests(
            requests,
          );
        } catch (requestError) {
          setError(
            getApiErrorMessage(
              requestError,
              "Unable to load notifications.",
            ),
          );
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [],
    );


  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );


  async function openPickNotification(
    notification:
      PickSessionNotification,
  ) {
    if (!notification.is_read) {
      try {
        await markPickSessionNotificationRead(
          notification.id,
        );

        setNotifications(
          (current) =>
            current.map((item) =>
              item.id
              === notification.id
                ? {
                    ...item,
                    is_read: true,
                  }
                : item,
            ),
        );

        setPickUnreadCount(
          (count) =>
            Math.max(
              0,
              count - 1,
            ),
        );
      } catch {
        // Destination can still open.
      }
    }

    if (
      notification.kind
      === "restaurant_selected"
      || notification.kind
      === "group_vote_completed"
    ) {
      router.push({
        pathname:
          "/restaurants/[sessionId]/[optionId]",
        params: {
          sessionId:
            notification.session_id,
          optionId: "selected",
        },
      });

      return;
    }

    router.push({
      pathname:
        "/pick-votes/[id]",
      params: {
        id:
          notification.session_id,
      },
    });
  }


  async function respond(
    request: FriendRequest,
    action:
      | "accept"
      | "decline",
  ) {
    try {
      await respondToFriendRequest(
        request.friendship_id,
        action,
      );

      setFriendRequests(
        (current) =>
          current.filter(
            (item) =>
              item.friendship_id
              !== request.friendship_id,
          ),
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to update request",
        getApiErrorMessage(
          requestError,
          "The friend request could not be updated.",
        ),
      );
    }
  }


  async function markAllRead() {
    try {
      await markAllPickSessionNotificationsRead();

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
            }),
          ),
      );

      setPickUnreadCount(0);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to mark notifications read.",
        ),
      );
    }
  }


  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />

          <Text
            style={styles.loadingText}
          >
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <View>
          <Text
            style={styles.topBarTitle}
          >
            Notifications
          </Text>

          <Text
            style={
              styles.topBarSubtitle
            }
          >
            {unreadCount} unread
          </Text>
        </View>

        <Pressable
          disabled={
            pickUnreadCount === 0
          }
          onPress={() =>
            void markAllRead()
          }
          style={styles.topBarButton}
        >
          <CheckCheck
            size={21}
            color={
              pickUnreadCount > 0
                ? "#F3344A"
                : "#A7ADB6"
            }
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);

              void loadNotifications();
            }}
            tintColor={themeColor("#F3344A", "color")}
          />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        )}

        {combinedNotifications.length
          === 0 ? (
          <View style={styles.emptyCard}>
            <Bell
              size={38}
              color={themeColor("#F3344A", "color")}
            />

            <Text
              style={styles.emptyTitle}
            >
              Nothing new
            </Text>

            <Text
              style={styles.emptyText}
            >
              Friend requests, Group Vote
              invitations, and results will
              appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {combinedNotifications.map(
              (item) =>
                item.type
                === "friend_request" ? (
                  <View
                    key={
                      `friend-${item.request.friendship_id}`
                    }
                    style={[
                      styles.card,
                      styles.unreadCard,
                    ]}
                  >
                    <View
                      style={
                        styles.friendAvatar
                      }
                    >
                      <Avatar
                        imageUrl={
                          item.request.user.avatar
                        }
                        name={friendName(
                          item.request.user,
                        )}
                        size={47}
                      />
                    </View>

                    <View
                      style={
                        styles.cardContent
                      }
                    >
                      <View
                        style={
                          styles.titleRow
                        }
                      >
                        <Text
                          style={
                            styles.cardTitle
                          }
                        >
                          New Friend Request
                        </Text>

                        <View
                          style={
                            styles.unreadDot
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.cardMessage
                        }
                      >
                        {friendName(
                          item.request.user,
                        )} wants to add you
                        as a friend.
                      </Text>

                      <View
                        style={
                          styles.friendActions
                        }
                      >
                        <Pressable
                          onPress={() =>
                            void respond(
                              item.request,
                              "accept",
                            )
                          }
                          style={
                            styles.acceptButton
                          }
                        >
                          <Check
                            size={15}
                            color={themeColor("#FFFFFF", "color")}
                          />

                          <Text
                            style={
                              styles.acceptText
                            }
                          >
                            Accept
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            void respond(
                              item.request,
                              "decline",
                            )
                          }
                          style={
                            styles.declineButton
                          }
                        >
                          <X
                            size={15}
                            color={themeColor("#C62828", "color")}
                          />

                          <Text
                            style={
                              styles.declineText
                            }
                          >
                            Decline
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    key={
                      `pick-${item.notification.id}`
                    }
                    onPress={() =>
                      void openPickNotification(
                        item.notification,
                      )
                    }
                    style={[
                      styles.card,
                      !item.notification.is_read
                        && styles.unreadCard,
                    ]}
                  >
                    <View
                      style={
                        styles.iconCircle
                      }
                    >
                      {item.notification.kind
                      === "group_vote_completed"
                      || item.notification.kind
                      === "restaurant_selected" ? (
                        <Trophy
                          size={23}
                          color={themeColor("#D99A00", "color")}
                        />
                      ) : (
                        <Vote
                          size={23}
                          color={themeColor("#F3344A", "color")}
                        />
                      )}
                    </View>

                    <View
                      style={
                        styles.cardContent
                      }
                    >
                      <View
                        style={
                          styles.titleRow
                        }
                      >
                        <Text
                          style={
                            styles.cardTitle
                          }
                        >
                          {item.notification.title}
                        </Text>

                        {!item.notification.is_read
                          && (
                          <View
                            style={
                              styles.unreadDot
                            }
                          />
                        )}
                      </View>

                      <Text
                        style={
                          styles.cardMessage
                        }
                      >
                        {item.notification.message}
                      </Text>

                      <Text
                        style={
                          styles.openText
                        }
                      >
                        {item.notification.kind
                        === "restaurant_selected"
                        || item.notification.kind
                        === "group_vote_completed"
                          ? "View Restaurant"
                          : "Open Group Vote"}
                      </Text>
                    </View>

                    <ChevronRight
                      size={21}
                      color={themeColor("#9298A2", "color")}
                    />
                  </Pressable>
                ),
            )}
          </View>
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
    justifyContent:
      "space-between",
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
    textAlign: "center",
  },
  topBarSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "800",
    color: "#69707C",
    textAlign: "center",
  },
  content: {
    padding: 18,
    paddingBottom: 45,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#E3E6EA",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  unreadCard: {
    borderColor: "#F7B6BE",
    backgroundColor: "#FFF6F7",
  },
  iconCircle: {
    width: 49,
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#FFF0F2",
  },
  friendAvatar: {
    alignSelf: "flex-start",
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#F3344A",
  },
  cardMessage: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },
  openText: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: "900",
    color: "#F3344A",
  },
  friendActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: "#168B4F",
  },
  acceptText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  declineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: "#FFF1F1",
  },
  declineText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#C62828",
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 45,
    padding: 27,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
  },
  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: "#69707C",
    textAlign: "center",
  },
  errorCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
  },
  errorText: {
    fontWeight: "700",
    color: "#9F2424",
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontWeight: "700",
    color: "#69707C",
  },
});
