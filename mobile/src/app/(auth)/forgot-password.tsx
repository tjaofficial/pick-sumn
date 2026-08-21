import {
  Link,
  router,
} from "expo-router";
import {
  ArrowLeft,
  Mail,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useState,
} from "react";

import {
  KeyboardAwareScrollView,
} from "@/components/KeyboardAwareScrollView";
import {
  requestPasswordReset,
} from "@/features/auth/authService";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


export default function ForgotPasswordScreen() {
  useAppTheme();

  const [email, setEmail] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [sent, setSent] =
    useState(false);

  async function submit() {
    const cleanedEmail =
      email.trim().toLowerCase();

    if (!cleanedEmail) {
      setError(
        "Enter your email address."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await requestPasswordReset(
        cleanedEmail
      );

      setSent(true);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          (
            "Unable to send reset "
            + "instructions right now."
          ),
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
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(
                "/(auth)/login"
              );
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          Forgot Password
        </Text>

        <View style={styles.spacer} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.iconCircle}>
          <Mail
            size={31}
            color={themeColor("#F3344A", "color")}
          />
        </View>

        <Text style={styles.title}>
          Reset your password
        </Text>

        <Text style={styles.description}>
          Enter the email you use for
          Pick Sum’N. If the account uses
          a password, we’ll email you a
          secure reset link. Social-only
          accounts will receive their
          sign-in method instead.
        </Text>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>
              Check your email
            </Text>

            <Text style={styles.successText}>
              If an eligible Pick Sum’N
              account exists for that email,
              we sent sign-in instructions.
            </Text>

            <Link
              href="/(auth)/login"
              asChild
            >
              <Pressable
                style={styles.primaryButton}
              >
                <Text
                  style={styles.primaryText}
                >
                  Back to Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={themeColor("#9298A2", "color")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              style={styles.input}
            />

            {!!error && (
              <Text style={styles.error}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={() =>
                void submit()
              }
              disabled={isSubmitting}
              style={[
                styles.primaryButton,
                isSubmitting
                  && styles.disabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={themeColor("#FFFFFF", "color")}
                />
              ) : (
                <Text
                  style={styles.primaryText}
                >
                  Send Reset Link
                </Text>
              )}
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 24,
    backgroundColor: "#FFF0F2",
  },
  title: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },
  description: {
    marginTop: 9,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#07111F",
  },
  error: {
    marginTop: 12,
    color: "#C62828",
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.6,
  },
  successCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#B8E1C9",
    borderRadius: 20,
    backgroundColor: "#EFFAF3",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#116A3D",
    textAlign: "center",
  },
  successText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: "#3B7656",
    textAlign: "center",
  },
});
