import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/AuthContext";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function IndexScreen() {
  useAppTheme();

  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/pick" />;
  }

  return <Redirect href="/(auth)/login" />;
}