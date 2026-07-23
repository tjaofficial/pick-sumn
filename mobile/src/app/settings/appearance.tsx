import {
  router,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  Moon,
  Sun,
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
  useAppTheme,
} from "@/features/settings/AppThemeContext";
import type {
  AppTheme,
} from "@/features/settings/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";


const OPTIONS: {
  value: AppTheme;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "light",
    title: "Light",
    subtitle: "Always use the light appearance",
    icon: (
      <Sun
        size={21}
        color={themeColor("#F3344A", "color")}
      />
    ),
  },
  {
    value: "dark",
    title: "Dark",
    subtitle: "Always use the dark appearance",
    icon: (
      <Moon
        size={21}
        color={themeColor("#F3344A", "color")}
      />
    ),
  },
];


export default function AppearanceSettingsScreen() {
  const {
    preference: selected,
    setPreference,
  } = useAppTheme();

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);


  async function chooseTheme(
    theme: AppTheme,
  ) {
    try {
      setIsSaving(true);

      await setPreference(
        theme,
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to save",
        getApiErrorMessage(
          requestError,
          "Your appearance setting could not be saved.",
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
          Appearance
        </Text>

        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
          <View style={styles.card}>
            {OPTIONS.map(
              (
                option,
                index,
              ) => {
                const active =
                  option.value
                  === selected;

                return (
                  <View
                    key={
                      option.value
                    }
                  >
                    <Pressable
                      onPress={() =>
                        void chooseTheme(
                          option.value,
                        )
                      }
                      disabled={isSaving}
                      style={
                        styles.row
                      }
                    >
                      <View
                        style={
                          styles.iconBox
                        }
                      >
                        {option.icon}
                      </View>

                      <View
                        style={
                          styles.rowContent
                        }
                      >
                        <Text
                          style={
                            styles.rowTitle
                          }
                        >
                          {option.title}
                        </Text>

                        <Text
                          style={
                            styles.rowSubtitle
                          }
                        >
                          {option.subtitle}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.checkCircle,
                          active
                            && styles.checkCircleActive,
                        ]}
                      >
                        {active && (
                          <Check
                            size={16}
                            color={themeColor("#FFFFFF", "color")}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                    </Pressable>

                    {index
                    < OPTIONS.length
                      - 1 && (
                      <View
                        style={
                          styles.divider
                        }
                      />
                    )}
                  </View>
                );
              },
            )}
          </View>

          <Text style={styles.note}>
            Your theme preference is saved to your account and applies
            throughout Pick Sum’N.
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
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
  },
  iconBox: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#69707C",
  },
  checkCircle: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#CDD1D7",
    borderRadius: 14,
  },
  checkCircleActive: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },
  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: "#ECEDEF",
  },
  note: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "#777E89",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
