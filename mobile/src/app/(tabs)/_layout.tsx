import {
  Dices,
  Heart,
  Map,
  UserCircle,
  Users,
} from "lucide-react-native";
import {
  Tabs,
} from "expo-router";
import {
  StyleSheet,
  View,
} from "react-native";

import {
  useTheme,
} from "@/hooks/use-theme";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


export default function TabsLayout() {
  useAppTheme();

  const colors = useTheme();

  return (
    <Tabs
      initialRouteName="pick"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          colors.primary,
        tabBarInactiveTintColor:
          colors.tabBarInactive,
        tabBarStyle: {
          height: 88,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor:
            colors.tabBar,
          borderTopWidth: 0,
          elevation: 14,
          shadowColor: "#000000",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.18,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Users
              color={color}
              size={size}
              strokeWidth={2}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Heart
              color={color}
              size={size}
              strokeWidth={2}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="pick"
        options={{
          title: "Pick Sum’N",
          tabBarLabelStyle:
            styles.pickLabel,
          tabBarIcon: ({
            focused,
          }) => (
            <View
              style={[
                styles.pickButton,
                {
                  backgroundColor:
                    colors.primary,
                  borderColor:
                    colors.white,
                  shadowColor:
                    colors.primary,
                },
                focused
                  && styles.pickButtonFocused,
              ]}
            >
              <Dices
                color={colors.white}
                size={31}
                strokeWidth={2.4}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Map
              color={color}
              size={size}
              strokeWidth={2}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({
            color,
            size,
          }) => (
            <UserCircle
              color={color}
              size={size}
              strokeWidth={2}
            />
          ),
        }}
      />
    </Tabs>
  );
}


const styles =
  createThemedStyleSheet({
    pickButton: {
      width: 64,
      height: 64,
      marginTop: -28,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 4,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.32,
      shadowRadius: 9,
      elevation: 10,
    },

    pickButtonFocused: {
      transform: [
        {
          scale: 1.06,
        },
      ],
    },

    pickLabel: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: "800",
    },
  });
