import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ChevronRight,
  Trophy,
  Vote,
} from "lucide-react-native";
import {
  ActivityIndicator,
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
  useState,
} from "react";

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


export default function NotificationsScreen() {
  const [
    notifications,
    setNotifications,
  ] = useState<
    PickSessionNotification[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
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


  const loadNotifications =
    useCallback(
      async () => {
        try {
          setError(null);

          const response =
            await getPickSessionNotifications();

          setNotifications(
            response.notifications,
          );

          setUnreadCount(
            response.unread_count,
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


  async function openNotification(
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
              item.id === notification.id
                ? {
                    ...item,
                    is_read: true,
                  }
                : item,
            ),
        );

        setUnreadCount(
          (count) => Math.max(
            0,
            count - 1,
          ),
        );
      } catch {
        // The destination should still open.
      }
    }

    router.push({
      pathname: "/pick-votes/[id]",
      params: {
        id: notification.session_id,
      },
    });
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

      setUnreadCount(0);
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
            color="#F3344A"
          />

          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.screen}>
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

        <View>
          <Text style={styles.topBarTitle}>
            Notifications
          </Text>

          <Text style={styles.topBarSubtitle}>
            {unreadCount} unread
          </Text>
        </View>

        <Pressable
          disabled={unreadCount === 0}
          onPress={() =>
            void markAllRead()
          }
          style={styles.topBarButton}
        >
          <CheckCheck
            size={21}
            color={
              unreadCount > 0
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
            tintColor="#F3344A"
          />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell
              size={38}
              color="#F3344A"
            />

            <Text style={styles.emptyTitle}>
              Nothing new
            </Text>

            <Text style={styles.emptyText}>
              Group Vote invitations and
              results will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map(
              (notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() =>
                    void openNotification(
                      notification,
                    )
                  }
                  style={[
                    styles.card,
                    !notification.is_read
                      && styles.unreadCard,
                  ]}
                >
                  <View
                    style={
                      styles.iconCircle
                    }
                  >
                    {notification.kind
                    === "group_vote_completed" ? (
                      <Trophy
                        size={23}
                        color="#D99A00"
                      />
                    ) : (
                      <Vote
                        size={23}
                        color="#F3344A"
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
                        {notification.title}
                      </Text>

                      {!notification.is_read && (
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
                      {notification.message}
                    </Text>

                    <Text
                      style={styles.openText}
                    >
                      Open Group Vote
                    </Text>
                  </View>

                  <ChevronRight
                    size={21}
                    color="#9298A2"
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

  cardContent: {
    flex: 1,
    marginHorizontal: 12,
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
