import {
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  router,
} from "expo-router";


export type PhotoCropTarget =
  | {
      type: "profile";
    }
  | {
      type: "group";
      groupId: string;
    };


export async function choosePhotoForCrop(
  target: PhotoCropTarget,
): Promise<void> {
  const permission =
    await ImagePicker
      .requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Photo permission needed",
      (
        "Allow Pick Sum’N to access your "
        + "photos so you can choose a picture."
      ),
    );

    return;
  }

  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      exif: false,
    });

  if (result.canceled) {
    return;
  }

  try {
    const asset = result.assets[0];

    /*
     * Normalize the selected image first.
     *
     * iPhone photos can contain EXIF orientation metadata. ImagePicker may
     * report the display-oriented width and height while ImageManipulator
     * reads the underlying pixel orientation. Cropping with those mismatched
     * dimensions causes the native crop operation to fail.
     */
    const normalized =
      await ImageManipulator.manipulateAsync(
        asset.uri,
        [],
        {
          compress: 1,
          format:
            ImageManipulator
              .SaveFormat.JPEG,
        },
      );

    router.push({
      pathname: "/photo-crop",
      params: {
        uri: normalized.uri,
        width: String(normalized.width),
        height: String(normalized.height),
        targetType: target.type,
        groupId:
          target.type === "group"
            ? target.groupId
            : "",
      },
    });
  } catch {
    Alert.alert(
      "Unable to open photo",
      (
        "Pick Sum’N could not prepare this "
        + "image. Try choosing another photo."
      ),
    );
  }
}
