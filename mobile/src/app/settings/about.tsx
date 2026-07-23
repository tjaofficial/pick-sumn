import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Info,
} from "lucide-react-native";
import Constants from "expo-constants";
import {
  Pressable,
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


export default function AboutScreen() {
  useAppTheme();

  const version =
    Constants.expoConfig?.version
    ?? "1.0.0";

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
          About Pick Sum’N
        </Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Info
            size={34}
            color={themeColor("#F3344A", "color")}
          />

          <Text style={styles.appName}>
            Pick Sum’N
          </Text>

          <Text style={styles.version}>
            Version {version}
          </Text>

          <Text style={styles.description}>
            Pick Sum’N helps individuals, friends, families, and groups
            decide where to eat by combining shared food preferences,
            session filters, and nearby restaurant options.
          </Text>
        </View>

        <Text style={styles.footer}>
          Made to make “Where should we eat?” a lot easier.
        </Text>
      </View>
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
  },
  card: {
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
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
  footer: {
    marginTop: 18,
    fontSize: 12,
    color: "#9298A2",
    textAlign: "center",
  },
});
