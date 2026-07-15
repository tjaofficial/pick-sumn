import {
  ArrowRight,
  CircleCheck,
  ClipboardList,
} from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ProfileCompletionCardProps = {
  percentage: number;
  missingSections: string[];
  onPress: () => void;
};

function formatSection(section: string): string {
  const labels: Record<string, string> = {
    basic_profile: "Basic profile",
    location: "Location",
    cuisines: "Favorite cuisines",
    dining_styles: "Dining styles",
    dietary_preferences: "Dietary preferences",
    food_dislikes: "Food dislikes",
    default_settings: "Default search settings",
  };

  return labels[section] ?? section.replaceAll("_", " ");
}

export function ProfileCompletionCard({
  percentage,
  missingSections,
  onPress,
}: ProfileCompletionCardProps) {
  const complete = percentage >= 100;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          {complete ? (
            <CircleCheck
              size={25}
              color="#21A05A"
              strokeWidth={2.4}
            />
          ) : (
            <ClipboardList
              size={25}
              color="#F3344A"
              strokeWidth={2.3}
            />
          )}
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.label}>
            Your Taste Profile
          </Text>

          <Text style={styles.percentage}>
            {percentage}% Complete
          </Text>
        </View>

        <ArrowRight
          size={21}
          color="#9096A0"
        />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(
                Math.max(percentage, 0),
                100,
              )}%`,
            },
          ]}
        />
      </View>

      {complete ? (
        <Text style={styles.message}>
          Your profile is ready for stronger matches.
        </Text>
      ) : (
        <>
          <Text style={styles.message}>
            Add more details to improve your recommendations.
          </Text>

          {missingSections.length > 0 && (
            <Text style={styles.missingText}>
              Next: {formatSection(missingSections[0])}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#07111F",
  },

  cardPressed: {
    opacity: 0.9,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#172332",
  },

  headerContent: {
    flex: 1,
    marginLeft: 13,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B6BDC7",
  },

  percentage: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  progressTrack: {
    height: 9,
    marginTop: 17,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#303B49",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F3344A",
  },

  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#C5CBD3",
  },

  missingText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: "#FFB5BF",
  },
});