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


export default function TermsScreen() {
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
          Terms of Service
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.heading}>
          Pick Sum’N Terms of Service
        </Text>
        <Text style={styles.updated}>
          Draft in-app terms
        </Text>

        <Text style={styles.sectionTitle}>
          Using Pick Sum’N
        </Text>
        <Text style={styles.body}>
          You are responsible for using Pick Sum’N lawfully and for the
          information you submit through your account.
        </Text>

        <Text style={styles.sectionTitle}>
          Restaurant Information
        </Text>
        <Text style={styles.body}>
          Restaurant details, hours, dietary information, availability, and
          other third-party information may change. Always confirm important
          details directly with the restaurant, especially for allergies or
          dietary safety.
        </Text>

        <Text style={styles.sectionTitle}>
          Accounts and Social Features
        </Text>
        <Text style={styles.body}>
          You are responsible for your account and interactions with other
          users. Pick Sum’N may limit access to features when necessary to
          protect the service or its users.
        </Text>

        <Text style={styles.sectionTitle}>
          Service Availability
        </Text>
        <Text style={styles.body}>
          Pick Sum’N may change, add, or remove features over time and cannot
          guarantee uninterrupted availability.
        </Text>

        <Text style={styles.note}>
          This is an in-app draft and should be replaced with final
          attorney-reviewed and publicly hosted Terms of Service before public
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
