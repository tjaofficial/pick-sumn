import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  KeyRound,
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
  confirmPasswordReset,
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


export default function ResetPasswordScreen() {
  useAppTheme();

  const params =
    useLocalSearchParams<{
      uid?: string | string[];
      token?: string | string[];
    }>();

  const uid =
    Array.isArray(params.uid)
      ? params.uid[0]
      : params.uid;

  const token =
    Array.isArray(params.token)
      ? params.token[0]
      : params.token;

  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [complete, setComplete] =
    useState(false);

  const linkIsValid =
    Boolean(uid && token);

  async function submit() {
    if (!uid || !token) {
      setError(
        "This reset link is incomplete."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Your new password must be at least 8 characters."
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await confirmPasswordReset({
        uid,
        token,
        new_password: password,
        new_password_confirm:
          confirmPassword,
      });

      setComplete(true);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          (
            "This password reset link "
            + "is invalid or has expired."
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
          onPress={() =>
            router.replace(
              "/(auth)/login"
            )
          }
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          Reset Password
        </Text>

        <View style={styles.spacer} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.iconCircle}>
          <KeyRound
            size={31}
            color={themeColor("#F3344A", "color")}
          />
        </View>

        {complete ? (
          <>
            <Text style={styles.title}>
              Password updated
            </Text>

            <Text style={styles.description}>
              Your password has been reset.
              Sign in with your new password.
            </Text>

            <Pressable
              onPress={() =>
                router.replace(
                  "/(auth)/login"
                )
              }
              style={styles.primaryButton}
            >
              <Text
                style={styles.primaryText}
              >
                Sign In
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              Choose a new password
            </Text>

            <Text style={styles.description}>
              Enter a new password for your
              Pick Sum’N account.
            </Text>

            {!linkIsValid && (
              <Text style={styles.error}>
                This reset link is incomplete.
                Request a new one from the
                sign-in screen.
              </Text>
            )}

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor={themeColor("#9298A2", "color")}
              secureTextEntry
              autoComplete="new-password"
              style={styles.input}
            />

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={themeColor("#9298A2", "color")}
              secureTextEntry
              autoComplete="new-password"
              style={[
                styles.input,
                styles.secondInput,
              ]}
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
              disabled={
                isSubmitting
                || !linkIsValid
              }
              style={[
                styles.primaryButton,
                (
                  isSubmitting
                  || !linkIsValid
                )
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
                  Reset Password
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
  secondInput: {
    marginTop: 12,
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
    opacity: 0.5,
  },
});
