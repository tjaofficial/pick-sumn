import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/services/api";

export default function RegisterScreen() {
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] =
    useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    if (password !== passwordConfirm) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await register({
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
        password,
        password_confirm: passwordConfirm,
      });
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(
          "We could not create the account. Check the entered information.",
        );
      } else {
        setError(
          "Unable to connect to the server.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.logoText}>PICK SUM’N</Text>

          <Text style={styles.title}>
            Create your account
          </Text>

          <Text style={styles.subtitle}>
            Your food profile is about to become more
            decisive than the group chat.
          </Text>

          <View style={styles.form}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor="#9298A2"
              style={styles.input}
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#9298A2"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9298A2"
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="Confirm password"
              placeholderTextColor="#9298A2"
              secureTextEntry
              style={styles.input}
            />

            {error && (
              <Text style={styles.error}>{error}</Text>
            )}

            <Pressable
              onPress={handleRegister}
              disabled={isSubmitting}
              style={[
                styles.button,
                isSubmitting && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {isSubmitting
                  ? "Creating Account..."
                  : "Create Account"}
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?
              </Text>

              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.link}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#F3344A",
    textAlign: "center",
  },
  title: {
    marginTop: 18,
    fontSize: 30,
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