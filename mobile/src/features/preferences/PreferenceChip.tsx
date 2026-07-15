import {
  Check,
  LockKeyhole,
} from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PreferenceChipProps = {
  label: string;
  selected: boolean;
  secondarySelected?: boolean;
  secondaryLabel?: string;
  rank?: number | null;
  onPress: () => void;
  onSecondaryPress?: () => void;
};

export function PreferenceChip({
  label,
  selected,
  secondarySelected = false,
  secondaryLabel,
  rank,
  onPress,
  onSecondaryPress,
}: PreferenceChipProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.chipSelected,
          pressed && styles.chipPressed,
        ]}
      >
        {typeof rank === "number" && (
          <View style={styles.rank}>
            <Text style={styles.rankText}>
              {rank}
            </Text>
          </View>
        )}

        {selected && rank == null && (
          <Check
            size={16}
            color="#FFFFFF"
            strokeWidth={3}
          />
        )}

        <Text
          style={[
            styles.label,
            selected && styles.labelSelected,
          ]}
        >
          {label}
        </Text>
      </Pressable>

      {selected &&
        secondaryLabel &&
        onSecondaryPress && (
          <Pressable
            onPress={onSecondaryPress}
            style={[
              styles.secondaryButton,
              secondarySelected &&
                styles.secondaryButtonSelected,
            ]}
          >
            <LockKeyhole
              size={13}
              color={
                secondarySelected
                  ? "#FFFFFF"
                  : "#C62828"
              }
            />

            <Text
              style={[
                styles.secondaryText,
                secondarySelected &&
                  styles.secondaryTextSelected,
              ]}
            >
              {secondaryLabel}
            </Text>
          </Pressable>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 43,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  chipSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },

  chipPressed: {
    opacity: 0.76,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#343B46",
  },

  labelSelected: {
    color: "#FFFFFF",
  },

  rank: {
    width: 23,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  rankText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "center",
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E8A7A7",
    borderRadius: 999,
    backgroundColor: "#FFF4F4",
  },

  secondaryButtonSelected: {
    borderColor: "#C62828",
    backgroundColor: "#C62828",
  },

  secondaryText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#C62828",
  },

  secondaryTextSelected: {
    color: "#FFFFFF",
  },
});