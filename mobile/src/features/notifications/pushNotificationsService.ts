import {
  Platform,
} from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import {
  apiRequest,
} from "@/services/api";


export async function registerForPushNotifications(): Promise<
  string | null
> {
  if (
    Platform.OS !== "ios"
    && Platform.OS !== "android"
  ) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications
      .setNotificationChannelAsync(
        "default",
        {
          name: "Pick Sum’N",
          importance:
            Notifications
              .AndroidImportance
              .MAX,
          vibrationPattern: [
            0,
            250,
            250,
            250,
          ],
        },
      );
  }

  const existingPermissions =
    await Notifications
      .getPermissionsAsync();

  let finalStatus =
    existingPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions =
      await Notifications
        .requestPermissionsAsync();

    finalStatus =
      requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig
      ?.extra
      ?.eas
      ?.projectId
    ?? Constants.easConfig
      ?.projectId;

  if (!projectId) {
    return null;
  }

  const token = (
    await Notifications
      .getExpoPushTokenAsync({
        projectId,
      })
  ).data;

  await apiRequest(
    "/api/auth/push-tokens/",
    {
      method: "POST",
      body: JSON.stringify({
        expo_push_token: token,
        platform: Platform.OS,
        device_id: "",
      }),
    },
  );

  return token;
}
