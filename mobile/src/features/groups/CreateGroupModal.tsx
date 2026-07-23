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
import type { DiningGroup } from "./types";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName("");
      setDescription("");
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Create a group</Text>
              <Text style={styles.subtitle}>
                Build a crew you can quickly Pick Sum’N with again.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={22} color={themeColor("#07111F", "color")} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Group name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Friday Night Crew"
              placeholderTextColor={themeColor("#9298A2", "color")}
              maxLength={120}
              style={styles.input}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="The people who can never decide."
              placeholderTextColor={themeColor("#9298A2", "color")}
              maxLength={255}
              multiline
              style={[styles.input, styles.descriptionInput]}
            />

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Groups stay saved</Text>
              <Text style={styles.noteText}>
                For a one-time meal, select individual friends from the Who’s Eating screen instead.
              </Text>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={() => void handleCreate()}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Creating..." : "Create Group"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = createThemedStyleSheet({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,17,31,0.48)" },
  sheet: { maxHeight: "88%", paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: "#FFF9F2" },
  handle: { width: 46, height: 5, alignSelf: "center", marginBottom: 18, borderRadius: 999, backgroundColor: "#D5D8DD" },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 16, marginBottom: 24 },
  headerCopy: { flex: 1 },
  title: { fontSize: 27, fontWeight: "900", color: "#07111F" },
  subtitle: { marginTop: 5, fontSize: 14, lineHeight: 20, color: "#69707C" },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#FFFFFF" },
  label: { marginBottom: 8, fontSize: 14, fontWeight: "800", color: "#242B35" },
  input: { minHeight: 56, marginBottom: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: "#D9DDE3", borderRadius: 16, backgroundColor: "#FFFFFF", fontSize: 16, color: "#07111F" },
  descriptionInput: { minHeight: 96, paddingTop: 16, textAlignVertical: "top" },
  noteCard: { marginBottom: 18, padding: 15, borderRadius: 17, backgroundColor: "#FFF0F2" },
  noteTitle: { fontSize: 13, fontWeight: "900", color: "#F3344A" },
  noteText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#69707C" },
  error: { marginBottom: 14, color: "#C62828", fontWeight: "700", textAlign: "center" },
  submitButton: { alignItems: "center", paddingVertical: 17, borderRadius: 17, backgroundColor: "#F3344A" },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
});
