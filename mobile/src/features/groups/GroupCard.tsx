import {
  CalendarClock,
  ChevronRight,
  Crown,
  Users,
} from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { DiningGroup } from "./types";

type GroupCardProps = {
  group: DiningGroup;
  onPress: () => void;
};

function formatGroupType(group: DiningGroup): string {
  return group.group_type === "temporary"
    ? "Temporary group"
    : "Permanent group";
}

function formatRole(role: DiningGroup["current_user_role"]): string {
  if (!role) {
    return "Member";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function GroupCard({
  group,
  onPress,
}: GroupCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.name}`}
    >
      <View style={styles.iconContainer}>
        <Users
          size={25}
          color="#F3344A"
          strokeWidth={2.2}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {group.name}
          </Text>

          {group.current_user_role === "owner" && (
            <Crown
              size={17}
              color="#E3A008"
              fill="#FFE18A"
            />
          )}
        </View>

        {!!group.description && (
          <Text
            style={styles.description}
            numberOfLines={2}
          >
            {group.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Users
              size={15}
              color="#727985"
            />

            <Text style={styles.metaText}>
              {group.member_count}{" "}
              {group.member_count === 1
                ? "member"
                : "members"}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <CalendarClock
              size={15}
              color="#727985"
            />

            <Text style={styles.metaText}>
              {formatGroupType(group)}
            </Text>
          </View>
        </View>

        <Text style={styles.role}>
          Your role: {formatRole(group.current_user_role)}
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
    gap: 14,
    padding: 18,
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
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  iconContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFF0F2",
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  name: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#07111F",
  },

  description: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#69707C",
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
  },

  metaText: {
    fontSize: 13,
    color: "#727985",
  },

  role: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#F3344A",
  },
});