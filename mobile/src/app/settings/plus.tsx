import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  Crown,
  Heart,
  HeartHandshake,
  LockKeyhole,
  MapPinned,
  ExternalLink,
  SearchCheck,
  SlidersHorizontal,
  Users,
  UtensilsCrossed,
} from "lucide-react-native";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePlus } from "@/features/plus/PlusContext";
import { useTheme } from "@/hooks/use-theme";
import { createThemedStyleSheet, themeColor } from "@/theme/themedStyleSheet";
import { useAppTheme } from "@/features/settings/AppThemeContext";

const FEATURES = [
  {
    title: "Larger Groups",
    description: "Free sessions support up to 3 people. Plus unlocks larger group matching.",
    icon: Users,
  },
  {
    title: "Extended Search Radius",
    description: "Search farther from any current, saved, or manually selected location.",
    icon: MapPinned,
  },
  {
    title: "Dining Styles",
    description: "Turn on advanced filters such as dine-in, carryout, delivery, bar/tavern, and more.",
    icon: UtensilsCrossed,
  },
  {
    title: "Price Range",
    description: "Narrow a session to the price levels that fit the meal you are planning.",
    icon: SlidersHorizontal,
  },
  {
    title: "Unlimited Saved Restaurants",
    description: "Free accounts can save up to 5 favorites. Plus removes the limit.",
    icon: Heart,
  },
  {
    title: "Group-Friendly Filters",
    description: "Use richer filters like good-for-groups and reservation-friendly options.",
    icon: HeartHandshake,
  },
  {
    title: "Enhanced Dietary Insights",
    description: "See deeper evidence while core dietary matching stays available to everyone.",
    icon: SearchCheck,
  },
];

export default function PlusScreen() {
  useAppTheme();
  const colors = useTheme();
  const { isPlus, entitlements } = usePlus();
  const params = useLocalSearchParams<{ source?: string | string[] }>();

  const source = Array.isArray(params.source)
    ? params.source[0]
    : params.source;

  const sourceMessage =
    source === "radius"
      ? "You reached the Free search-radius limit."
      : source === "dining-style"
        ? "Dining Styles are available with Pick Sum’N Plus."
        : source === "price"
          ? "Price Range is available with Pick Sum’N Plus."
          : source === "group-size"
            ? "Free sessions support up to 3 people total."
            : source === "saved-restaurants"
              ? "Free accounts can save up to 5 restaurants."
              : "";

  async function manageSubscription() {
    if (Platform.OS !== "ios") {
      Alert.alert(
        "Subscription management",
        "Google Play subscription management will be added with Android billing.",
      );
      return;
    }

    try {
      const url = "https://apps.apple.com/account/subscriptions";
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        throw new Error("Subscription settings are unavailable.");
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Unable to open subscriptions",
        "Open the App Store, tap your profile, then choose Subscriptions to manage Pick Sum’N Plus.",
      );
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={23} color={colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.text }]}>Pick Sum’N Plus</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.crownCircle}>
            <Crown size={34} color={themeColor("#C67A00", "color")} />
          </View>
          <Text style={styles.heroTitle}>Bigger groups. Smarter filters. More ways to Pick Sum’N.</Text>
          <Text style={styles.heroText}>
            Keep the core experience free, then unlock the extra convenience when you want more control.
          </Text>
        </View>

        {!!sourceMessage && (
          <View style={styles.sourceCard}>
            <LockKeyhole size={19} color={themeColor("#9A5A00", "color")} />
            <Text style={styles.sourceText}>{sourceMessage}</Text>
          </View>
        )}

        {FEATURES.map(({ title, description, icon: Icon }) => (
          <View
            key={title}
            style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.featureIcon}>
              <Icon size={22} color={themeColor("#F3344A", "color")} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{description}</Text>
            </View>
            <Check size={20} color={themeColor("#168B4F", "color")} strokeWidth={3} />
          </View>
        ))}

        {isPlus ? (
          <>
            <View style={styles.activeCard}>
              <Crown size={24} color={themeColor("#168B4F", "color")} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeTitle}>Plus is active</Text>
                <Text style={styles.activeText}>
                  Extended radius up to {entitlements.max_search_radius_miles} miles, unlimited favorites, and premium filters are unlocked.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => void manageSubscription()}
              style={styles.manageButton}
            >
              <ExternalLink size={18} color={themeColor("#07111F", "color")} />
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => router.push("/settings/plus-payment")} style={styles.upgradeButton}>
            <Crown size={21} color={themeColor("#FFFFFF", "color")} />
            <Text style={styles.upgradeButtonText}>See Plus Plans</Text>
          </Pressable>
        )}

        <Text style={styles.finePrint}>
          Core cuisine and dietary matching remains available on the Free plan.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  topTitle: { fontSize: 18, fontWeight: "900", color: "#07111F" },
  spacer: { width: 42 },
  content: { padding: 20, paddingBottom: 50 },
  hero: { alignItems: "center", padding: 24, borderRadius: 25, backgroundColor: "#FFF4DC" },
  crownCircle: { width: 66, height: 66, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#FFFFFF" },
  heroTitle: { marginTop: 16, fontSize: 23, lineHeight: 29, fontWeight: "900", color: "#07111F", textAlign: "center" },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#69707C", textAlign: "center" },
  sourceCard: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, padding: 14, borderWidth: 1, borderColor: "#E8D3A7", borderRadius: 17, backgroundColor: "#FFF8E9" },
  sourceText: { flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 17, color: "#775F3B" },
  featureCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 15, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 19, backgroundColor: "#FFFFFF" },
  featureIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF0F2" },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: "900", color: "#07111F" },
  featureText: { marginTop: 3, fontSize: 11, lineHeight: 16, color: "#69707C" },
  upgradeButton: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 22, borderRadius: 18, backgroundColor: "#F3344A" },
  upgradeButtonText: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
  activeCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22, padding: 17, borderWidth: 1, borderColor: "#B8E1C9", borderRadius: 18, backgroundColor: "#EFFAF3" },
  activeTitle: { fontSize: 15, fontWeight: "900", color: "#116A3D" },
  activeText: { marginTop: 3, fontSize: 11, lineHeight: 16, color: "#3B7656" },
  manageButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, borderWidth: 1, borderColor: "#D9DDE3", borderRadius: 16, backgroundColor: "#FFFFFF" },
  manageButtonText: { fontSize: 13, fontWeight: "900", color: "#07111F" },
  finePrint: { marginTop: 13, fontSize: 10, lineHeight: 15, color: "#7A808A", textAlign: "center" },
});
