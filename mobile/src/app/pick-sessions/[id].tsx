import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  Crown,
  LogOut,
  MapPin,
  RefreshCw,
  Rocket,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/features/auth/AuthContext";
import {
  cancelPickSession,
  getPickSession,
  startPickSessionMatching,
  updateParticipantStatus,
} from "@/features/pickSessions/pickSessionsService";
import type {
  PickSessionDetail,
  PickSessionParticipant,
} from "@/features/pickSessions/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/pick");
}

function getParticipantName(
  participant: PickSessionParticipant,
): string {
  return (
    participant.user.display_name ||
    participant.user.email
  );
}

function getStatusStyle(
  status: PickSessionParticipant["status"],
) {
  switch (status) {
    case "ready":
      return {
        backgroundColor: "#E8F7EF",
        color: "#168B4F",
      };

    case "joined":
      return {
        backgroundColor: "#EDF3FF",
        color: "#3A72D8",
      };

    case "declined":
    case "left":
      return {
        backgroundColor: "#F1F2F4",
        color: "#777E89",
      };

    default:
      return {
        backgroundColor: "#FFF4D8",
        color: "#9A6C00",
      };
  }
}

export default function PickSessionDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const sessionId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const { user } = useAuth();

  const [session, setSession] =
    useState<PickSessionDetail | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setError("The session ID is missing.");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const result = await getPickSession(
        sessionId,
      );

      setSession(result);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load this Pick Session.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();

    const interval = setInterval(
      loadSession,
      5000,
    );

    return () => {
      clearInterval(interval);
    };
  }, [loadSession]);

  const currentParticipant =
    session?.participants.find(
      (participant) =>
        participant.user.id === user?.id,
    );

  const allActiveParticipantsReady =
    Boolean(session) &&
    session?.participants
      .filter(
        (participant) =>
          participant.status !== "declined" &&
          participant.status !== "left",
      )
      .every(
        (participant) =>
          participant.status === "ready",
      );

  async function handleReady() {
    if (!sessionId) {
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      await updateParticipantStatus(
        sessionId,
        "ready",
      );

      await loadSession();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to mark you as ready.",
        ),
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleStartMatching() {
    if (!sessionId) {
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      await startPickSessionMatching(
        sessionId,
      );

      await loadSession();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to start matching.",
        ),
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function performCancel() {
    if (!sessionId) {
      return;
    }

    try {
      setIsUpdating(true);

      await cancelPickSession(
        sessionId,
      );

      router.replace("/(tabs)/pick");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to cancel this session.",
        ),
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function confirmCancel() {
    if (!session) {
        setError("The session could not be loaded.");
        return;
    }

    if (Platform.OS === "web") {
        const confirmed = window.confirm(
        "Cancel Pick Session?\n\nEveryone will lose access to this active session.",
        );

        if (confirmed) {
        void performCancel();
        }

        return;
    }

    Alert.alert(
        "Cancel Pick Session?",
        "Everyone will lose access to this active session.",
        [
        {
            text: "Keep Session",
            style: "cancel",
        },
        {
            text: "Cancel Session",
            style: "destructive",
            onPress: () => {
            void performCancel();
            },
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

          <Text style={styles.stateText}>
            Loading the waiting room...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Session unavailable
          </Text>

          <Text style={styles.errorMessage}>
            {error}
          </Text>

          <Pressable
            onPress={loadSession}
            style={styles.retryButton}
          >
            <RefreshCw
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Pick Session
        </Text>

        <Pressable
          onPress={loadSession}
          style={styles.topBarButton}
        >
          <RefreshCw
            size={20}
            color="#07111F"
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Clock3
                size={15}
                color="#F3344A"
              />

              <Text style={styles.statusText}>
                {session.status_display}
              </Text>
            </View>

            {session.is_host && (
              <View style={styles.hostBadge}>
                <Crown
                  size={14}
                  color="#9A6C00"
                />

                <Text style={styles.hostBadgeText}>
                  Host
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>
            {session.title ||
              "Pick Sum’N Session"}
          </Text>

          {!!session.group_name && (
            <Text style={styles.groupName}>
              {session.group_name}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Users
                size={17}
                color="#69707C"
              />

              <Text style={styles.metaText}>
                {session.participant_count} people
              </Text>
            </View>

            {!!session.location_label && (
              <View style={styles.metaItem}>
                <MapPin
                  size={17}
                  color="#69707C"
                />

                <Text style={styles.metaText}>
                  {session.location_label}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.readySummary}>
          <Text style={styles.readySummaryTitle}>
            {allActiveParticipantsReady
              ? "Everybody is ready!"
              : "Waiting for the crew"}
          </Text>

          <Text style={styles.readySummaryText}>
            {
              session.participants.filter(
                (participant) =>
                  participant.status === "ready",
              ).length
            }{" "}
            of{" "}
            {
              session.participants.filter(
                (participant) =>
                  participant.status !==
                    "declined" &&
                  participant.status !== "left",
              ).length
            }{" "}
            active participants ready
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Participants
        </Text>

        <View style={styles.participantList}>
          {session.participants.map(
            (participant) => {
              const statusStyle =
                getStatusStyle(
                  participant.status,
                );

              return (
                <View
                  key={participant.id}
                  style={styles.participantCard}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getParticipantName(
                        participant,
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.participantContent}>
                    <View style={styles.nameRow}>
                      <Text
                        style={styles.participantName}
                      >
                        {getParticipantName(
                          participant,
                        )}
                      </Text>

                      {participant.is_host && (
                        <Crown
                          size={15}
                          color="#D99A00"
                          fill="#FFE18A"
                        />
                      )}
                    </View>

                    <Text
                      style={styles.participantEmail}
                    >
                      {participant.user.email}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.participantStatus,
                      {
                        backgroundColor:
                          statusStyle.backgroundColor,
                      },
                    ]}
                  >
                    {participant.status ===
                      "ready" && (
                      <Check
                        size={13}
                        color={statusStyle.color}
                        strokeWidth={3}
                      />
                    )}

                    <Text
                      style={[
                        styles.participantStatusText,
                        {
                          color:
                            statusStyle.color,
                        },
                      ]}
                    >
                      {participant.status_display}
                    </Text>
                  </View>
                </View>
              );
            },
          )}
        </View>

        {error && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>
              {error}
            </Text>
          </View>
        )}

        {currentParticipant &&
          currentParticipant.status !== "ready" &&
          currentParticipant.status !== "declined" &&
          currentParticipant.status !== "left" && (
            <Pressable
              onPress={handleReady}
              disabled={isUpdating}
              style={[
                styles.readyButton,
                isUpdating &&
                  styles.buttonDisabled,
              ]}
            >
              {isUpdating ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Check
                  size={22}
                  color="#FFFFFF"
                  strokeWidth={3}
                />
              )}

              <Text style={styles.readyButtonText}>
                I’m Ready
              </Text>
            </Pressable>
          )}

        {session.is_host && (
          <>
            <Pressable
              onPress={handleStartMatching}
              disabled={
                !allActiveParticipantsReady ||
                isUpdating ||
                session.status === "matching"
              }
              style={[
                styles.startButton,
                (!allActiveParticipantsReady ||
                  isUpdating ||
                  session.status ===
                    "matching") &&
                  styles.startButtonDisabled,
              ]}
            >
              <Rocket
                size={22}
                color="#FFFFFF"
              />

              <Text style={styles.startButtonText}>
                {session.status === "matching"
                  ? "Matching Started"
                  : "Start Matching"}
              </Text>
            </Pressable>

            <Pressable
              onPress={confirmCancel}
              disabled={isUpdating}
              style={styles.cancelButton}
            >
              <LogOut
                size={20}
                color="#C62828"
              />

              <Text style={styles.cancelButtonText}>
                Cancel Session
              </Text>
            </Pressable>
          </>
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
  },

  content: {
    padding: 20,
    paddingBottom: 48,
  },

  heroCard: {
    padding: 21,
    borderRadius: 24,
    backgroundColor: "#07111F",
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#172332",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#F7A4AE",
  },

  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFF4CC",
  },

  hostBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#9A6C00",
  },

  title: {
    marginTop: 18,
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  groupName: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
    color: "#F7A4AE",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13,
    marginTop: 17,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaText: {
    fontSize: 12,
    color: "#C1C7D0",
  },

  readySummary: {
    marginTop: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  readySummaryTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  readySummaryText: {
    marginTop: 5,
    fontSize: 13,
    color: "#69707C",
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 11,
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
  },

  participantList: {
    gap: 9,
  },

  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  avatar: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFF0F2",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F3344A",
  },

  participantContent: {
    flex: 1,
    marginLeft: 11,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  participantName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  participantEmail: {
    marginTop: 3,
    fontSize: 11,
    color: "#777E89",
  },

  participantStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
  },

  participantStatusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  inlineError: {
    marginTop: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 16,
    backgroundColor: "#FFF1F1",
  },

  inlineErrorText: {
    color: "#9F2424",
    fontWeight: "700",
    textAlign: "center",
  },

  readyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 58,
    marginTop: 23,
    borderRadius: 18,
    backgroundColor: "#168B4F",
  },

  readyButtonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 59,
    marginTop: 23,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  startButtonDisabled: {
    backgroundColor: "#B8BDC5",
  },

  startButtonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    marginTop: 11,
    borderWidth: 1.5,
    borderColor: "#E8A7A7",
    borderRadius: 17,
    backgroundColor: "#FFF4F4",
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#C62828",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  stateText: {
    color: "#69707C",
    fontWeight: "700",
  },

  errorTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#07111F",
  },

  errorMessage: {
    maxWidth: 350,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
    paddingHorizontal: 21,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});