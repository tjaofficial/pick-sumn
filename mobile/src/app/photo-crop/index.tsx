import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  RotateCcw,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  useMemo,
  useState,
} from "react";
import * as ImageManipulator from "expo-image-manipulator";


const SCREEN_WIDTH =
  Dimensions.get("window").width;

const CROP_SIZE =
  Math.min(
    SCREEN_WIDTH - 48,
    340,
  );


function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  "worklet";

  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}


export default function PhotoCropScreen() {
  const params = useLocalSearchParams<{
    uri?: string | string[];
    width?: string | string[];
    height?: string | string[];
    targetType?: string | string[];
    groupId?: string | string[];
  }>();

  const uri = Array.isArray(params.uri)
    ? params.uri[0]
    : params.uri;

  const sourceWidth = Number(
    Array.isArray(params.width)
      ? params.width[0]
      : params.width,
  );

  const sourceHeight = Number(
    Array.isArray(params.height)
      ? params.height[0]
      : params.height,
  );

  const targetType =
    Array.isArray(params.targetType)
      ? params.targetType[0]
      : params.targetType;

  const groupId =
    Array.isArray(params.groupId)
      ? params.groupId[0]
      : params.groupId;

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

  const baseScale = useMemo(() => {
    if (
      !sourceWidth
      || !sourceHeight
    ) {
      return 1;
    }

    return Math.max(
      CROP_SIZE / sourceWidth,
      CROP_SIZE / sourceHeight,
    );
  }, [
    sourceHeight,
    sourceWidth,
  ]);

  const scale =
    useSharedValue(1);

  const savedScale =
    useSharedValue(1);

  const translateX =
    useSharedValue(0);

  const translateY =
    useSharedValue(0);

  const savedTranslateX =
    useSharedValue(0);

  const savedTranslateY =
    useSharedValue(0);


  function getBounds(
    currentScale: number,
  ) {
    "worklet";

    const renderedWidth =
      sourceWidth
      * baseScale
      * currentScale;

    const renderedHeight =
      sourceHeight
      * baseScale
      * currentScale;

    return {
      maxX: Math.max(
        0,
        (
          renderedWidth
          - CROP_SIZE
        ) / 2,
      ),

      maxY: Math.max(
        0,
        (
          renderedHeight
          - CROP_SIZE
        ) / 2,
      ),
    };
  }


  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const bounds =
        getBounds(scale.value);

      translateX.value = clamp(
        savedTranslateX.value
        + event.translationX,
        -bounds.maxX,
        bounds.maxX,
      );

      translateY.value = clamp(
        savedTranslateY.value
        + event.translationY,
        -bounds.maxY,
        bounds.maxY,
      );
    })
    .onEnd(() => {
      savedTranslateX.value =
        translateX.value;

      savedTranslateY.value =
        translateY.value;
    });


  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = clamp(
        savedScale.value
        * event.scale,
        1,
        5,
      );

      scale.value = nextScale;

      const bounds =
        getBounds(nextScale);

      translateX.value = clamp(
        translateX.value,
        -bounds.maxX,
        bounds.maxX,
      );

      translateY.value = clamp(
        translateY.value,
        -bounds.maxY,
        bounds.maxY,
      );
    })
    .onEnd(() => {
      savedScale.value =
        scale.value;

      savedTranslateX.value =
        translateX.value;

      savedTranslateY.value =
        translateY.value;
    });


  const composedGesture =
    Gesture.Simultaneous(
      panGesture,
      pinchGesture,
    );


  const animatedImageStyle =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX:
            translateX.value,
        },
        {
          translateY:
            translateY.value,
        },
        {
          scale: scale.value,
        },
      ],
    }));


  function resetCrop() {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }


  async function saveCrop() {
    if (
      !uri
      || !sourceWidth
      || !sourceHeight
    ) {
      setError(
        "The selected image is missing.",
      );

      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const currentScale =
        scale.value;

      const currentTranslateX =
        translateX.value;

      const currentTranslateY =
        translateY.value;

      const renderedScale =
        baseScale
        * currentScale;

      const cropSize =
        CROP_SIZE
        / renderedScale;

      const visibleLeft =
        (
          sourceWidth
          * renderedScale
          - CROP_SIZE
        ) / 2
        - currentTranslateX;

      const visibleTop =
        (
          sourceHeight
          * renderedScale
          - CROP_SIZE
        ) / 2
        - currentTranslateY;

      const originX = clamp(
        visibleLeft
        / renderedScale,
        0,
        Math.max(
          0,
          sourceWidth - cropSize,
        ),
      );

      const originY = clamp(
        visibleTop
        / renderedScale,
        0,
        Math.max(
          0,
          sourceHeight - cropSize,
        ),
      );

      const safeCropSize = Math.max(
  1,
  Math.min(
    Math.floor(cropSize),
    sourceWidth - Math.floor(originX),
    sourceHeight - Math.floor(originY),
  ),
);

const result =
  await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.max(
            0,
            Math.floor(originX),
          ),
          originY: Math.max(
            0,
            Math.floor(originY),
          ),
          width: safeCropSize,
          height: safeCropSize,
        },
      },
      {
        resize: {
          width: 768,
          height: 768,
        },
      },
    ],
    {
      compress: 0.88,
      format:
        ImageManipulator
          .SaveFormat.JPEG,
    },
  );

      router.replace({
        pathname: "/photo-crop/preview",
        params: {
          croppedUri: result.uri,
          targetType:
            targetType || "profile",
          groupId:
            groupId || "",
        },
      });
    } catch (cropError) {
  console.error(
    "PHOTO CROP ERROR:",
    cropError,
  );

  setError(
    cropError instanceof Error
      ? cropError.message
      : "Unable to crop this photo.",
  );
} finally {
      setIsSaving(false);
    }
  }


  if (
    !uri
    || !sourceWidth
    || !sourceHeight
  ) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.center}>
          <Text style={styles.errorTitle}>
            Photo unavailable
          </Text>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={styles.retryButton}
          >
            <Text
              style={styles.retryText}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  const baseRenderedWidth =
    sourceWidth * baseScale;

  const baseRenderedHeight =
    sourceHeight * baseScale;


  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Crop Photo
        </Text>

        <Pressable
          onPress={resetCrop}
          style={styles.topBarButton}
        >
          <RotateCcw
            size={21}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.instructions}>
          Pinch to zoom and drag the picture
          until it looks right inside the
          circle.
        </Text>

        <GestureDetector
          gesture={composedGesture}
        >
          <View
            style={[
              styles.cropViewport,
              {
                width: CROP_SIZE,
                height: CROP_SIZE,
                borderRadius:
                  CROP_SIZE / 2,
              },
            ]}
          >
            <Animated.Image
              source={{ uri }}
              style={[
                {
                  width:
                    baseRenderedWidth,
                  height:
                    baseRenderedHeight,
                },
                animatedImageStyle,
              ]}
              resizeMode="cover"
            />

            <View
              pointerEvents="none"
              style={[
                styles.cropRing,
                {
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  borderRadius:
                    CROP_SIZE / 2,
                },
              ]}
            />
          </View>
        </GestureDetector>

        <Text style={styles.helperText}>
          Everything inside the circle will
          become the visible profile or group
          picture.
        </Text>

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        <Pressable
          onPress={() =>
            void saveCrop()
          }
          disabled={isSaving}
          style={[
            styles.saveButton,
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
              size={22}
              color="#FFFFFF"
              strokeWidth={3}
            />
          )}

          <Text style={styles.saveText}>
            {isSaving
              ? "Preparing Photo..."
              : "Use This Crop"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
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
    backgroundColor:
      "rgba(255,255,255,0.1)",
  },

  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  instructions: {
    maxWidth: 350,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    color: "#DCE1E7",
    textAlign: "center",
  },

  cropViewport: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151F2D",
  },

  cropRing: {
    position: "absolute",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },

  helperText: {
    maxWidth: 330,
    marginTop: 22,
    fontSize: 12,
    lineHeight: 18,
    color: "#AAB1BC",
    textAlign: "center",
  },

  saveButton: {
    width: "100%",
    maxWidth: 380,
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 27,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  errorText: {
    marginTop: 12,
    color: "#FFABB4",
    fontWeight: "700",
    textAlign: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
