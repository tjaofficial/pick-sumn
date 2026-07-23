import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Trash2,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useState,
} from "react";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  deleteAccount,
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


export default function DeleteAccountScreen() {
  useAppTheme();

  const {
    clearAuthenticatedSession,
  } = useAuth();

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  async function performDelete() {
    try {
      setIsDeleting(true);

      await deleteAccount();

      await clearAuthenticatedSession();
    } catch (requestError) {
      Alert.alert(
        "Unable to delete account",
        getApiErrorMessage(
          requestError,
          "Your account could not be deleted.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account permanently?",
      (
        "This action cannot be undone. Your account, profile, "
        + "friendships, and account-owned data will be deleted."
      ),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            void performDelete();
          },
        },
      ],
    );
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
          Delete Account
        </Text>

        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.warningCard}>
          <Trash2
            size={34}
            color={themeColor("#C62828", "color")}
          />

          <Text style={styles.warningTitle}>
            Permanently delete your account
          </Text>

          <Text style={styles.warningText}>
            Your Pick Sum’N account and associated account-owned data
            will be permanently deleted. This cannot be undone.
          </Text>
        </View>

        <Pressable
          onPress={confirmDelete}
          disabled={isDeleting}
          style={[
            styles.deleteButton,
            isDeleting
              && styles.disabled,
          ]}
        >
          {isDeleting ? (
            <ActivityIndicator
              size="small"
              color={themeColor("#FFFFFF", "color")}
            />
          ) : (
            <Trash2
              size={20}
              color={themeColor("#FFFFFF", "color")}
            />
          )}

          <Text style={styles.deleteText}>
            {isDeleting
              ? "Deleting Account..."
              : "Delete My Account"}
          </Text>
        </Pressable>

        <Text style={styles.note}>
          You will be signed out immediately after the account is deleted.
        </Text>
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
  warningCard: {
    alignItems: "center",
    padding: 25,
    borderWidth: 1,
    borderColor: "#F0BABA",
    borderRadius: 22,
    backgroundColor: "#FFF1F1",
  },
  warningTitle: {
    marginTop: 13,
    fontSize: 20,
    fontWeight: "900",
    color: "#9F2424",
    textAlign: "center",
  },
  warningText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#7A3838",
    textAlign: "center",
  },
  deleteButton: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    borderRadius: 17,
    backgroundColor: "#C62828",
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.6,
  },
  note: {
    marginTop: 13,
    fontSize: 12,
    lineHeight: 18,
    color: "#777E89",
    textAlign: "center",
  },
});
