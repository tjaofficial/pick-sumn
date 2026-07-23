import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  MapPin,
  ShieldBan,
  UserRoundCheck,
  UsersRound,
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


type RowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};


function Row({
  icon,
  title,
  subtitle,
  onPress,
}: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed
          && styles.rowPressed,
      ]}
    >
      <View style={styles.rowIcon}>
        {icon}
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>

      <ChevronRight
        size={21}
        color={themeColor("#9298A2", "color")}
      />
    </Pressable>
  );
}


export default function PrivacySecurityScreen() {
  useAppTheme();

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
          Privacy & Security
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
      >
        <View style={styles.card}>
          <Row
            icon={
              <ShieldBan
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Blocked Users"
            subtitle="View and manage people you have blocked"
            onPress={() =>
              router.push(
                "/settings/blocked-users",
              )
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <UserRoundCheck
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Friend Request Privacy"
            subtitle="Control who can send you friend requests"
            onPress={() =>
              router.push({
                pathname:
                  "/settings/privacy-options",
                params: {
                  type: "friend_requests",
                },
              })
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <UsersRound
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Group Invite Privacy"
            subtitle="Control who can invite you to groups"
            onPress={() =>
              router.push({
                pathname:
                  "/settings/privacy-options",
                params: {
                  type: "group_invites",
                },
              })
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <MapPin
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Location Privacy"
            subtitle="Learn how Pick Sum’N uses session locations"
            onPress={() =>
              router.push(
                "/settings/location-privacy",
              )
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <KeyRound
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Change Password"
            subtitle="Update the password used to sign in"
            onPress={() =>
              router.push(
                "/settings/change-password",
              )
            }
          />
        </View>
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
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  rowPressed: {
    backgroundColor: "#F8F8F9",
  },
  rowIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#07111F",
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#737A85",
  },
  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: "#ECEDEF",
  },
});
