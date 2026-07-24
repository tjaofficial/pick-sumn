import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  createAppleSocialLoginInput,
  createGoogleSocialLoginInput,
  createFacebookSocialLoginInput,
  getAppleSignInAvailable,
} from "@/features/auth/socialProviderAuth";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";
import { ApiError } from "@/services/api";
import {
  createThemedStyleSheet,
} from "@/theme/themedStyleSheet";


type Props = {
  disabled?: boolean;
  onError: (message: string) => void;
};


function getMessage(
  error: unknown,
): string {
  if (
    error instanceof ApiError
    && error.message.trim()
  ) {
    return error.message;
  }

  if (
    error instanceof Error
    && error.message.trim()
  ) {
    return error.message;
  }

  return (
    "Unable to complete social sign-in. "
    + "Please try again."
  );
}


export function SocialSignInButtons({
  disabled = false,
  onError,
}: Props) {
  const {
    colorScheme,
  } = useAppTheme();

  const {
    socialLogin,
  } = useAuth();

  const [
    appleAvailable,
    setAppleAvailable,
  ] = useState(false);

  const [
    activeProvider,
    setActiveProvider,
  ] = useState<
    "apple"
    | "google"
    | "facebook"
    | null
  >(null);


  useEffect(() => {
    async function loadAppleAvailability() {
      try {
        setAppleAvailable(
          await getAppleSignInAvailable(),
        );
      } catch {
        setAppleAvailable(false);
      }
    }

    void loadAppleAvailability();
  }, []);


  async function handleApple() {
    try {
      setActiveProvider("apple");
      onError("");

      const input =
        await createAppleSocialLoginInput();

      if (!input) {
        return;
      }

      await socialLogin(
        input,
      );
    } catch (error) {
      onError(
        getMessage(error),
      );
    } finally {
      setActiveProvider(null);
    }
  }


  async function handleGoogle() {
    try {
      setActiveProvider("google");
      onError("");

      const input =
        await createGoogleSocialLoginInput();

      if (!input) {
        return;
      }

      await socialLogin(
        input,
      );
    } catch (error) {
      onError(
        getMessage(error),
      );
    } finally {
      setActiveProvider(null);
    }
  }


  async function handleFacebook() {
    try {
      setActiveProvider("facebook");
      onError("");

      const input =
        await createFacebookSocialLoginInput();

      if (!input) {
        return;
      }

      await socialLogin(
        input,
      );
    } catch (error) {
      onError(
        getMessage(error),
      );
    } finally {
      setActiveProvider(null);
    }
  }


  const busy =
    activeProvider !== null;


  return (
    <View style={styles.container}>
      <View style={styles.orRow}>
        <View style={styles.orLine} />

        <Text style={styles.orText}>
          OR CONTINUE WITH
        </Text>

        <View style={styles.orLine} />
      </View>

      {appleAvailable
      && Platform.OS === "ios" && (
        <View style={styles.appleWrap}>
          {activeProvider === "apple" ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication
                  .AppleAuthenticationButtonType
                  .CONTINUE
              }
              buttonStyle={
                colorScheme === "dark"
                  ? AppleAuthentication
                      .AppleAuthenticationButtonStyle
                      .WHITE
                  : AppleAuthentication
                      .AppleAuthenticationButtonStyle
                      .BLACK
              }
              cornerRadius={16}
              style={styles.appleButton}
              onPress={() =>
                void handleApple()
              }
            />
          )}
        </View>
      )}

      <Pressable
        onPress={() =>
          void handleGoogle()
        }
        disabled={
          disabled
          || busy
        }
        style={({ pressed }) => [
          styles.googleButton,
          pressed
            && styles.googleButtonPressed,
          (disabled || busy)
            && styles.disabled,
        ]}
      >
        {activeProvider === "google" ? (
          <ActivityIndicator />
        ) : (
          <>
            <View style={styles.googleMark}>
              <Text style={styles.googleMarkText}>
                G
              </Text>
            </View>

            <Text style={styles.googleButtonText}>
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() =>
          void handleFacebook()
        }
        disabled={
          disabled
          || busy
        }
        style={({ pressed }) => [
          styles.facebookButton,
          pressed
            && styles.facebookButtonPressed,
          (disabled || busy)
            && styles.disabled,
        ]}
      >
        {activeProvider === "facebook" ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <>
            <View style={styles.facebookMark}>
              <Text style={styles.facebookMarkText}>
                f
              </Text>
            </View>

            <Text style={styles.facebookButtonText}>
              Continue with Facebook
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}


const styles = createThemedStyleSheet({
  container: {
    gap: 12,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D9DDE3",
  },
  orText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#9298A2",
  },
  appleWrap: {
    height: 54,
  },
  appleButton: {
    width: "100%",
    height: 54,
  },
  loadingButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  googleButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  googleButtonPressed: {
    backgroundColor: "#F8F8F9",
  },
  googleMark: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  googleMarkText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#4285F4",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  facebookButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#1877F2",
  },
  facebookButtonPressed: {
    opacity: 0.88,
  },
  facebookMark: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  facebookMarkText: {
    marginTop: 3,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900",
    color: "#1877F2",
  },
  facebookButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.6,
  },
});
