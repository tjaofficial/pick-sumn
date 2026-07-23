import {
  router,
} from "expo-router";
import {
  ArrowLeft,
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


export default function PrivacyPolicyScreen() {
  useAppTheme();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>
        <Text style={styles.topTitle}>
          Privacy Policy
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.heading}>
          Pick Sum’N Privacy Policy
        </Text>
        <Text style={styles.updated}>
          Draft in-app policy
        </Text>

        <Text style={styles.sectionTitle}>
          Information We Use
        </Text>
        <Text style={styles.body}>
          Pick Sum’N may use account information, profile details, food
          preferences, saved locations, session locations, friendship and
          group relationships, and app activity needed to provide restaurant
          matching and social features.
        </Text>

        <Text style={styles.sectionTitle}>
          Location
        </Text>
        <Text style={styles.body}>
          Location information is used to search for restaurants in the area
          selected for a Pick session. Friends do not automatically receive
          access to your live device location.
        </Text>

        <Text style={styles.sectionTitle}>
          Sharing
        </Text>
        <Text style={styles.body}>
          Information needed for shared sessions may be visible to people
          participating in that session. Pick Sum’N should not sell personal
          information to advertisers.
        </Text>

        <Text style={styles.sectionTitle}>
          Account Controls
        </Text>
        <Text style={styles.body}>
          You can manage privacy settings, blocked users, notification
          preferences, and delete your account from App Settings.
        </Text>

        <Text style={styles.note}>
          This is an in-app draft and should be replaced with the final
          attorney-reviewed and publicly hosted Privacy Policy before public
          App Store or Play Store release.
        </Text>
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
  heading: {
    fontSize: 24,
    fontWeight: "900",
    color: "#07111F",
  },
  updated: {
    marginTop: 5,
    fontSize: 12,
    color: "#9298A2",
  },
  sectionTitle: {
    marginTop: 22,
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },
  body: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 21,
    color: "#69707C",
  },
  note: {
    marginTop: 28,
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#FFF0F2",
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },
});
