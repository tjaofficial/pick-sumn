import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
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
  getActivePickSessions,
  makePickSessionCurrent,
} from "@/features/pickSessions/pickSessionsService";
import type {
  PickSession,
} from "@/features/pickSessions/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


export default function ActiveSessionsScreen() {
  const [
    sessions,
    setSessions,
  ] = useState<PickSession[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    selectingId,
    setSelectingId,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  const loadSessions = useCallback(
    async () => {
      try {
        setError(null);

        const results =
          await getActivePickSessions();

        setSessions(results);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load active sessions.",
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
      void loadSessions();
    }, [loadSessions]),
  );


  async function selectSession(
    session: PickSession,
  ) {
    try {
      setSelectingId(session.id);
      setError(null);

      await makePickSessionCurrent(
        session.id,
      );

      setSessions(
        (currentSessions) =>
          currentSessions.map(
            (currentSession) => ({
              ...currentSession,
              is_current:
                currentSession.id
                === session.id,
            }),
          ),
      );

      if (
        session.decision_mode
        === "group_vote"
      ) {
        router.replace({
          pathname:
            session.status === "voting"
            || session.status === "completed"
              ? "/pick-votes/[id]"
              : "/pick-sessions/[id]",
          params: {
            id: session.id,
          },
        });

        return;
      }

      router.replace({
        pathname: "/(tabs)/matches",
        params: {
          sessionId: session.id,
          decisionMode:
            session.decision_mode,
        },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to make this session current.",
        ),
      );
    } finally {
      setSelectingId(null);
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

          <Text
            style={styles.loadingText}
          >
            Loading sessions...
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
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Active Sessions
        </Text>

        <View style={styles.spacer} />
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
              void loadSessions();
            }}
            tintColor="#F3344A"
          />
        }
      >
        <Text style={styles.heading}>
          Choose your current session
        </Text>

        <Text style={styles.description}>
          Matches and Map always display the
          session marked Current.
        </Text>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Clock3
              size={36}
              color="#F3344A"
            />

            <Text style={styles.emptyTitle}>
              No active sessions
            </Text>

            <Text style={styles.emptyText}>
              Start a new Pick Sum’N session
              from the main tab.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.card,
                  session.is_current
                    && styles.currentCard,
                ]}
              >
                <View style={styles.cardTop}>
                  <View
                    style={styles.titleArea}
                  >
                    <Text
                      style={
                        styles.sessionTitle
                      }
                    >
                      {session.title
                        || "Pick Sum’N Session"}
                    </Text>

                    <Text style={styles.meta}>
                      {session.group_name
                        || "Just Me"}{" "}
                      ·{" "}
                      {
                        session
                          .decision_mode_display
                      }
                    </Text>
                  </View>

                  {session.is_current && (
                    <View
                      style={
                        styles.currentBadge
                      }
                    >
                      <Check
                        size={14}
                        color="#FFFFFF"
                        strokeWidth={3}
                      />

                      <Text
                        style={
                          styles.currentBadgeText
                        }
                      >
                        Current
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={styles.detailRow}
                >
                  <MapPin
                    size={16}
                    color="#69707C"
                  />

                  <Text
                    style={styles.detailText}
                  >
                    {session.location_label
                      || "Location unavailable"}
                  </Text>
                </View>

                <View
                  style={styles.detailRow}
                >
                  <Users
                    size={16}
                    color="#69707C"
                  />

                  <Text
                    style={styles.detailText}
                  >
                    {session.participant_count}{" "}
                    active participant
                    {session.participant_count
                    === 1
                      ? ""
                      : "s"}
                  </Text>
                </View>

                <Pressable
                  disabled={
                    selectingId !== null
                  }
                  onPress={() =>
                    void selectSession(session)
                  }
                  style={[
                    styles.selectButton,
                    session.is_current
                      && styles.selectedButton,
                  ]}
                >
                  {selectingId
                    === session.id ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.selectButtonText
                      }
                    >
                      {session.decision_mode
                        === "group_vote"
                        ? (
                            session.status
                            === "voting"
                            ? "Open Vote"
                            : "Open Waiting Room"
                          )
                        : session.is_current
                          ? "Open Current Session"
                          : "Make Current"}
                    </Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={() =>
            void loadSessions()
          }
          style={styles.refreshButton}
        >
          <RefreshCw
            size={16}
            color="#69707C"
          />

          <Text style={styles.refreshText}>
            Refresh sessions
          </Text>
        </Pressable>
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

  backButton: {
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

  spacer: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  heading: {
    fontSize: 25,
    fontWeight: "900",
    color: "#07111F",
  },

  description: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
  },

  list: {
    gap: 12,
    marginTop: 20,
  },

  card: {
    padding: 17,
    borderWidth: 1,
    borderColor: "#E1E4E8",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },

  currentCard: {
    borderColor: "#F3344A",
    backgroundColor: "#FFF6F7",
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  titleArea: {
    flex: 1,
  },

  sessionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#69707C",
  },

  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3344A",
  },

  currentBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },

  detailText: {
    flex: 1,
    fontSize: 12,
    color: "#69707C",
  },

  selectButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 47,
    marginTop: 16,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  selectedButton: {
    backgroundColor: "#07111F",
  },

  selectButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    color: "#9F2424",
    fontWeight: "700",
    textAlign: "center",
  },

  emptyCard: {
    alignItems: "center",
    marginTop: 22,
    padding: 26,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#69707C",
    textAlign: "center",
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },

  refreshText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#69707C",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    color: "#69707C",
    fontWeight: "700",
  },
});
