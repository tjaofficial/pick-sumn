import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
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


export default function LocationPrivacyScreen() {
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
          Location Privacy
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.hero}>
          <ShieldCheck
            size={30}
            color={themeColor("#168B4F", "color")}
          />

          <Text style={styles.heroTitle}>
            Your location stays under your control
          </Text>

          <Text style={styles.heroText}>
            Pick Sum’N uses a location when you choose where a restaurant
            search should happen. Being friends with someone does not give
            them access to your live device location.
          </Text>
        </View>

        <View style={styles.card}>
          <MapPin
            size={23}
            color={themeColor("#F3344A", "color")}
          />

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              Pick Session Locations
            </Text>

            <Text style={styles.cardText}>
              A session uses the search location selected for that meal.
              Group participants may see the session’s search area, but they
              do not receive continuous access to your precise live location.
            </Text>
          </View>
        </View>

        <Text style={styles.note}>
          Device-level location permission can always be changed from your
          phone’s Settings app.
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
  hero: {
    alignItems: "center",
    padding: 23,
    borderRadius: 23,
    backgroundColor: "#EFFAF3",
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },
  heroText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#5F6671",
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },
  cardText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: "#69707C",
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    color: "#777E89",
  },
});
