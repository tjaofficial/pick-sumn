import { UserCircle } from "lucide-react-native";

import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function ProfileScreen() {
  return (
    <PlaceholderScreen
      title="Profile"
      description="Manage your taste profile, favorites, dietary needs, and account settings."
      icon={
        <UserCircle
          size={64}
          color="#F3344A"
          strokeWidth={2}
        />
      }
    />
  );
}