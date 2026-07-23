import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  useEffect,
  useState,
} from "react";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


type AvatarProps = {
  imageUrl?: string | null;
  name: string;
  size?: number;
  shape?: "circle" | "rounded";
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};


export function Avatar({
  imageUrl,
  name,
  size = 48,
  shape = "circle",
  backgroundColor = "#FFF0F2",
  textColor = "#F3344A",
  borderColor = "transparent",
  borderWidth = 0,
  style,
  imageStyle,
}: AvatarProps) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const borderRadius =
    shape === "circle"
      ? size / 2
      : Math.max(
          12,
          Math.round(size * 0.31),
        );

  const initial =
    name.trim().charAt(0).toUpperCase()
    || "?";

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor,
          borderColor,
          borderWidth,
        },
        style,
      ]}
    >
      {imageUrl && !imageFailed ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width:
                size - borderWidth * 2,
              height:
                size - borderWidth * 2,
              borderRadius: Math.max(
                0,
                borderRadius - borderWidth,
              ),
            },
            imageStyle,
          ]}
          resizeMode="cover"
          onError={() =>
            setImageFailed(true)
          }
        />
      ) : (
        <Text
          style={[
            styles.initial,
            {
              color: textColor,
              fontSize: Math.max(
                16,
                Math.round(size * 0.4),
              ),
            },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}


const styles = createThemedStyleSheet({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    alignSelf: "center",
  },

  initial: {
    fontWeight: "900",
  },
});