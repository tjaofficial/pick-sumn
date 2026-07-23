import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  LockKeyhole,
  MessageSquare,
  Moon,
  Shield,
  Trash2,
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
  useTheme,
} from "@/hooks/use-theme";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


type SettingsRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
};


function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: SettingsRowProps) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor:
            pressed
              ? colors.surfaceMuted
              : colors.surface,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor:
              danger
                ? colors.dangerSoft
                : colors.primarySoft,
          },
        ]}
      >
        {icon}
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowTitle,
            {
              color:
                danger
                  ? colors.danger
                  : colors.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.rowSubtitle,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>

      <ChevronRight
        size={21}
        color={
          danger
            ? colors.danger
            : colors.textMuted
        }
      />
    </Pressable>
  );
}


export default function AppSettingsScreen() {
  useAppTheme();

  const colors = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.screen,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={colors.text}
          />
        </Pressable>

        <Text
          style={[
            styles.topTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          App Settings
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Preferences
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={
              <Bell
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Notifications"
            subtitle="Choose which alerts you receive"
            onPress={() =>
              router.push(
                "/settings/notifications",
              )
            }
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <SettingsRow
            icon={
              <Shield
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Privacy & Security"
            subtitle="Blocked users, privacy, password, and location"
            onPress={() =>
              router.push(
                "/settings/privacy-security",
              )
            }
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <SettingsRow
            icon={
              <Moon
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Appearance"
            subtitle="Choose your app theme"
            onPress={() =>
              router.push(
                "/settings/appearance",
              )
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Support
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={
              <HelpCircle
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Help & Support"
            subtitle="Get help using Pick Sum’N"
            onPress={() =>
              router.push(
                "/settings/help-support",
              )
            }
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <SettingsRow
            icon={
              <MessageSquare
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Send Feedback"
            subtitle="Tell us what would make Pick Sum’N better"
            onPress={() =>
              router.push(
                "/settings/feedback",
              )
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          About
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={
              <LockKeyhole
                size={21}
                color={themeColor("#69707C", "color")}
              />
            }
            title="Privacy Policy"
            subtitle="Learn how your information is handled"
            onPress={() =>
              router.push(
                "/settings/privacy-policy",
              )
            }
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <SettingsRow
            icon={
              <FileText
                size={21}
                color={themeColor("#69707C", "color")}
              />
            }
            title="Terms of Service"
            subtitle="Review the terms for using Pick Sum’N"
            onPress={() =>
              router.push(
                "/settings/terms",
              )
            }
          />


          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <SettingsRow
            icon={
              <FileText
                size={21}
                color={themeColor("#69707C", "color")}
              />
            }
            title="About Pick Sum’N"
            subtitle="App version and product information"
            onPress={() =>
              router.push(
                "/settings/about",
              )
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon={
              <Trash2
                size={21}
                color={themeColor("#C62828", "color")}
              />
            }
            title="Delete Account"
            subtitle="Permanently delete your Pick Sum’N account"
            danger
            onPress={() =>
              router.push(
                "/settings/delete-account",
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
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
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
  dangerIcon: {
    backgroundColor: "#FFF1F1",
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
  dangerText: {
    color: "#C62828",
  },
  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: "#ECEDEF",
  },
});
