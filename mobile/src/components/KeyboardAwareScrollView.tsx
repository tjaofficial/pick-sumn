import type {
  ReactNode,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";


type KeyboardAwareScrollViewProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
} & Omit<
  ScrollViewProps,
  "contentContainerStyle"
>;


export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
  ...scrollProps
}: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={
        keyboardVerticalOffset
      }
    >
      <ScrollView
        {...scrollProps}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : "on-drag"
        }
        automaticallyAdjustKeyboardInsets={
          Platform.OS === "ios"
        }
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
