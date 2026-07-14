import { Map } from "lucide-react-native";

import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function MapScreen() {
  return (
    <PlaceholderScreen
      title="Map"
      description="Nearby restaurant matches will be displayed on an interactive map."
      icon={
        <Map
          size={64}
          color="#F3344A"
          strokeWidth={2}
        />
      }
    />
  );
}