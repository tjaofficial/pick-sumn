import Constants from "expo-constants";
import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Info,
  LifeBuoy,
  ShieldCheck,
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


const SUPPORT_URL =
  "https://picksumn.com/support";

const PRIVACY_URL =
  "https://picksumn.com/privacy";

const TERMS_URL =
  "https://picksumn.com/terms";


export default function AboutScreen() {
  useAppTheme();

  const version =
    Constants.expoConfig?.version
    ?? "1.0.0";

  async function openUrl(
    url: string,
  ) {
    await Linking.openURL(
      url,
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
          About Pick Sum’N
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
          <View style={styles.iconWrap}>
            <Info
              size={34}
              color={themeColor(
                "#F3344A",
                "color",
              )}
            />
          </View>

          <Text style={styles.appName}>
            Pick Sum’N
          </Text>

          <Text style={styles.version}>
            Version {version}
          </Text>

          <Text style={styles.description}>
            Pick Sum’N helps individuals,
            couples, friends, families,
            and groups decide where to eat
            by combining shared food
            preferences, session filters,
            and nearby restaurant options.
          </Text>

          <Text style={styles.tagline}>
            Stop arguing. Start eating.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>
          INFORMATION
        </Text>

        <Pressable
          onPress={() =>
            router.push(
              "/settings/privacy-policy",
            )
          }
          style={styles.row}
        >
          <View style={styles.rowIcon}>
            <ShieldCheck
              size={20}
              color={themeColor(
                "#F3344A",
                "color",
              )}
            />
          </View>

          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              Privacy Policy
            </Text>

            <Text
              style={styles.rowDescription}
            >
              Learn how Pick Sum’N handles
              your information.
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(
              "/settings/terms",
            )
          }
          style={styles.row}
        >
          <View style={styles.rowIcon}>
            <FileText
              size={20}
              color={themeColor(
                "#F3344A",
                "color",
              )}
            />
          </View>

          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              Terms of Service
            </Text>

            <Text
              style={styles.rowDescription}
            >
              Review the terms that govern
              use of Pick Sum’N.
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() =>
            void openUrl(
              SUPPORT_URL,
            )
          }
          style={styles.row}
        >
          <View style={styles.rowIcon}>
            <LifeBuoy
              size={20}
              color={themeColor(
                "#F3344A",
                "color",
              )}
            />
          </View>

          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              Support
            </Text>

            <Text
              style={styles.rowDescription}
            >
              Get help with your account
              or the Pick Sum’N app.
            </Text>
          </View>

          <ExternalLink
            size={17}
            color={themeColor(
              "#9298A2",
              "color",
            )}
          />
        </Pressable>

        <Text style={styles.sectionLabel}>
          WEBSITE
        </Text>

        <Pressable
          onPress={() =>
            void openUrl(
              PRIVACY_URL,
            )
          }
          style={styles.websiteButton}
        >
          <Text
            style={styles.websiteButtonText}
          >
            picksumn.com
          </Text>

          <ExternalLink
            size={17}
            color={themeColor(
              "#F3344A",
              "color",
            )}
          />
        </Pressable>

        <Text style={styles.footer}>
          © 2026 Pick Sum’N
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

  card: {
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },

  iconWrap: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 33,
    backgroundColor: "#FFF0F2",
  },

  appName: {
    marginTop: 13,
    fontSize: 25,
    fontWeight: "900",
    color: "#07111F",
  },

  version: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "800",
    color: "#69707C",
  },

  description: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 20,
    color: "#69707C",
    textAlign: "center",
  },

  tagline: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: "900",
    color: "#F3344A",
  },

  sectionLabel: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#F3344A",
  },

  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  rowIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  rowText: {
    flex: 1,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#07111F",
  },

  rowDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#69707C",
  },

  websiteButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },

  websiteButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#F3344A",
  },

  footer: {
    marginTop: 24,
    fontSize: 12,
    color: "#9298A2",
    textAlign: "center",
  },
});