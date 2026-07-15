import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  RefreshCw,
  Search,
  Store,
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
  getRecentPickSessions,
} from "@/features/pickSessions/pickSessionsService";
import type {
  PickSession,
} from "@/features/pickSessions/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";


function formatDateLabel(
  value: string | null,
): string {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}


function getStatusLabel(
  session: PickSession,
): string {
  if (session.status === "cancelled") {
    return "Closed";
  }

  if (session.status === "completed") {
    return "Picked";
  }

  if (session.status === "expired") {
    return "Expired";
  }

  return session.status_display;
}


type RecentPickCardProps = {
  session: PickSession;
};


function RecentPickCard({
  session,
}: RecentPickCardProps) {
  const pickedName =
    session.selected_restaurant_name
    || "No final restaurant selected";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname:
            "/pick-sessions/[id]",
          params: {
            id: session.id,
          },
        })
      }
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.iconBox}>
          <Store
            size={22}
            color="#F3344A"
          />
        </View>

        <View style={styles.cardHeading}>
          <Text
            style={styles.cardTitle}
            numberOfLines={1}
          >
            {session.title || "Pick Sum’N Session"}
          </Text>

          <Text
            style={styles.cardSubtitle}
            numberOfLines={1}
          >
            {pickedName}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {getStatusLabel(session)}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <MapPin
            size={16}
            color="#69707C"
          />

          <Text
            style={styles.metaText}
            numberOfLines={1}
          >
            {session.location_label || "Location unavailable"}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Search
            size={16}
            color="#69707C"
          />

          <Text style={styles.metaText}>
            {session.search_radius_miles} mi radius
          </Text>
        </View>

        <View style={styles.metaItem}>
          <CalendarClock
            size={16}
            color="#69707C"
          />

          <Text style={styles.metaText}>
            {formatDateLabel(
              session.completed_at
              || session.updated_at
              || session.created_at,
            )}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}


export default function RecentPicksScreen() {
  const [
    recentSessions,
    setRecentSessions,
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
    error,
    setError,
  ] = useState<string | null>(null);

  const loadRecentPicks = useCallback(
    async () => {
      try {
        setError(null);

        const response =
          await getRecentPickSessions();

        setRecentSessions(response);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load recent picks.",
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
      void loadRecentPicks();
    }, [loadRecentPicks]),
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadRecentPicks();
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text style={styles.loadingTitle}>
            Loading recent picks...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Recent Picks
        </Text>

        <Pressable
          onPress={() =>
            void loadRecentPicks()
          }
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#F3344A"
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Your Food History
          </Text>

          <Text style={styles.heroText}>
            Every completed, cancelled, or expired Pick Sum’N session shows up here.
          </Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Couldn’t load recent picks
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() =>
                void loadRecentPicks()
              }
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        )}

        {!error && recentSessions.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Store
                size={34}
                color="#F3344A"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No recent picks yet
            </Text>

            <Text style={styles.emptyText}>
              Start a Pick Sum’N session and older active sessions will move here automatically.
            </Text>

            <Pressable
              onPress={() =>
                router.replace("/(tabs)/pick")
              }
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Start Pick Sum’N
              </Text>
            </Pressable>
          </View>
        )}

        {!error && recentSessions.length > 0 && (
          <View style={styles.list}>
            {recentSessions.map((session) => (
              <RecentPickCard
                key={session.id}
                session={session}
              />
            ))}
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
  },

  content: {
    padding: 18,
    paddingBottom: 42,
  },

  hero: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#07111F",
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  heroText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#C1C7D0",
  },

  list: {
    gap: 13,
    marginTop: 18,
  },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  cardPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFF0F2",
  },

  cardHeading: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  cardSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#69707C",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F1F2F4",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#4F5662",
  },

  metaGrid: {
    gap: 8,
    marginTop: 14,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  metaText: {
    flex: 1,
    fontSize: 12,
    color: "#69707C",
  },

  errorCard: {
    alignItems: "center",
    marginTop: 20,
    padding: 21,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 22,
    backgroundColor: "#FFF1F1",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#9F2424",
  },

  errorText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: "#9F2424",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  emptyCard: {
    alignItems: "center",
    marginTop: 20,
    padding: 26,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
  },

  emptyIcon: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#FFF0F2",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyText: {
    maxWidth: 320,
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: "#69707C",
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 15,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  loadingTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#07111F",
  },
});