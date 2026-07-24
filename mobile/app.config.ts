import type {
  ExpoConfig,
  ConfigContext,
} from "expo/config";


export default ({
  config,
}: ConfigContext): ExpoConfig => {
  const androidMapsKey =
    process.env
      .EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY;

  const googleIosUrlScheme =
    process.env
      .EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

  const facebookAppId =
    process.env
      .EXPO_PUBLIC_FACEBOOK_APP_ID;

  const facebookClientToken =
    process.env
      .EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;

  const plugins:
    NonNullable<ExpoConfig["plugins"]> = [
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          image:
            "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          faceIDPermission:
            (
              "Allow Pick Sum’N to use Face ID "
              + "to securely unlock your saved session."
            ),
        },
      ],
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          photosPermission:
            (
              "Allow Pick Sum’N to access "
              + "your photos so you can add "
              + "profile and group pictures."
            ),
        },
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey:
            androidMapsKey,
        },
      ],
      "expo-image",
      "expo-status-bar",
      "expo-web-browser",
    ];

  if (googleIosUrlScheme) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          googleIosUrlScheme,
      },
    ]);
  }

  if (
    facebookAppId
    && facebookClientToken
  ) {
    plugins.push([
      "react-native-fbsdk-next",
      {
        appID:
          facebookAppId,
        clientToken:
          facebookClientToken,
        displayName:
          "Pick Sum'N",
        scheme:
          `fb${facebookAppId}`,
        advertiserIDCollectionEnabled:
          false,
        autoLogAppEventsEnabled:
          false,
        isAutoInitEnabled:
          true,
        iosUserTrackingPermission:
          false,
      },
    ]);
  }

  return {
    ...config,

    name: "Pick Sum'N",
    slug: "pick-sumn",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "picksumn",
    userInterfaceStyle: "light",

    ios: {
      bundleIdentifier:
        "com.picksumn.app",
      usesAppleSignIn: true,
      icon: "./assets/expo.icon",
      infoPlist: {
        ITSAppUsesNonExemptEncryption:
          false,
      },
    },

    android: {
      package: "com.picksumn.app",
      versionCode: 2,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
      ],
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage:
          "./assets/images/android-icon-foreground.png",
        backgroundImage:
          "./assets/images/android-icon-background.png",
        monochromeImage:
          "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled:
        false,
    },

    web: {
      output: "static",
      favicon:
        "./assets/images/favicon.png",
    },

    plugins,

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      router: {},
      eas: {
        projectId:
          "3fbb8719-d9e1-466e-bbc1-5c37b4275115",
      },
    },
  };
};
