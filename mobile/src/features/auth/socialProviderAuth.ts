import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

import type {
  SocialLoginInput,
} from "./types";


const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";


let googleConfigured = false;


function configureGoogle() {
  if (googleConfigured) {
    return;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      "Google sign-in is not configured. "
      + "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.",
    );
  }

  GoogleSignin.configure({
    webClientId:
      GOOGLE_WEB_CLIENT_ID,
    ...(Platform.OS === "ios"
      && GOOGLE_IOS_CLIENT_ID
      ? {
          iosClientId:
            GOOGLE_IOS_CLIENT_ID,
        }
      : {}),
  });

  googleConfigured = true;
}


export async function getAppleSignInAvailable(): Promise<
  boolean
> {
  if (Platform.OS !== "ios") {
    return false;
  }

  return AppleAuthentication.isAvailableAsync();
}


export async function createAppleSocialLoginInput(): Promise<
  SocialLoginInput | null
> {
  if (Platform.OS !== "ios") {
    return null;
  }

  try {
    const credential =
      await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication
            .AppleAuthenticationScope
            .FULL_NAME,
          AppleAuthentication
            .AppleAuthenticationScope
            .EMAIL,
        ],
      });

    if (!credential.identityToken) {
      throw new Error(
        "Apple did not return an identity token.",
      );
    }

    const firstName =
      credential.fullName?.givenName?.trim()
      ?? "";
    const lastName =
      credential.fullName?.familyName?.trim()
      ?? "";
    const displayName =
      [
        firstName,
        lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
      provider: "apple",
      identity_token:
        credential.identityToken,
      ...(displayName
        ? {
            display_name:
              displayName,
          }
        : {}),
      ...(firstName
        ? {
            first_name:
              firstName,
          }
        : {}),
      ...(lastName
        ? {
            last_name:
              lastName,
          }
        : {}),
    };
  } catch (error) {
    if (
      error
      && typeof error === "object"
      && "code" in error
      && error.code
        === "ERR_REQUEST_CANCELED"
    ) {
      return null;
    }

    throw error;
  }
}


export async function createGoogleSocialLoginInput(): Promise<
  SocialLoginInput | null
> {
  configureGoogle();

  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  const response =
    await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return null;
  }

  const idToken =
    response.data.idToken;

  if (!idToken) {
    throw new Error(
      "Google did not return an identity token. "
      + "Check the web client ID configuration.",
    );
  }

  return {
    provider: "google",
    identity_token: idToken,
    display_name:
      response.data.user.name ?? "",
    first_name:
      response.data.user.givenName ?? "",
    last_name:
      response.data.user.familyName ?? "",
  };
}
