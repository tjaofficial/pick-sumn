import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
} from "lucide-react-native";

import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  uploadGroupImage,
} from "@/features/groups/groupsService";
import {
  uploadProfileAvatar,
} from "@/features/profile/profileService";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";


export default function PhotoCropPreviewScreen() {
  const {
    refreshUser,
  } = useAuth();

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const params = useLocalSearchParams<{
    croppedUri?: string | string[];
    targetType?: string | string[];
    groupId?: string | string[];
  }>();

  const croppedUri =
    Array.isArray(params.croppedUri)
      ? params.croppedUri[0]
      : params.croppedUri;

  const targetType =
    Array.isArray(params.targetType)
      ? params.targetType[0]
      : params.targetType;

  const groupId =
    Array.isArray(params.groupId)
      ? params.groupId[0]
      : params.groupId;

  async function uploadPhoto() {
    if (!croppedUri) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (
        targetType === "group"
        && groupId
      ) {
        await uploadGroupImage(
          groupId,
          {
            uri: croppedUri,
            name: "group-photo.jpg",
            type: "image/jpeg",
          },
        );

        router.replace({
          pathname: "/groups/[id]",
          params: {
            id: groupId,
          },
        });

        return;
      }

      await uploadProfileAvatar({
        uri: croppedUri,
        name: "profile-photo.jpg",
        type: "image/jpeg",
      });

      await refreshUser();

      router.replace(
        "/(tabs)/profile",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to upload your photo.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }


  if (!croppedUri) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.center}>
          <Text style={styles.title}>
            Preview unavailable
          </Text>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={styles.secondaryButton}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Go Back
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
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Photo Preview
        </Text>

        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: croppedUri }}
          style={styles.preview}
        />

        <Text style={styles.title}>
          Looks good in a circle
        </Text>

        <Text style={styles.description}>
          This is how the picture will appear
          around Pick Sum’N.
        </Text>

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        <Pressable
          onPress={() =>
            void uploadPhoto()
          }
          disabled={isSaving}
          style={[
            styles.primaryButton,
            isSaving
              && styles.disabledButton,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Check
              size={21}
              color="#FFFFFF"
              strokeWidth={3}
            />
          )}

          <Text
            style={
              styles.primaryButtonText
            }
          >
            {isSaving
              ? "Uploading..."
              : targetType === "group"
                ? "Save Group Photo"
                : "Save Profile Photo"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.secondaryButton}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Adjust Crop
          </Text>
        </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  topBarButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  spacer: {
    width: 42,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  preview: {
    width: 220,
    height: 220,
    borderWidth: 5,
    borderColor: "#FFD158",
    borderRadius: 110,
  },

  title: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  description: {
    maxWidth: 320,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },

  primaryButton: {
    width: "100%",
    maxWidth: 360,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorText: {
    marginTop: 14,
    color: "#C62828",
    fontWeight: "700",
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#69707C",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
