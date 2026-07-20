import { ChevronRight, Crown, Users } from "lucide-react-native";
import {
  Image,
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

function formatRole(role: DiningGroup["current_user_role"]): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function GroupCard({ group, onPress }: GroupCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {group.image ? (
        <Image source={{ uri: group.image }} style={styles.groupImage} />
      ) : (
        <View style={styles.iconContainer}>
          <Users size={25} color="#F3344A" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
          {group.current_user_role === "owner" && (
            <Crown size={17} color="#E3A008" fill="#FFE18A" />
          )}
        </View>
        {!!group.description && (
          <Text style={styles.description} numberOfLines={2}>
            {group.description}
          </Text>
        )}
        <Text style={styles.metaText}>
          {group.member_count} {group.member_count === 1 ? "member" : "members"}
          {" · "}{formatRole(group.current_user_role)}
        </Text>
      </View>

      <ChevronRight size={22} color="#9298A2" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 22, backgroundColor: "#FFFFFF" },
  groupImage: { width: 50, height: 50, borderRadius: 25 },
  iconContainer: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#FFF0F2" },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flexShrink: 1, fontSize: 18, fontWeight: "800", color: "#07111F" },
  description: { marginTop: 5, fontSize: 14, lineHeight: 20, color: "#69707C" },
  metaText: { marginTop: 8, fontSize: 12, fontWeight: "700", color: "#727985" },
});
