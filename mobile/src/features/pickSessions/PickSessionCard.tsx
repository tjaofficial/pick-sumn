import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Users,
} from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { PickSession } from "./types";

type PickSessionCardProps = {
  session: PickSession;
  onPress: () => void;
};

function getStatusColor(status: PickSession["status"]) {
  switch (status) {
    case "completed":
      return "#168B4F";

    case "cancelled":
    case "expired":
      return "#777E89";

    case "matching":
    case "voting":
      return "#8E44AD";

    default:
      return "#F3344A";
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PickSessionCard({
  session,
  onPress,
}: PickSessionCardProps) {
  const statusColor = getStatusColor(session.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {session.title || "Untitled Pick Session"}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusColor}18`,
              },
            ]}
          >
            {session.status === "completed" ? (
              <CheckCircle2
                size={13}
                color={statusColor}
              />
            ) : (
              <Clock3
                size={13}
                color={statusColor}
              />
            )}

            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {session.status_display}
            </Text>
          </View>
        </View>

        {!!session.group_name && (
          <Text style={styles.groupName}>
            {session.group_name}
          </Text>
        )}

        {!!session.selected_restaurant_name && (
          <Text style={styles.restaurant}>
            {session.selected_restaurant_name}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Users
              size={15}
              color="#727985"
            />

            <Text style={styles.metaText}>
              {session.participant_count}{" "}
              {session.participant_count === 1
                ? "person"
                : "people"}
            </Text>
          </View>

          {!!session.location_label && (
            <View style={styles.metaItem}>
              <MapPin
                size={15}
                color="#727985"
              />

              <Text
                style={styles.metaText}
                numberOfLines={1}
              >
                {session.location_label}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.date}>
          {formatDate(session.created_at)}
        </Text>
      </View>

      <ChevronRight
        size={22}
        color="#9298A2"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 17,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },

  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  main: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  groupName: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "700",
    color: "#F3344A",
  },

  restaurant: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: "800",
    color: "#343B46",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "65%",
  },

  metaText: {
    flexShrink: 1,
    fontSize: 12,
    color: "#727985",
  },

  date: {
    marginTop: 8,
    fontSize: 11,
    color: "#9298A2",
  },
});