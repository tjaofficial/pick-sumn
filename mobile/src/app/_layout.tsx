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
  AuthProvider,
  useAuth,
} from "@/features/auth/AuthContext";
import {
  PickDraftProvider,
} from "@/features/pickSessions/PickDraftContext";


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
          color="#F3344A"
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
          name="photo-crop/index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="photo-crop/preview"
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
          name="restaurants/[sessionId]/[optionId]"
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
      <AuthProvider>
        <PickDraftProvider>
          <RootNavigator />
        </PickDraftProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
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