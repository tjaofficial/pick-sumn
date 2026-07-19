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

      icon: "./assets/expo.icon",
      infoPlist: {
        "ITSAppUsesNonExemptEncryption": false
      }
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

    plugins: [
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
    ],

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