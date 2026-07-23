import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  MessageSquareText,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useMemo,
  useState,
} from "react";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";
import {
  submitFeedback,
} from "@/features/settings/settingsService";
import type {
  FeedbackType,
} from "@/features/settings/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


const TYPES: {
  value: FeedbackType;
  label: string;
}[] = [
  {
    value: "general",
    label: "General Feedback",
  },
  {
    value: "feature",
    label: "Feature Request",
  },
  {
    value: "bug",
    label: "Report a Problem",
  },
  {
    value: "support",
    label: "Help & Support",
  },
];


export default function FeedbackScreen() {
  useAppTheme();

  const params =
    useLocalSearchParams<{
      type?: string | string[];
    }>();

  const initialType =
    useMemo<FeedbackType>(
      () => {
        const raw = Array.isArray(
          params.type,
        )
          ? params.type[0]
          : params.type;

        return TYPES.some(
          (item) =>
            item.value === raw,
        )
          ? raw as FeedbackType
          : "general";
      },
      [params.type],
    );

  const [
    feedbackType,
    setFeedbackType,
  ] = useState<FeedbackType>(
    initialType,
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    mayContact,
    setMayContact,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);


  async function handleSubmit() {
    if (
      message.trim().length < 5
    ) {
      Alert.alert(
        "Add more detail",
        "Tell us a little more before submitting.",
      );

      return;
    }

    try {
      setIsSubmitting(true);

      await submitFeedback({
        feedback_type:
          feedbackType,
        message:
          message.trim(),
        may_contact:
          mayContact,
      });

      Alert.alert(
        "Thanks for the feedback",
        "Your message was submitted successfully.",
        [
          {
            text: "Done",
            onPress: () =>
              router.back(),
          },
        ],
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to submit",
        getApiErrorMessage(
          requestError,
          "Your feedback could not be submitted.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
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
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          Send Feedback
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <MessageSquareText
            size={27}
            color={themeColor("#F3344A", "color")}
          />
          <Text style={styles.heroTitle}>
            Help us improve Pick Sum’N
          </Text>
          <Text style={styles.heroText}>
            Share an idea, report a problem, or send us a support question.
          </Text>
        </View>

        <Text style={styles.label}>
          Feedback Type
        </Text>

        <View style={styles.typeWrap}>
          {TYPES.map((item) => {
            const selected =
              item.value
              === feedbackType;

            return (
              <Pressable
                key={item.value}
                onPress={() =>
                  setFeedbackType(
                    item.value,
                  )
                }
                style={[
                  styles.typeButton,
                  selected
                    && styles.typeButtonSelected,
                ]}
              >
                {selected && (
                  <Check
                    size={15}
                    color={themeColor("#FFFFFF", "color")}
                  />
                )}
                <Text
                  style={[
                    styles.typeText,
                    selected
                      && styles.typeTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>
          Message
        </Text>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what you think..."
          placeholderTextColor={themeColor("#9298A2", "color")}
          multiline
          maxLength={3000}
          textAlignVertical="top"
          style={styles.messageInput}
        />

        <Text style={styles.characterCount}>
          {message.length}/3000
        </Text>

        <View style={styles.contactRow}>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>
              You may contact me
            </Text>
            <Text style={styles.contactSubtitle}>
              Allow the Pick Sum’N team to follow up using the email on your account.
            </Text>
          </View>

          <Switch
            value={mayContact}
            onValueChange={setMayContact}
          />
        </View>

        <Pressable
          onPress={() =>
            void handleSubmit()
          }
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            isSubmitting
              && styles.submitDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={themeColor("#FFFFFF", "color")}
            />
          ) : (
            <MessageSquareText
              size={20}
              color={themeColor("#FFFFFF", "color")}
            />
          )}

          <Text style={styles.submitText}>
            Submit Feedback
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
  hero: {
    alignItems: "center",
    padding: 22,
    borderRadius: 22,
    backgroundColor: "#FFF0F2",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
  },
  heroText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#69707C",
    textAlign: "center",
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "900",
    color: "#343B46",
  },
  typeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  typeButtonSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },
  typeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#69707C",
  },
  typeTextSelected: {
    color: "#FFFFFF",
  },
  messageInput: {
    minHeight: 170,
    padding: 15,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
    color: "#07111F",
  },
  characterCount: {
    marginTop: 5,
    fontSize: 11,
    color: "#9298A2",
    textAlign: "right",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#07111F",
  },
  contactSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },
  submitButton: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
