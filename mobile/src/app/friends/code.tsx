import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { ArrowLeft, Check, Copy, Share2 } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import { getMyFriendCode } from "@/features/friends/friendsService";
import type { FriendUser } from "@/features/friends/types";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function FriendCodeScreen() {
  useAppTheme();

  const [user, setUser] = useState<FriendUser | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getMyFriendCode().then(setUser);
  }, []);

  if (!user) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color={themeColor("#F3344A", "color")} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  const friendCode = user.friend_code || "";

  const link = `picksumn://friend?code=${encodeURIComponent(friendCode)}`;

  async function copyCode() {
    await Clipboard.setStringAsync(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareCode() {
    await Share.share({
      message:
        "Add me as a friend on Pick Sum’N.\n\n" +
        `${link}\n\nFriend code: ${friendCode}`,
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={23} color={themeColor("#07111F", "color")} />
        </Pressable>
        <Text style={styles.title}>My Friend Code</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Let friends find you</Text>
        <Text style={styles.subtitle}>
          Have a friend scan this QR code, or share your friend code directly.
        </Text>

        <View style={styles.qrCard}>
          <QRCode
            value={link}
            size={220}
            color={themeColor("#07111F", "color")}
            backgroundColor="#FFFFFF"
          />
        </View>

        <Text style={styles.code}>{friendCode}</Text>

        <View style={styles.actions}>
          <Pressable onPress={() => void copyCode()} style={styles.primary}>
            {copied ? (
              <Check size={19} color={themeColor("#FFFFFF", "color")} />
            ) : (
              <Copy size={19} color={themeColor("#FFFFFF", "color")} />
            )}
            <Text style={styles.primaryText}>{copied ? "Copied" : "Copy Code"}</Text>
          </Pressable>

          <Pressable onPress={() => void shareCode()} style={styles.secondary}>
            <Share2 size={19} color={themeColor("#F3344A", "color")} />
            <Text style={styles.secondaryText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  title: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  content: { flex: 1, alignItems: "center", padding: 24 },
  heading: { marginTop: 22, fontSize: 28, fontWeight: "900", color: "#07111F" },
  subtitle: { maxWidth: 330, marginTop: 8, fontSize: 14, lineHeight: 21, color: "#69707C", textAlign: "center" },
  qrCard: { marginTop: 28, padding: 20, borderRadius: 24, backgroundColor: "#FFFFFF" },
  code: { marginTop: 22, fontSize: 28, fontWeight: "900", letterSpacing: 5, color: "#07111F" },
  actions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 24 },
  primary: { flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 16, backgroundColor: "#F3344A" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  secondary: { flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1.5, borderColor: "#F3344A", borderRadius: 16, backgroundColor: "#FFFFFF" },
  secondaryText: { color: "#F3344A", fontWeight: "900" },
});
