import { Hash, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/services/getApiErrorMessage";

import { joinGroup } from "./groupsService";
import type { DiningGroupDetail } from "./types";

type JoinGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onJoined: (group: DiningGroupDetail) => void;
};

export function JoinGroupModal({
  visible,
  onClose,
  onJoined,
}: JoinGroupModalProps) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setJoinCode("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  async function handleJoin() {
    const normalizedCode = joinCode
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      setError("Enter the group join code.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const group = await joinGroup({
        join_code: normalizedCode,
      });

      onJoined(group);
      onClose();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to join this group.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={styles.card}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close join group"
          >
            <X
              size={21}
              color="#07111F"
            />
          </Pressable>

          <View style={styles.iconContainer}>
            <Hash
              size={31}
              color="#F3344A"
              strokeWidth={2.5}
            />
          </View>

          <Text style={styles.title}>
            Join a group
          </Text>

          <Text style={styles.subtitle}>
            Enter the seven-character code shared by the
            group owner.
          </Text>

          <TextInput
            value={joinCode}
            onChangeText={(value) =>
              setJoinCode(value.toUpperCase())
            }
            placeholder="BURGER7"
            placeholderTextColor="#A4A9B2"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            style={styles.input}
          />

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          <Pressable
            onPress={handleJoin}
            disabled={isSubmitting}
            style={[
              styles.button,
              isSubmitting && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {isSubmitting
                ? "Joining..."
                : "Join Group"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(7, 17, 31, 0.58)",
  },

  card: {
    width: "100%",
    maxWidth: 430,
    padding: 25,
    borderRadius: 28,
    backgroundColor: "#FFF9F2",
  },

  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  iconContainer: {
    width: 64,
    height: 64,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#FFF0F2",
  },

  title: {
    marginTop: 17,
    fontSize: 27,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  input: {
    height: 62,
    marginTop: 24,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: "#D9DDE3",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 5,
    color: "#07111F",
    textAlign: "center",
  },

  error: {
    marginTop: 12,
    color: "#C62828",
    fontWeight: "700",
    textAlign: "center",
  },

  button: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 17,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
});