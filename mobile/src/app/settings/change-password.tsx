import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  KeyRound,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useState,
} from "react";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  changePassword,
} from "@/features/settings/settingsService";
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


export default function ChangePasswordScreen() {
  useAppTheme();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  async function handleSave() {
    if (
      !currentPassword
      || !newPassword
      || !confirmPassword
    ) {
      Alert.alert(
        "Missing information",
        "Complete all password fields.",
      );
      return;
    }

    if (
      newPassword
      !== confirmPassword
    ) {
      Alert.alert(
        "Passwords do not match",
        "Enter the same new password twice.",
      );
      return;
    }

    try {
      setIsSaving(true);

      const response =
        await changePassword({
          current_password:
            currentPassword,
          new_password:
            newPassword,
          new_password_confirm:
            confirmPassword,
        });

      Alert.alert(
        "Password changed",
        response.detail,
        [
          {
            text: "Done",
            onPress: () =>
              router.back(),
          },
        ],
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to change password",
        getApiErrorMessage(
          requestError,
          "Your password could not be changed.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

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
          Change Password
        </Text>

        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.hero}>
          <KeyRound
            size={27}
            color={themeColor("#F3344A", "color")}
          />
          <Text style={styles.heroText}>
            Choose a strong password you do not use for another account.
          </Text>
        </View>

        <Text style={styles.label}>
          Current Password
        </Text>
        <TextInput
          value={currentPassword}
          onChangeText={
            setCurrentPassword
          }
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>
          New Password
        </Text>
        <TextInput
          value={newPassword}
          onChangeText={
            setNewPassword
          }
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>
          Confirm New Password
        </Text>
        <TextInput
          value={confirmPassword}
          onChangeText={
            setConfirmPassword
          }
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        <Pressable
          onPress={() =>
            void handleSave()
          }
          disabled={isSaving}
          style={[
            styles.saveButton,
            isSaving
              && styles.disabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color={themeColor("#FFFFFF", "color")}
            />
          ) : (
            <Check
              size={20}
              color={themeColor("#FFFFFF", "color")}
              strokeWidth={3}
            />
          )}

          <Text style={styles.saveText}>
            Save New Password
          </Text>
        </Pressable>
      </View>
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
    justifyContent:
      "space-between",
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
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: "#FFF0F2",
  },
  heroText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#5F6671",
  },
  label: {
    marginTop: 18,
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "900",
    color: "#343B46",
  },
  input: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#07111F",
  },
  saveButton: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 25,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.6,
  },
});
