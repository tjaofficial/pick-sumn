import { Stack } from "expo-router";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function AuthLayout() {
  useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}