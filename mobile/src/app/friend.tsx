import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  Check,
  UserPlus,
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
  useEffect,
  useState,
} from "react";

import {
  sendFriendRequest,
} from "@/features/friends/friendsService";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


export default function FriendLinkScreen() {
  const params =
    useLocalSearchParams<{
      code?: string | string[];
    }>();

  const code = Array.isArray(
    params.code,
  )
    ? params.code[0]
    : params.code;

  const [status, setStatus] =
    useState<
      "loading"
      | "success"
      | "error"
    >("loading");

  const [message, setMessage] =
    useState(
      "Sending friend request...",
    );


  useEffect(() => {
    async function addFriend() {
      if (!code) {
        setStatus("error");
        setMessage(
          "This friend link is missing its friend code.",
        );
        return;
      }

      try {
        const result =
          await sendFriendRequest({
            friend_code:
              code.trim().toUpperCase(),
          });

        setStatus("success");
        setMessage(result.detail);
      } catch (requestError) {
        setStatus("error");
        setMessage(
          getApiErrorMessage(
            requestError,
            "This friend request could not be sent.",
          ),
        );
      }
    }

    void addFriend();
  }, [code]);


  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View style={styles.card}>
        {status === "loading" ? (
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />
        ) : status === "success" ? (
          <Check
            size={46}
            color="#168B4F"
          />
        ) : (
          <UserPlus
            size={46}
            color="#F3344A"
          />
        )}

        <Text style={styles.title}>
          {status === "loading"
            ? "Adding Friend"
            : status === "success"
              ? "Friend Request Updated"
              : "Unable to Add Friend"}
        </Text>

        <Text style={styles.message}>
          {message}
        </Text>

        {status !== "loading" && (
          <Pressable
            onPress={() =>
              router.replace(
                "/friends",
              )
            }
            style={styles.button}
          >
            <Text
              style={styles.buttonText}
            >
              Open Your Friends
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFF9F2",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  title: {
    marginTop: 16,
    fontSize: 23,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },
  button: {
    width: "100%",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },
  buttonText: {
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
