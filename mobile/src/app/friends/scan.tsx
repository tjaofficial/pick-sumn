import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { ArrowLeft, QrCode } from "lucide-react-native";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";

import { sendFriendRequest } from "@/features/friends/friendsService";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

function extractFriendCode(value: string): string {
  const clean = value.trim();
  const match = clean.match(/[?&]code=([^&]+)/i);
  if (match?.[1]) {
    return decodeURIComponent(match[1]).trim().toUpperCase();
  }
  return clean.toUpperCase();
}

export default function ScanFriendScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  async function handleScan(value: string) {
    if (locked) return;
    setLocked(true);

    try {
      await sendFriendRequest({
        friend_code: extractFriendCode(value),
      });
      Alert.alert(
        "Friend request sent",
        "They will appear in your Friends list after they accept.",
        [
          {
            text: "Done",
            onPress: () => router.replace("/friends"),
          },
        ],
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to add friend",
        getApiErrorMessage(
          requestError,
          "That friend code could not be used.",
        ),
        [
          {
            text: "Try Again",
            onPress: () => setLocked(false),
          },
        ],
      );
    }
  }

  if (!permission) {
    return <SafeAreaView style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.permission}>
          <QrCode size={42} color="#F3344A" />
          <Text style={styles.heading}>Camera access needed</Text>
          <Text style={styles.text}>
            Allow camera access to scan a friend’s Pick Sum’N QR code.
          </Text>
          <Pressable
            onPress={() => void requestPermission()}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Allow Camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={
          locked
            ? undefined
            : ({ data }) => void handleScan(data)
        }
      />
      <SafeAreaView style={styles.overlay}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={23} color="#07111F" />
        </Pressable>
        <View style={styles.scanBox} />
        <Text style={styles.scanText}>
          Place your friend’s QR code inside the box
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#07111F" },
  overlay: { flex: 1, alignItems: "center" },
  backButton: { alignSelf: "flex-start", width: 44, height: 44, alignItems: "center", justifyContent: "center", margin: 18, borderRadius: 15, backgroundColor: "#FFFFFF" },
  scanBox: { width: 260, height: 260, marginTop: 100, borderWidth: 3, borderColor: "#F3344A", borderRadius: 28 },
  scanText: { maxWidth: 280, marginTop: 24, fontSize: 15, lineHeight: 22, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26, backgroundColor: "#FFF9F2" },
  heading: { marginTop: 14, fontSize: 24, fontWeight: "900", color: "#07111F" },
  text: { maxWidth: 320, marginTop: 8, fontSize: 14, lineHeight: 21, color: "#69707C", textAlign: "center" },
  primary: { marginTop: 20, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 15, backgroundColor: "#F3344A" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
});
