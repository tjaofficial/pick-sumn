import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiErrorMessage } from "@/services/getApiErrorMessage";

import { createGroup } from "./groupsService";
import type {
  DiningGroup,
  GroupType,
} from "./types";

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (group: DiningGroup) => void;
};

export function CreateGroupModal({
  visible,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] =
    useState<GroupType>("permanent");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName("");
      setDescription("");
      setGroupType("permanent");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  async function handleCreate() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a name for the group.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const group = await createGroup({
        name: trimmedName,
        description: description.trim(),
        group_type: groupType,
      });

      onCreated(group);
      onClose();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to create the group.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
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

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Create a group
              </Text>

              <Text style={styles.subtitle}>
                Build your regular crew or a temporary
                dinner group.
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close create group"
            >
              <X
                size={22}
                color="#07111F"
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Group name</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Friday Night Crew"
              placeholderTextColor="#9298A2"
              maxLength={120}
              style={styles.input}
            />

            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="The people who can never decide."
              placeholderTextColor="#9298A2"
              maxLength={255}
              multiline
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
            />

            <Text style={styles.label}>Group type</Text>

            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setGroupType("permanent")}
                style={[
                  styles.typeButton,
                  groupType === "permanent" &&
                    styles.typeButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.typeTitle,
                    groupType === "permanent" &&
                      styles.typeTextSelected,
                  ]}
                >
                  Permanent
                </Text>

                <Text
                  style={[
                    styles.typeDescription,
                    groupType === "permanent" &&
                      styles.typeTextSelected,
                  ]}
                >
                  Partner, friends, or family
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setGroupType("temporary")}
                style={[
                  styles.typeButton,
                  groupType === "temporary" &&
                    styles.typeButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.typeTitle,
                    groupType === "temporary" &&
                      styles.typeTextSelected,
                  ]}
                >
                  Temporary
                </Text>

                <Text
                  style={[
                    styles.typeDescription,
                    groupType === "temporary" &&
                      styles.typeTextSelected,
                  ]}
                >
                  People eating together today
                </Text>
              </Pressable>
            </View>

            {error && (
              <Text style={styles.error}>{error}</Text>
            )}

            <Pressable
              onPress={handleCreate}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting &&
                  styles.submitButtonDisabled,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting
                  ? "Creating..."
                  : "Create Group"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(7, 17, 31, 0.48)",
  },

  sheet: {
    maxHeight: "88%",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#FFF9F2",
  },

  handle: {
    width: 46,
    height: 5,
    alignSelf: "center",
    marginBottom: 18,
    borderRadius: 999,
    backgroundColor: "#D5D8DD",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
    color: "#07111F",
  },

  subtitle: {
    maxWidth: 300,
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#69707C",
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#242B35",
  },

  input: {
    minHeight: 56,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#07111F",
  },

  descriptionInput: {
    minHeight: 96,
    paddingTop: 16,
    textAlignVertical: "top",
  },

  typeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },

  typeButton: {
    flex: 1,
    minHeight: 105,
    justifyContent: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  typeButtonSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },

  typeTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },

  typeDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: "#69707C",
  },

  typeTextSelected: {
    color: "#FFFFFF",
  },

  error: {
    marginBottom: 14,
    color: "#C62828",
    fontWeight: "700",
    textAlign: "center",
  },

  submitButton: {
    alignItems: "center",
    paddingVertical: 17,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
});