import { ReactNode } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function PlaceholderScreen({
  title,
  description,
  icon,
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        {icon}

        <Text style={styles.title}>{title}</Text>

        <Text style={styles.description}>
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  title: {
    marginTop: 14,
    fontSize: 32,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  description: {
    maxWidth: 420,
    marginTop: 10,
    fontSize: 17,
    lineHeight: 25,
    color: "#606773",
    textAlign: "center",
  },
});