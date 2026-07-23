import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  MessageSquareWarning,
  MessagesSquare,
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


const FAQS = [
  {
    question: "How does Pick Sum’N choose restaurants?",
    answer: (
      "Pick Sum’N combines the people in your session, their food "
      + "preferences, your selected dining styles, location, and session "
      + "filters to rank eligible restaurants."
    ),
  },
  {
    question: "Can my friends see my live location?",
    answer: (
      "No. Friends do not receive access to your live device location. "
      + "A Pick session only uses the search location selected for that session."
    ),
  },
  {
    question: "What happens when I block someone?",
    answer: (
      "Blocking removes the friendship relationship and prevents normal "
      + "friend interactions. Unblocking does not automatically restore the friendship."
    ),
  },
  {
    question: "Why am I not seeing a restaurant I expected?",
    answer: (
      "The restaurant may not match the selected dining styles, location radius, "
      + "open-now filter, or other session requirements. You can adjust session filters "
      + "and try again."
    ),
  },
];


export default function HelpSupportScreen() {
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
          Help & Support
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>
          Common Questions
        </Text>

        <View style={styles.card}>
          {FAQS.map((item, index) => (
            <View key={item.question}>
              <View style={styles.faqRow}>
                <CircleHelp
                  size={20}
                  color={themeColor("#F3344A", "color")}
                />
                <View style={styles.faqContent}>
                  <Text style={styles.faqQuestion}>
                    {item.question}
                  </Text>
                  <Text style={styles.faqAnswer}>
                    {item.answer}
                  </Text>
                </View>
              </View>
              {index < FAQS.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          Need More Help?
        </Text>

        <View style={styles.card}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/settings/feedback",
                params: {
                  type: "support",
                },
              })
            }
            style={styles.actionRow}
          >
            <MessagesSquare
              size={21}
              color={themeColor("#F3344A", "color")}
            />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Contact Support
              </Text>
              <Text style={styles.actionSubtitle}>
                Send us a support message
              </Text>
            </View>
            <ChevronRight
              size={21}
              color={themeColor("#9298A2", "color")}
            />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/settings/feedback",
                params: {
                  type: "bug",
                },
              })
            }
            style={styles.actionRow}
          >
            <MessageSquareWarning
              size={21}
              color={themeColor("#F3344A", "color")}
            />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>
                Report a Problem
              </Text>
              <Text style={styles.actionSubtitle}>
                Tell us what went wrong
              </Text>
            </View>
            <ChevronRight
              size={21}
              color={themeColor("#9298A2", "color")}
            />
          </Pressable>
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
  sectionTitle: {
    marginTop: 18,
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
  faqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 17,
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  faqAnswer: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  actionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#69707C",
  },
  divider: {
    height: 1,
    marginLeft: 17,
    backgroundColor: "#ECEDEF",
  },
});
