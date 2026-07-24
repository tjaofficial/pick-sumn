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


const PRIVACY_URL =
  "https://picksumn.com/privacy";


export default function PrivacyPolicyScreen() {
  useAppTheme();

  async function openPrivacyPolicy() {
    await Linking.openURL(
      PRIVACY_URL,
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
          Privacy Policy
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
          Pick Sum’N Privacy Policy
        </Text>

        <Text style={styles.updated}>
          Last updated July 24, 2026
        </Text>

        <Text style={styles.sectionTitle}>
          Information We Collect
        </Text>

        <Text style={styles.body}>
          Pick Sum’N may collect
          information you provide when
          creating and using your account,
          including your name, email
          address, profile information,
          food preferences, dining
          preferences, profile and group
          photos, friendships, groups,
          votes, saved restaurants, and
          recent restaurant selections.
        </Text>

        <Text style={styles.sectionTitle}>
          Location
        </Text>

        <Text style={styles.body}>
          Pick Sum’N may request access
          to your location so the app can
          find restaurants near you and
          provide location-based
          recommendations. Your live
          device location is not
          automatically shared with
          friends or group members.
        </Text>

        <Text style={styles.sectionTitle}>
          How We Use Your Information
        </Text>

        <Text style={styles.body}>
          Information collected by
          Pick Sum’N may be used to
          provide restaurant searches,
          generate personalized matches,
          support group and voting
          features, maintain your account,
          save your preferences, provide
          customer support, and maintain
          the security and operation of
          the service.
        </Text>

        <Text style={styles.sectionTitle}>
          Social and Group Features
        </Text>

        <Text style={styles.body}>
          Certain information may be
          visible to users you choose to
          interact with. This can include
          your name, profile image, group
          membership, votes, and other
          information needed for shared
          Pick Sum’N features.
        </Text>

        <Text style={styles.sectionTitle}>
          Third-Party Services
        </Text>

        <Text style={styles.body}>
          Pick Sum’N uses third-party
          services to provide features
          such as authentication, hosting,
          restaurant information, maps,
          media storage, and other app
          functionality. Those providers
          may process information needed
          to perform their services.
        </Text>

        <Text style={styles.sectionTitle}>
          Your Choices
        </Text>

        <Text style={styles.body}>
          You can manage privacy,
          security, notification, location,
          blocked-user, and account
          options through Pick Sum’N
          Settings and your device
          settings.
        </Text>

        <Text style={styles.sectionTitle}>
          Account Deletion
        </Text>

        <Text style={styles.body}>
          You can request deletion of
          your Pick Sum’N account from
          the Delete Account option in
          Settings.
        </Text>

        <Text style={styles.sectionTitle}>
          Full Privacy Policy
        </Text>

        <Text style={styles.body}>
          The complete and most current
          Pick Sum’N Privacy Policy is
          available on our website.
        </Text>

        <Pressable
          onPress={() =>
            void openPrivacyPolicy()
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
            View Full Privacy Policy
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