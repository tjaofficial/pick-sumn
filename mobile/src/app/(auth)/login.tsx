import { Link } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/services/api";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
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
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 230,
    height: 150,
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