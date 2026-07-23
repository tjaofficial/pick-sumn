import { Stack } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  SafeAreaProvider,
} from "react-native-safe-area-context";

import {
  AuthProvider,
  useAuth,
} from "@/features/auth/AuthContext";
import {
  LiveNotificationsProvider,
} from "@/features/notifications/LiveNotificationsContext";
import {
  PickDraftProvider,
} from "@/features/pickSessions/PickDraftContext";
import {
  AppThemeProvider,
} from "@/features/settings/AppThemeContext";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={themeColor("#F3344A", "color")}
        />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected
        guard={!isAuthenticated}
      >
        <Stack.Screen
          name="(auth)"
        />
      </Stack.Protected>

      <Stack.Protected
        guard={isAuthenticated}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="groups/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="preferences"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick/new"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick/setup"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick/location"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick/review"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick/recent"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick-sessions/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="pick-votes/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="notifications/index"
          options={{
            headerShown: false,
          }}
        />


        <Stack.Screen
          name="settings/index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/privacy-security"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/blocked-users"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/privacy-options"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/notifications"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/appearance"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/change-password"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/location-privacy"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/delete-account"
          options={{
            headerShown: false,
          }}
        />


        <Stack.Screen
          name="settings/help-support"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/feedback"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/about"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/privacy-policy"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="settings/terms"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="restaurants/[sessionId]/[optionId]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="restaurants/[placeId]/dietary"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}


export default function RootLayout() {
  return (
    <GestureHandlerRootView
      style={styles.root}
    >
      <SafeAreaProvider>
        <AuthProvider>
          <AppThemeProvider>
            <PickDraftProvider>
              <LiveNotificationsProvider>
                <RootNavigator />
              </LiveNotificationsProvider>
            </PickDraftProvider>
          </AppThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


const styles = createThemedStyleSheet({
  root: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9F2",
  },
});