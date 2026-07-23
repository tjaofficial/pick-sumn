import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_USER_KEY = "picksumn_biometric_user_id";

export type BiometricCapability = {
  available: boolean;
  enrolled: boolean;
  label: string;
};

function getAuthenticationLabel(
  authenticationTypes: LocalAuthentication.AuthenticationType[],
): string {
  const hasFace = authenticationTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );

  const hasFingerprint = authenticationTypes.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );

  if (Platform.OS === "ios" && hasFace) {
    return "Face ID";
  }

  if (Platform.OS === "ios" && hasFingerprint) {
    return "Touch ID";
  }

  if (hasFace && hasFingerprint) {
    return "Biometrics";
  }

  if (hasFace) {
    return "Face Recognition";
  }

  if (hasFingerprint) {
    return "Fingerprint";
  }

  return "Device Authentication";
}

export async function getBiometricCapability(): Promise<
  BiometricCapability
> {
  if (Platform.OS === "web") {
    return {
      available: false,
      enrolled: false,
      label: "Device Authentication",
    };
  }

  const [
    hasHardware,
    isEnrolled,
    authenticationTypes,
  ] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  return {
    available: hasHardware && isEnrolled,
    enrolled: isEnrolled,
    label: getAuthenticationLabel(
      authenticationTypes,
    ),
  };
}

export async function authenticateWithDevice(
  label: string,
): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const result =
    await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock Pick Sum’N with ${label}`,
      promptSubtitle: "Confirm it’s you to continue.",
      fallbackLabel: "Use Passcode",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      biometricsSecurityLevel: "strong",
    });

  return result.success;
}

export async function getBiometricUserId(): Promise<
  number | null
> {
  if (Platform.OS === "web") {
    return null;
  }

  const stored =
    await SecureStore.getItemAsync(
      BIOMETRIC_USER_KEY,
    );

  if (!stored) {
    return null;
  }

  const parsed = Number(stored);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export async function enableBiometricUnlock(
  userId: number,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await SecureStore.setItemAsync(
    BIOMETRIC_USER_KEY,
    String(userId),
  );
}

export async function disableBiometricUnlock(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await SecureStore.deleteItemAsync(
    BIOMETRIC_USER_KEY,
  );
}
