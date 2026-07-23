import { Redirect } from "expo-router";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function PickReviewRedirect() {
  useAppTheme();

  return <Redirect href="/(tabs)/pick" />;
}