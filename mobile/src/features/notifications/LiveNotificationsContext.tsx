import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  ShieldCheck,
  UserPlus,
  Vote,
} from "lucide-react-native";
import {
  Alert,
  AppState,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  getFriendRequests,
  respondToFriendRequest,
} from "@/features/friends/friendsService";
import type {
  FriendRequest,
} from "@/features/friends/types";
import {
  getPickSessionNotifications,
  markPickSessionNotificationRead,
} from "@/features/pickSessions/pickSessionsService";
import type {
  PickSessionNotification,
} from "@/features/pickSessions/types";
import {
  registerForPushNotifications,
} from "@/features/notifications/pushNotificationsService";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


const FALLBACK_POLL_INTERVAL_MS =
  15_000;


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


type LiveNotificationsContextValue = {
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
};


const LiveNotificationsContext =
  createContext<
    LiveNotificationsContextValue
    | undefined
  >(undefined);


function getFriendRequestName(
  request: FriendRequest,
): string {
  const fullName = [
    request.user.first_name,
    request.user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName
    || request.user.display_name
    || request.user.email
  );
}


function openPushNotification(
  data?: Record<string, unknown>,
) {
  if (!data) {
    return;
  }
  const kind = String(
    data.kind
    ?? "",
  );

  const sessionId = String(
    data.session_id
    ?? "",
  );

  if (kind === "friend_request") {
    router.push(
      "/notifications",
    );

    return;
  }

  if (
    kind === "group_vote_invite"
    || kind === "group_vote_started"
  ) {
    if (!sessionId) {
      return;
    }

    router.push({
      pathname:
        "/pick-votes/[id]",
      params: {
        id: sessionId,
      },
    });

    return;
  }

  if (
    kind === "group_vote_completed"
    || kind === "restaurant_selected"
  ) {
    if (!sessionId) {
      return;
    }

    router.push({
      pathname:
        "/restaurants/[sessionId]/[optionId]",
      params: {
        sessionId,
        optionId: "selected",
      },
    });

    return;
  }

  if (kind === "dietary_feedback") {
    const placeId = String(
      data
        .selected_restaurant_external_id
      ?? "",
    );

    const dietarySlug = String(
      data.dietary_slug
      ?? "",
    );

    if (
      !placeId
      || !dietarySlug
    ) {
      return;
    }

    router.push({
      pathname:
        "/restaurants/[placeId]/dietary",
      params: {
        placeId,
        dietarySlug,
        restaurantName: String(
          data.restaurant_name
          ?? "",
        ),
        sourceUrl: "",
      },
    });
  }
}


export function LiveNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isAuthenticated,
  } = useAuth();

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    invitation,
    setInvitation,
  ] = useState<
    PickSessionNotification | null
  >(null);

  const [
    friendRequest,
    setFriendRequest,
  ] = useState<
    FriendRequest | null
  >(null);

  const [
    friendRequestCount,
    setFriendRequestCount,
  ] = useState(0);

  const dismissedVoteIds =
    useRef<Set<string>>(
      new Set(),
    );

  const dismissedFriendIds =
    useRef<Set<string>>(
      new Set(),
    );

  const appState =
    useRef(
      AppState.currentState,
    );

  const refreshInFlight =
    useRef(false);


  const refreshNotifications =
    useCallback(
      async () => {
        if (!isAuthenticated) {
          setUnreadCount(0);
          setInvitation(null);
          setFriendRequest(null);
          return;
        }

        if (refreshInFlight.current) {
          return;
        }

        refreshInFlight.current = true;

        try {
          const [
            notifications,
            friendRequests,
          ] = await Promise.all([
            getPickSessionNotifications(),
            getFriendRequests(),
          ]);

          setFriendRequestCount(
            friendRequests.length,
          );

          setUnreadCount(
            notifications.unread_count
            + friendRequests.length,
          );

          const nextFriendRequest =
            friendRequests.find(
              (request) =>
                !dismissedFriendIds
                  .current
                  .has(
                    request.friendship_id,
                  ),
            ) ?? null;

          const nextInvitation =
            notifications.notifications.find(
              (item) =>
                !item.is_read
                && (
                  item.kind
                  === "group_vote_invite"
                  || item.kind
                  === "group_vote_started"
                  || item.kind
                  === "group_vote_completed"
                  || item.kind
                  === "restaurant_selected"
                  || item.kind
                  === "dietary_feedback"
                )
                && !dismissedVoteIds
                  .current
                  .has(item.id),
            ) ?? null;

          setFriendRequest(
            nextFriendRequest,
          );

          setInvitation(
            nextInvitation,
          );
        } catch {
        } finally {
          refreshInFlight.current = false;
        }
      },
      [isAuthenticated],
    );


  useEffect(() => {
    if (!isAuthenticated) {
      dismissedVoteIds.current.clear();
      dismissedFriendIds.current.clear();
      setUnreadCount(0);
      setInvitation(null);
      setFriendRequest(null);
      return;
    }

    void refreshNotifications();

    void registerForPushNotifications()
      .catch(() => null);

    const interval =
      setInterval(
        () => {
          if (
            appState.current
            === "active"
          ) {
            void refreshNotifications();
          }
        },
        FALLBACK_POLL_INTERVAL_MS,
      );

    const appStateSubscription =
      AppState.addEventListener(
        "change",
        (nextState) => {
          const wasInactive =
            appState.current
            !== "active";

          appState.current =
            nextState;

          if (
            wasInactive
            && nextState
              === "active"
          ) {
            void refreshNotifications();
          }
        },
      );

    const receivedSubscription =
      Notifications
        .addNotificationReceivedListener(
          () => {
            void refreshNotifications();
          },
        );

    const responseSubscription =
      Notifications
        .addNotificationResponseReceivedListener(
          (response) => {
            void refreshNotifications();

            const data =
              response.notification
                .request
                .content
                .data;

            openPushNotification(
              data
            );
          },
        );

    const lastResponse =
  Notifications
    .getLastNotificationResponse();

if (lastResponse) {
  openPushNotification(
    lastResponse.notification
      .request
      .content
      .data,
  );
}

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [
    isAuthenticated,
    refreshNotifications,
  ]);


  async function openInvitation() {
    const currentInvitation =
      invitation;

    if (!currentInvitation) {
      return;
    }

    try {
      await markPickSessionNotificationRead(
        currentInvitation.id,
      );
    } catch {
    }

    dismissedVoteIds.current.add(
      currentInvitation.id,
    );

    setInvitation(null);

    setUnreadCount(
      (count) =>
        Math.max(
          0,
          count - 1,
        ),
    );

    if (
      currentInvitation.kind
      === "dietary_feedback"
    ) {
      const selectedData =
        currentInvitation
          .selected_restaurant_data;

      const sourceUrl =
        selectedData
        && "external_id" in selectedData
          ? (
              selectedData.menu_uri
              || selectedData.website_uri
              || ""
            )
          : "";

      router.push({
        pathname:
          "/restaurants/[placeId]/dietary",
        params: {
          placeId:
            currentInvitation
              .selected_restaurant_external_id,
          dietarySlug:
            currentInvitation.dietary_slug,
          restaurantName:
            currentInvitation
              .selected_restaurant_name,
          sourceUrl,
        },
      });

      return;
    }

    if (
      currentInvitation.kind
      === "restaurant_selected"
      || currentInvitation.kind
      === "group_vote_completed"
    ) {
      router.push({
        pathname:
          "/restaurants/[sessionId]/[optionId]",
        params: {
          sessionId:
            currentInvitation.session_id,
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
          currentInvitation
            .session_id,
      },
    });
  }


  async function handleFriendRequest(
    action:
      | "accept"
      | "decline",
  ) {
    const currentRequest =
      friendRequest;

    if (!currentRequest) {
      return;
    }

    try {
      await respondToFriendRequest(
        currentRequest
          .friendship_id,
        action,
      );

      dismissedFriendIds.current.add(
        currentRequest
          .friendship_id,
      );

      setFriendRequest(null);

      setUnreadCount(
        (count) =>
          Math.max(
            0,
            count - 1,
          ),
      );

      await refreshNotifications();
    } catch (requestError) {
      Alert.alert(
        "Unable to update friend request",
        getApiErrorMessage(
          requestError,
          "The friend request could not be updated.",
        ),
      );
    }
  }


  function dismissFriendRequest() {
    if (!friendRequest) {
      return;
    }

    dismissedFriendIds.current.add(
      friendRequest.friendship_id,
    );

    setFriendRequest(null);
  }


  function dismissInvitation() {
    if (!invitation) {
      return;
    }

    dismissedVoteIds.current.add(
      invitation.id,
    );

    setInvitation(null);
  }


  return (
    <LiveNotificationsContext.Provider
      value={{
        unreadCount,
        refreshNotifications,
      }}
    >
      {children}

      <Modal
        visible={
          isAuthenticated
          && friendRequest
            !== null
        }
        transparent
        animationType="fade"
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <UserPlus
              size={34}
              color={themeColor("#F3344A", "color")}
            />

            <Text
              style={
                styles.modalTitle
              }
            >
              New Friend Request
            </Text>

            <Text
              style={
                styles.modalText
              }
            >
              {friendRequest
                ? (
                    `${getFriendRequestName(
                      friendRequest,
                    )} wants to add you as a friend.`
                    + (
                      friendRequestCount > 1
                        ? ` You also have ${
                            friendRequestCount - 1
                          } more pending request${
                            friendRequestCount - 1
                            === 1
                              ? ""
                              : "s"
                          }.`
                        : ""
                    )
                  )
                : ""}
            </Text>

            <Pressable
              onPress={() =>
                void handleFriendRequest(
                  "accept",
                )
              }
              style={
                styles.modalPrimary
              }
            >
              <Text
                style={
                  styles.modalPrimaryText
                }
              >
                Accept
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                void handleFriendRequest(
                  "decline",
                )
              }
              style={
                styles.modalDecline
              }
            >
              <Text
                style={
                  styles.modalDeclineText
                }
              >
                Decline
              </Text>
            </Pressable>

            <Pressable
              onPress={
                dismissFriendRequest
              }
              style={
                styles.modalSecondary
              }
            >
              <Text
                style={
                  styles.modalSecondaryText
                }
              >
                Later
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          isAuthenticated
          && friendRequest
            === null
          && invitation
            !== null
        }
        transparent
        animationType="fade"
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            {invitation?.kind
            === "dietary_feedback" ? (
              <ShieldCheck
                size={34}
                color={themeColor("#168B4F", "color")}
              />
            ) : (
              <Vote
                size={34}
                color={themeColor("#F3344A", "color")}
              />
            )}

            <Text
              style={
                styles.modalTitle
              }
            >
              {invitation?.kind
              === "dietary_feedback"
                ? invitation.title
                : invitation?.kind
                  === "restaurant_selected"
                  ? "Restaurant Selected"
                  : invitation?.kind
                    === "group_vote_completed"
                    ? "Group Vote Complete"
                    : invitation?.kind
                      === "group_vote_started"
                      ? "Group Vote Started"
                      : "Group Vote Invitation"}
            </Text>

            <Text
              style={
                styles.modalText
              }
            >
              {invitation?.message}
            </Text>

            <Pressable
              onPress={() =>
                void openInvitation()
              }
              style={
                styles.modalPrimary
              }
            >
              <Text
                style={
                  styles.modalPrimaryText
                }
              >
                {invitation?.kind
                === "dietary_feedback"
                  ? "Share Experience"
                  : invitation?.kind
                    === "restaurant_selected"
                    || invitation?.kind
                      === "group_vote_completed"
                    ? "View Restaurant"
                    : "Open Vote"}
              </Text>
            </Pressable>

            <Pressable
              onPress={
                dismissInvitation
              }
              style={
                styles.modalSecondary
              }
            >
              <Text
                style={
                  styles.modalSecondaryText
                }
              >
                Later
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LiveNotificationsContext.Provider>
  );
}


export function useLiveNotifications() {
  const context =
    useContext(
      LiveNotificationsContext,
    );

  if (!context) {
    throw new Error(
      "useLiveNotifications must be used inside LiveNotificationsProvider.",
    );
  }

  return context;
}


const styles = createThemedStyleSheet({
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor:
      "rgba(7,17,31,0.58)",
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    padding: 25,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
  },

  modalTitle: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  modalText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },

  modalPrimary: {
    width: "100%",
    minHeight: 53,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 21,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  modalPrimaryText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  modalDecline: {
    width: "100%",
    minHeight: 51,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  modalDeclineText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#F3344A",
  },

  modalSecondary: {
    padding: 12,
  },

  modalSecondaryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#69707C",
  },
});