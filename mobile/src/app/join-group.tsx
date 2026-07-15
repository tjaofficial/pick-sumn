import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Hash,
  ScanLine,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useMemo,
  useState,
} from "react";

import {
  joinGroup,
} from "@/features/groups/groupsService";
import type {
  DiningGroupDetail,
} from "@/features/groups/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


export default function JoinGroupScreen() {
  const params =
    useLocalSearchParams<{
      code?: string | string[];
    }>();

  const joinCode = useMemo(() => {
    const rawCode =
      Array.isArray(params.code)
        ? params.code[0]
        : params.code;

    return (
      rawCode
        ?.trim()
        .toUpperCase()
      ?? ""
    );
  }, [params.code]);

  const [
    joinedGroup,
    setJoinedGroup,
  ] = useState<DiningGroupDetail | null>(
    null,
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

  async function handleJoin() {
    if (!joinCode) {
      setError(
        "This QR code does not contain a valid group join code.",
      );

      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const group =
        await joinGroup({
          join_code: joinCode,
        });

      setJoinedGroup(group);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to join this group.",
        ),
      );
    } finally {
      setIsJoining(false);
    }
  }

  function openJoinedGroup() {
    if (!joinedGroup) {
      return;
    }

    router.replace({
      pathname: "/groups/[id]",
      params: {
        id: joinedGroup.id,
      },
    });
  }

  function goToGroups() {
    router.replace(
      "/(tabs)/groups",
    );
  }

  if (joinedGroup) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />

          <Text style={styles.topBarTitle}>
            Group Joined
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.centerContent}>
          <View style={styles.successIcon}>
            <CheckCircle2
              size={50}
              color="#168B4F"
              strokeWidth={2.2}
            />
          </View>

          <Text style={styles.successEyebrow}>
            YOU’RE IN
          </Text>

          <Text style={styles.successTitle}>
            {joinedGroup.name}
          </Text>

          <Text style={styles.successText}>
            You successfully joined this Pick Sum’N
            group.
          </Text>

          <View style={styles.memberBadge}>
            <Users
              size={17}
              color="#69707C"
            />

            <Text style={styles.memberBadgeText}>
              {joinedGroup.member_count}{" "}
              {joinedGroup.member_count === 1
                ? "member"
                : "members"}
            </Text>
          </View>

          <Pressable
            onPress={openJoinedGroup}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed
                && styles.pressed,
            ]}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Open Group
            </Text>
          </Pressable>

          <Pressable
            onPress={goToGroups}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed
                && styles.pressed,
            ]}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              View All Groups
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Go back"
        >
          <ArrowLeft
            size={24}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Join Group
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.centerContent}>
        <View style={styles.scanIcon}>
          <ScanLine
            size={48}
            color="#F3344A"
            strokeWidth={2}
          />
        </View>

        <Text style={styles.eyebrow}>
          QR CODE SCANNED
        </Text>

        <Text style={styles.title}>
          Join this group?
        </Text>

        <Text style={styles.subtitle}>
          Confirm the join code below to become part of
          this Pick Sum’N group.
        </Text>

        <View style={styles.codeCard}>
          <View style={styles.codeIcon}>
            <Hash
              size={25}
              color="#F3344A"
            />
          </View>

          <Text style={styles.codeLabel}>
            GROUP JOIN CODE
          </Text>

          <Text style={styles.code}>
            {joinCode || "INVALID"}
          </Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          disabled={
            isJoining || !joinCode
          }
          onPress={() =>
            void handleJoin()
          }
          style={({ pressed }) => [
            styles.primaryButton,

            (isJoining || !joinCode)
              && styles.disabledButton,

            pressed
              && !isJoining
              && joinCode
              && styles.pressed,
          ]}
        >
          {isJoining ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Users
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Join Group
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          disabled={isJoining}
          onPress={goToGroups}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed
              && !isJoining
              && styles.pressed,
          ]}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Cancel
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Joining will add this group to your Groups
          tab.
        </Text>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  topBar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  topBarSpacer: {
    width: 42,
  },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 45,
  },

  scanIcon: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: "#FFF0F2",
  },

  eyebrow: {
    marginTop: 22,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#F3344A",
  },

  title: {
    marginTop: 7,
    fontSize: 29,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 330,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  codeCard: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    marginTop: 26,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },

  codeIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#FFF0F2",
  },

  codeLabel: {
    marginTop: 13,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#69707C",
  },

  code: {
    marginTop: 8,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 6,
    color: "#07111F",
    textAlign: "center",
  },

  errorCard: {
    width: "100%",
    maxWidth: 390,
    marginTop: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 15,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: "#9F2424",
    textAlign: "center",
  },

  primaryButton: {
    width: "100%",
    maxWidth: 390,
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 19,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.5,
  },

  secondaryButton: {
    width: "100%",
    maxWidth: 390,
    minHeight: 51,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#F3344A",
  },

  note: {
    maxWidth: 320,
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    color: "#777E89",
    textAlign: "center",
  },

  successIcon: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: "#E8F7EF",
  },

  successEyebrow: {
    marginTop: 23,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#168B4F",
  },

  successTitle: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  successText: {
    maxWidth: 320,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 17,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F1F2F4",
  },

  memberBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#69707C",
  },

  pressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },
});