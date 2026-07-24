import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowRight,
  LogIn,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  joinGroup,
} from "@/features/groups/groupsService";
import {
  clearPendingGroupJoinCode,
  savePendingGroupJoinCode,
} from "@/features/groups/pendingGroupInvite";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


export default function JoinGroupLinkScreen() {
  useAppTheme();

  const {
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const params =
    useLocalSearchParams<{
      code?: string | string[];
    }>();

  const joinCode = useMemo(
    () => {
      const value =
        Array.isArray(params.code)
          ? params.code[0]
          : params.code;

      return String(
        value ?? "",
      )
        .trim()
        .toUpperCase();
    },
    [
      params.code,
    ],
  );

  const [
    isJoining,
    setIsJoining,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  useEffect(() => {
    if (!joinCode) {
      return;
    }

    void savePendingGroupJoinCode(
      joinCode,
    );
  }, [
    joinCode,
  ]);


  useEffect(() => {
    if (
      authLoading
      || !isAuthenticated
      || !joinCode
      || isJoining
    ) {
      return;
    }

    async function join() {
      try {
        setIsJoining(true);
        setError(null);

        const group =
          await joinGroup({
            join_code:
              joinCode,
          });

        await clearPendingGroupJoinCode();

        router.replace({
          pathname:
            "/groups/[id]",
          params: {
            id: group.id,
          },
        });
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            (
              "This group invite could "
              + "not be opened."
            ),
          ),
        );
      } finally {
        setIsJoining(false);
      }
    }

    void join();
  }, [
    authLoading,
    isAuthenticated,
    isJoining,
    joinCode,
  ]);


  if (
    authLoading
    || (
      isAuthenticated
      && isJoining
    )
  ) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            size="large"
            color={themeColor(
              "#F3344A",
              "color",
            )}
          />

          <Text style={styles.stateTitle}>
            Opening group invite...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  if (!joinCode) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            Invalid group invite
          </Text>

          <Text style={styles.body}>
            This link does not contain
            a valid Pick Sum’N join code.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Users
              size={34}
              color={themeColor(
                "#F3344A",
                "color",
              )}
            />
          </View>

          <Text style={styles.title}>
            You’ve got a group invite
          </Text>

          <Text style={styles.body}>
            Sign in or create your
            Pick Sum’N account. We’ll keep
            this invite ready for you.
          </Text>

          <Text style={styles.code}>
            {joinCode}
          </Text>

          <Pressable
            onPress={() =>
              router.push(
                "/(auth)/login",
              )
            }
            style={styles.primary}
          >
            <LogIn
              size={19}
              color={themeColor(
                "#FFFFFF",
                "color",
              )}
            />

            <Text
              style={styles.primaryText}
            >
              Sign In
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                "/(auth)/register",
              )
            }
            style={styles.secondary}
          >
            <Text
              style={styles.secondaryText}
            >
              Create Account
            </Text>

            <ArrowRight
              size={18}
              color={themeColor(
                "#F3344A",
                "color",
              )}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          Unable to join
        </Text>

        <Text style={styles.body}>
          {error
            ?? (
              "The group invite "
              + "could not be opened."
            )}
        </Text>
      </View>
    </SafeAreaView>
  );
}


const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "#FFF9F2",
  },
  centerState: {
    alignItems: "center",
    gap: 12,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#07111F",
  },
  card: {
    alignItems: "center",
    padding: 26,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
  },
  iconWrap: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 37,
    backgroundColor: "#FFF0F2",
  },
  title: {
    marginTop: 16,
    fontSize: 27,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#606773",
    textAlign: "center",
  },
  code: {
    marginTop: 18,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#F3344A",
  },
  primary: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  secondary: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#F3344A",
  },
});
