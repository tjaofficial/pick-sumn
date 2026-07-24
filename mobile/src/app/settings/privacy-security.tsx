import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Fingerprint,
  KeyRound,
  MapPin,
  ScanFace,
  ShieldBan,
  UserRoundCheck,
  UsersRound,
  CircleCheck,
  CircleMinus,
  LogIn,
} from "lucide-react-native";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  useCallback,
  useState,
} from "react";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";
import { getSignInMethods } from "@/features/auth/authService";
import type { SignInMethods } from "@/features/auth/types";

type RowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowIcon}>
        {icon}
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>
          {title}
        </Text>

        <Text style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>

      <ChevronRight
        size={21}
        color={themeColor("#9298A2", "color")}
      />
    </Pressable>
  );
}

type SignInMethodRowProps = {
  title: string;
  connected: boolean | undefined;
};

function SignInMethodRow({
  title,
  connected,
}: SignInMethodRowProps) {
  const isConnected =
    connected === true;

  return (
    <View style={styles.methodRow}>
      <View style={styles.rowIcon}>
        <LogIn
          size={21}
          color={themeColor("#F3344A", "color")}
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>
          {title}
        </Text>

        <Text style={styles.rowSubtitle}>
          {connected === undefined
            ? "Checking..."
            : isConnected
              ? "Connected"
              : "Not connected"}
        </Text>
      </View>

      {connected === undefined ? null : (
        isConnected ? (
          <CircleCheck
            size={22}
            color={themeColor("#2E9D57", "color")}
          />
        ) : (
          <CircleMinus
            size={22}
            color={themeColor("#9298A2", "color")}
          />
        )
      )}
    </View>
  );
}

export default function PrivacySecurityScreen() {
  useAppTheme();

  const {
    biometricAvailable,
    biometricEnabled,
    biometricLabel,
    refreshBiometricStatus,
    setBiometricEnabled,
  } = useAuth();

  const [
    isUpdatingBiometrics,
    setIsUpdatingBiometrics,
  ] = useState(false);

  const [
    signInMethods,
    setSignInMethods,
  ] = useState<SignInMethods | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      void refreshBiometricStatus();

      void getSignInMethods()
        .then(
          setSignInMethods,
        )
        .catch(() => {
          setSignInMethods(null);
        });
    }, [
      refreshBiometricStatus,
    ]),
  );

  async function toggleBiometricUnlock(
    enabled: boolean,
  ) {
    if (isUpdatingBiometrics) {
      return;
    }

    try {
      setIsUpdatingBiometrics(
        true,
      );

      const updated =
        await setBiometricEnabled(
          enabled,
        );

      if (
        enabled
        && !updated
      ) {
        Alert.alert(
          `${biometricLabel} unavailable`,
          (
            "Set up Face ID, Touch ID, or a supported "
            + "fingerprint on this phone first, then try again."
          ),
        );
      }
    } finally {
      setIsUpdatingBiometrics(
        false,
      );
    }
  }

  const biometricSubtitle =
    biometricAvailable
      ? (
          `Use ${biometricLabel} to unlock Pick Sum’N `
          + "when you already have a saved session"
        )
      : (
          "Set up Face ID, Touch ID, or fingerprint "
          + "in your phone settings to use quick unlock"
        );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topTitle}>
          Privacy & Security
        </Text>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>
          SIGN-IN SECURITY
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              {biometricLabel === "Face ID" ? (
                <ScanFace
                  size={22}
                  color={themeColor("#F3344A", "color")}
                />
              ) : (
                <Fingerprint
                  size={22}
                  color={themeColor("#F3344A", "color")}
                />
              )}
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>
                {biometricLabel}
              </Text>

              <Text style={styles.rowSubtitle}>
                {biometricSubtitle}
              </Text>
            </View>

            <Switch
              value={biometricEnabled}
              onValueChange={
                (enabled) =>
                  void toggleBiometricUnlock(
                    enabled,
                  )
              }
              disabled={
                isUpdatingBiometrics
                || (
                  !biometricAvailable
                  && !biometricEnabled
                )
              }
              trackColor={{
                false: themeColor(
                  "#D7DBE1",
                  "backgroundColor",
                ),
                true: themeColor(
                  "#F7A4AE",
                  "backgroundColor",
                ),
              }}
              thumbColor={
                biometricEnabled
                  ? themeColor(
                      "#F3344A",
                      "backgroundColor",
                    )
                  : themeColor(
                      "#FFFFFF",
                      "backgroundColor",
                    )
              }
            />
          </View>

          <View style={styles.divider} />

          <Row
            icon={
              <KeyRound
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Change Password"
            subtitle="Update the password used to sign in"
            onPress={() =>
              router.push(
                "/settings/change-password",
              )
            }
          />
        </View>

        <Text style={styles.sectionLabel}>
          CONNECTED SIGN-IN METHODS
        </Text>

        <View style={styles.card}>
          <SignInMethodRow
            title="Password"
            connected={signInMethods?.password}
          />

          <View style={styles.divider} />

          <SignInMethodRow
            title="Apple"
            connected={signInMethods?.apple}
          />

          <View style={styles.divider} />

          <SignInMethodRow
            title="Google"
            connected={signInMethods?.google}
          />

          <View style={styles.divider} />

          <SignInMethodRow
            title="Facebook"
            connected={signInMethods?.facebook}
          />
        </View>

        <Text style={styles.sectionLabel}>
          PRIVACY
        </Text>

        <View style={styles.card}>
          <Row
            icon={
              <ShieldBan
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Blocked Users"
            subtitle="View and manage people you have blocked"
            onPress={() =>
              router.push(
                "/settings/blocked-users",
              )
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <UserRoundCheck
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Friend Request Privacy"
            subtitle="Control who can send you friend requests"
            onPress={() =>
              router.push({
                pathname:
                  "/settings/privacy-options",
                params: {
                  type: "friend_requests",
                },
              })
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <UsersRound
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Group Invite Privacy"
            subtitle="Control who can invite you to groups"
            onPress={() =>
              router.push({
                pathname:
                  "/settings/privacy-options",
                params: {
                  type: "group_invites",
                },
              })
            }
          />

          <View style={styles.divider} />

          <Row
            icon={
              <MapPin
                size={21}
                color={themeColor("#F3344A", "color")}
              />
            }
            title="Location Privacy"
            subtitle="Learn how Pick Sum’N uses session locations"
            onPress={() =>
              router.push(
                "/settings/location-privacy",
              )
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },
  spacer: {
    width: 42,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#F3344A",
  },
  card: {
    overflow: "hidden",
    marginBottom: 17,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  rowPressed: {
    backgroundColor: "#F8F8F9",
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  rowIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#07111F",
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#737A85",
  },
  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: "#ECEDEF",
  },
});
