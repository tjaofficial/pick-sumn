import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import {
  AccessToken,
  AuthenticationToken,
  LoginManager,
  Settings,
} from "react-native-fbsdk-next";
import { Platform } from "react-native";

import type {
  SocialLoginInput,
} from "./types";


const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

const FACEBOOK_APP_ID =
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";


let googleConfigured = false;
let facebookConfigured = false;


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


function configureFacebook() {
  if (facebookConfigured) {
    return;
  }

  if (!FACEBOOK_APP_ID) {
    throw new Error(
      "Facebook sign-in is not configured. "
      + "EXPO_PUBLIC_FACEBOOK_APP_ID is missing.",
    );
  }

  Settings.setAppID(
    FACEBOOK_APP_ID,
  );

  Settings.initializeSDK();

  facebookConfigured = true;
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
      token_type: "oidc",
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
    token_type: "oidc",
    display_name:
      response.data.user.name ?? "",
    first_name:
      response.data.user.givenName ?? "",
    last_name:
      response.data.user.familyName ?? "",
  };
}


export async function createFacebookSocialLoginInput(): Promise<
  SocialLoginInput | null
> {
  configureFacebook();

  if (Platform.OS === "ios") {
    const nonce =
      Crypto.randomUUID();

    const result =
      await LoginManager.logInWithPermissions(
        [
          "public_profile",
          "email",
        ],
        "limited",
        nonce,
      );

    if (result.isCancelled) {
      return null;
    }

    const token =
      await AuthenticationToken
        .getAuthenticationTokenIOS();

    const authenticationToken =
      token?.authenticationToken;

    if (!authenticationToken) {
      throw new Error(
        "Facebook did not return an authentication token.",
      );
    }

    return {
      provider: "facebook",
      identity_token:
        authenticationToken,
      token_type: "oidc",
      nonce,
    };
  }

  const result =
    await LoginManager.logInWithPermissions(
      [
        "public_profile",
        "email",
      ],
    );

  if (result.isCancelled) {
    return null;
  }

  const token =
    await AccessToken
      .getCurrentAccessToken();

  const accessToken =
    token?.accessToken;

  if (!accessToken) {
    throw new Error(
      "Facebook did not return an access token.",
    );
  }

  return {
    provider: "facebook",
    identity_token:
      accessToken,
    token_type: "access",
  };
}
