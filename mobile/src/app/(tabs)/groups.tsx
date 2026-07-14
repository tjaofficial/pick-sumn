import { Users } from "lucide-react-native";

import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function GroupsScreen() {
  return (
    <PlaceholderScreen
      title="Groups"
      description="Create groups, connect with your partner, and invite friends or family."
      icon={
        <Users
          size={64}
          color="#F3344A"
          strokeWidth={2}
        />
      }
    />
  );
}