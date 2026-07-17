import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from "lucide-react-native";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useState } from "react";

import {
  usePickDraft,
} from "@/features/pickSessions/PickDraftContext";

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/pick");
}

export default function PickFiltersScreen() {
  const {
    draft,
    updateSessionFilters,
  } = usePickDraft();

  const [openNow, setOpenNow] = useState(draft.openNow);
  const [includeDelivery, setIncludeDelivery] =
    useState(draft.includeDelivery);
  const [includeDriveThrough, setIncludeDriveThrough] =
    useState(draft.includeDriveThrough);
  const [somethingNew, setSomethingNew] =
    useState(draft.somethingNew);

  function handleSave() {
    updateSessionFilters({
      openNow,
      includeDelivery,
      includeDriveThrough,
      somethingNew,
      cuisineIds: draft.cuisineIds,
      filtersReviewed: true,
    });

    router.replace("/(tabs)/pick");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={23} color="#07111F" />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Session Filters</Text>
          <Text style={styles.topBarSubtitle}>Set what sounds good now</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <UtensilsCrossed size={27} color="#F3344A" />
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>Optional session filters</Text>
            <Text style={styles.introText}>
              Review these choices for this session. You can save with none selected.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Session Filters</Text>

        <FilterToggle
          icon={<Clock3 size={21} color="#168B4F" />}
          title="Open Now"
          description="Hide restaurants that are currently closed."
          value={openNow}
          onValueChange={setOpenNow}
        />

        <FilterToggle
          icon={<Truck size={21} color="#F3344A" />}
          title="Delivery"
          description="Include restaurants offering delivery."
          value={includeDelivery}
          onValueChange={setIncludeDelivery}
        />

        <FilterToggle
          icon={<UtensilsCrossed size={21} color="#F3344A" />}
          title="Drive-Through"
          description="Prefer fast options with a drive-through."
          value={includeDriveThrough}
          onValueChange={setIncludeDriveThrough}
        />

        <FilterToggle
          icon={<Sparkles size={21} color="#E3A008" />}
          title="Something New"
          description="Give unfamiliar restaurants a ranking bonus."
          value={somethingNew}
          onValueChange={setSomethingNew}
        />

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Check size={21} color="#FFFFFF" strokeWidth={2.8} />
          <Text style={styles.saveText}>Save Session Filters</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type FilterToggleProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function FilterToggle({
  icon,
  title,
  description,
  value,
  onValueChange,
}: FilterToggleProps) {
  return (
    <View style={styles.toggleCard}>
      <View style={styles.toggleIcon}>{icon}</View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D5D8DD", true: "#A8DDBF" }}
        thumbColor={value ? "#168B4F" : "#FFFFFF"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  topBarCenter: { alignItems: "center" },
  topBarTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  topBarSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "#9298A2" },
  spacer: { width: 42 },
  content: { padding: 20, paddingBottom: 50 },
  introCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 17, borderRadius: 20, backgroundColor: "#FFF0F2" },
  introContent: { flex: 1 },
  introTitle: { fontSize: 16, fontWeight: "900", color: "#07111F" },
  introText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#69707C" },
  sectionTitle: { marginTop: 27, marginBottom: 10, fontSize: 20, fontWeight: "900", color: "#07111F" },
  toggleCard: { flexDirection: "row", alignItems: "center", marginBottom: 10, padding: 15, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  toggleIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF0F2" },
  toggleContent: { flex: 1, marginLeft: 11, marginRight: 10 },
  toggleTitle: { fontSize: 15, fontWeight: "900", color: "#07111F" },
  toggleDescription: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#69707C" },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 58, marginTop: 20, borderRadius: 18, backgroundColor: "#F3344A" },
  saveText: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
});
