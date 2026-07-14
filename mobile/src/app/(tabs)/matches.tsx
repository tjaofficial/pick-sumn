import { Heart } from "lucide-react-native";

import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function MatchesScreen() {
  return (
    <PlaceholderScreen
      title="Matches"
      description="Your ranked restaurant recommendations will appear here."
      icon={
        <Heart
          size={64}
          color="#F3344A"
          strokeWidth={2}
        />
      }
    />
  );
}