import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/AuthContext";

export default function IndexScreen() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/pick" />;
  }

  return <Redirect href="/(auth)/login" />;
}