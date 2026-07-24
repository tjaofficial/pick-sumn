import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  ExternalLink,
} from "lucide-react-native";
import {
  Linking,
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


const TERMS_URL =
  "https://picksumn.com/terms";


export default function TermsScreen() {
  useAppTheme();

  async function openTerms() {
    await Linking.openURL(
      TERMS_URL,
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
            color={themeColor(
              "#07111F",
              "color",
            )}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          Terms of Service
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
        <Text style={styles.heading}>
          Pick Sum’N Terms of Service
        </Text>

        <Text style={styles.updated}>
          Last updated July 24, 2026
        </Text>

        <Text style={styles.sectionTitle}>
          Using Pick Sum’N
        </Text>

        <Text style={styles.body}>
          Pick Sum’N provides tools that
          help users discover restaurants,
          compare dining preferences,
          create groups, vote, and make
          restaurant decisions.
        </Text>

        <Text style={styles.body}>
          You are responsible for using
          Pick Sum’N lawfully and for the
          activity associated with your
          account.
        </Text>

        <Text style={styles.sectionTitle}>
          Your Account
        </Text>

        <Text style={styles.body}>
          You are responsible for
          maintaining the security of
          your account and for providing
          accurate information. You may
          not impersonate another person
          or misuse another user's
          account.
        </Text>

        <Text style={styles.sectionTitle}>
          Restaurant Information
        </Text>

        <Text style={styles.body}>
          Restaurant details, operating
          hours, availability, ratings,
          pricing, menus, and other
          information may come from
          third-party providers and may
          change without notice.
        </Text>

        <Text style={styles.sectionTitle}>
          Recommendations
        </Text>

        <Text style={styles.body}>
          Restaurant matches,
          compatibility scores, rankings,
          and suggestions are provided
          for convenience and do not
          guarantee that a restaurant
          will satisfy every user's
          preferences.
        </Text>

        <Text style={styles.sectionTitle}>
          Dietary Information
        </Text>

        <Text style={styles.body}>
          Pick Sum’N is not a medical
          service and should not be relied
          upon to determine whether food
          is safe for a specific allergy,
          intolerance, or medical
          condition. Important dietary
          information should always be
          confirmed directly with the
          restaurant.
        </Text>

        <Text style={styles.sectionTitle}>
          User Content
        </Text>

        <Text style={styles.body}>
          You are responsible for profile
          images, group images, names,
          descriptions, and other content
          you submit through Pick Sum’N.
        </Text>

        <Text style={styles.sectionTitle}>
          Acceptable Use
        </Text>

        <Text style={styles.body}>
          You may not use Pick Sum’N to
          harass others, gain unauthorized
          access to accounts or systems,
          interfere with the service, or
          engage in unlawful, fraudulent,
          or abusive activity.
        </Text>

        <Text style={styles.sectionTitle}>
          Service Availability
        </Text>

        <Text style={styles.body}>
          Pick Sum’N may change, add,
          suspend, or remove features over
          time. Uninterrupted or error-free
          availability cannot be
          guaranteed.
        </Text>

        <Text style={styles.sectionTitle}>
          Full Terms of Service
        </Text>

        <Text style={styles.body}>
          The complete and most current
          Pick Sum’N Terms of Service are
          available on our website.
        </Text>

        <Pressable
          onPress={() =>
            void openTerms()
          }
          style={styles.linkButton}
        >
          <ExternalLink
            size={18}
            color={themeColor(
              "#F3344A",
              "color",
            )}
          />

          <Text style={styles.linkText}>
            View Full Terms of Service
          </Text>
        </Pressable>
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

  linkButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  linkText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#F3344A",
  },
});