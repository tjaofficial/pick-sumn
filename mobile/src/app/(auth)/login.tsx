import { Link } from "expo-router";
import {
  Fingerprint,
  ScanFace,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  KeyboardAwareScrollView,
} from "@/components/KeyboardAwareScrollView";
import { useAuth } from "@/features/auth/AuthContext";
import { SocialSignInButtons } from "@/features/auth/SocialSignInButtons";
import { ApiError } from "@/services/api";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function LoginScreen() {
  useAppTheme();

  const {
    biometricEnabled,
    biometricLabel,
    hasStoredSession,
    login,
    unlockWithBiometrics,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleBiometricLogin() {
    try {
      setIsSubmitting(true);
      setError(null);

      const unlocked =
        await unlockWithBiometrics();

      if (!unlocked) {
        setError(
          `${biometricLabel} authentication was not completed.`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin() {
    try {
      setIsSubmitting(true);
      setError(null);

      await login({
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (requestError) {
      if (
        requestError instanceof ApiError &&
        requestError.status === 401
      ) {
        setError("The email or password is incorrect.");
      } else {
        setError(
          "Unable to sign in. Check that Django is running.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <Image
          source={require("../../../assets/images/pick-sumn-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.subtitle}>
          Sign in before somebody says “I don’t care.”
        </Text>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={themeColor("#9298A2", "color")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={themeColor("#9298A2", "color")}
            secureTextEntry
            style={styles.input}
          />

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={isSubmitting}
            style={[
              styles.button,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Text>
          </Pressable>

          <SocialSignInButtons
            disabled={isSubmitting}
            onError={(message) =>
              setError(
                message || null,
              )
            }
          />

          {biometricEnabled
          && hasStoredSession && (
            <>
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>
                  OR
                </Text>
                <View style={styles.orLine} />
              </View>

              <Pressable
                onPress={() =>
                  void handleBiometricLogin()
                }
                disabled={isSubmitting}
                style={[
                  styles.biometricButton,
                  isSubmitting
                    && styles.buttonDisabled,
                ]}
              >
                {biometricLabel === "Face ID" ? (
                  <ScanFace
                    size={23}
                    color={themeColor("#07111F", "color")}
                  />
                ) : (
                  <Fingerprint
                    size={23}
                    color={themeColor("#07111F", "color")}
                  />
                )}

                <Text style={styles.biometricButtonText}>
                  Unlock with {biometricLabel}
                </Text>
              </Pressable>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              New to Pick Sum’N?
            </Text>

            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  logo: {
    width: "100%",
    maxWidth: 380,
    height: 250,
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 16,
    lineHeight: 23,
    color: "#606773",
    textAlign: "center",
  },
  form: {
    gap: 14,
  },
  input: {
    height: 56,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#07111F",
  },
  error: {
    color: "#C62828",
    fontWeight: "600",
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    paddingVertical: 17,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D9DDE3",
  },
  orText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9298A2",
  },
  biometricButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1.5,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    color: "#606773",
  },
  link: {
    color: "#F3344A",
    fontWeight: "800",
  },
});