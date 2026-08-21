import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  DollarSign,
  ListOrdered,
  LockKeyhole,
  ShieldCheck,
  Shuffle,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";

import { getPreferenceOptions } from "@/features/preferences/preferencesService";
import type { DiningStyleOption } from "@/features/preferences/types";
import type { MatchVariety } from "@/features/pickSessions/types";
import { usePickDraft } from "@/features/pickSessions/PickDraftContext";
import { getSessionDietaryPreview } from "@/features/pickSessions/pickSessionsService";
import { usePlus } from "@/features/plus/PlusContext";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import { createThemedStyleSheet, themeColor } from "@/theme/themedStyleSheet";
import { useAppTheme } from "@/features/settings/AppThemeContext";

type DiningStyleChoice = {
  key: string;
  label: string;
  ids: number[];
};

const MERGED_STYLE_GROUPS = [
  { key: "casual-dining-dine-in", label: "Casual Dining / Dine-In", slugs: ["casual-dining", "dine-in"] },
  { key: "fast-casual-fast-food", label: "Fast Casual / Fast Food", slugs: ["fast-casual", "fast-food"] },
  { key: "restaurant-bar-tavern", label: "Restaurant / Bar / Tavern", slugs: ["bar-tavern", "local-restaurant-bar-tavern"] },
];

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)/pick");
}

function buildDiningStyleChoices(diningStyles: DiningStyleOption[]): DiningStyleChoice[] {
  const groupedIds = new Set<number>();
  const choices: DiningStyleChoice[] = [];

  for (const group of MERGED_STYLE_GROUPS) {
    const matching = diningStyles.filter((style) => group.slugs.includes(style.slug));
    if (matching.length > 0) {
      matching.forEach((style) => groupedIds.add(style.id));
      choices.push({ key: group.key, label: group.label, ids: matching.map((style) => style.id) });
    }
  }

  for (const style of diningStyles) {
    if (!groupedIds.has(style.id)) {
      choices.push({ key: style.slug, label: style.name, ids: [style.id] });
    }
  }

  return choices.sort((a, b) => a.label.localeCompare(b.label));
}

function PlusBadge() {
  return (
    <View style={styles.plusBadge}>
      <Text style={styles.plusBadgeText}>PLUS</Text>
    </View>
  );
}

export default function PickFiltersScreen() {
  useAppTheme();

  const { draft, updateSessionFilters } = usePickDraft();
  const { isPlus } = usePlus();

  const [diningStyles, setDiningStyles] = useState<DiningStyleOption[]>([]);
  const [matchVariety, setMatchVariety] = useState<MatchVariety>(
    draft.matchVariety,
  );
  const [diningStyleEnabled, setDiningStyleEnabled] = useState(
    isPlus && draft.diningStyleIds.length > 0,
  );
  const [selectedDiningStyleIds, setSelectedDiningStyleIds] = useState<Set<number>>(
    new Set(draft.diningStyleIds),
  );
  const [priceFilterEnabled, setPriceFilterEnabled] = useState(
    isPlus && draft.priceFilterEnabled,
  );
  const [priceMin, setPriceMin] = useState(draft.priceMin);
  const [priceMax, setPriceMax] = useState(draft.priceMax);
  const [openNow, setOpenNow] = useState(draft.openNow);
  const [somethingNew, setSomethingNew] = useState(draft.somethingNew);
  const [hasGlutenFree, setHasGlutenFree] = useState(false);
  const [requiredGlutenFree, setRequiredGlutenFree] = useState(false);
  const [glutenFreeMatchesOnly, setGlutenFreeMatchesOnly] = useState(
    draft.glutenFreeMatchesOnly,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiningStyles() {
      try {
        setError(null);
        const options = await getPreferenceOptions();
        setDiningStyles(options.dining_styles);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, "Unable to load dining styles."));
      } finally {
        setIsLoading(false);
      }
    }
    void loadDiningStyles();
  }, []);

  useEffect(() => {
    async function loadDietaryPreview() {
      try {
        const preview = await getSessionDietaryPreview({
          groupId: draft.groupId,
          participantIds: draft.participantIds,
        });
        setHasGlutenFree(preview.has_gluten_free);
        setRequiredGlutenFree(preview.required_gluten_free);
      } catch {
        setHasGlutenFree(false);
        setRequiredGlutenFree(false);
      }
    }

    void loadDietaryPreview();
  }, [draft.groupId, draft.participantIds]);

  useEffect(() => {
    if (!isPlus) {
      setDiningStyleEnabled(false);
      setSelectedDiningStyleIds(new Set());
      setPriceFilterEnabled(false);
      setPriceMin(1);
      setPriceMax(4);
    }
  }, [isPlus]);

  const choices = useMemo(() => buildDiningStyleChoices(diningStyles), [diningStyles]);

  function isChoiceSelected(choice: DiningStyleChoice): boolean {
    return choice.ids.some((id) => selectedDiningStyleIds.has(id));
  }

  function openUpgrade(source: "dining-style" | "price") {
    router.push({ pathname: "/settings/plus", params: { source } });
  }

  function toggleDiningStyleFilter(value: boolean) {
    if (!isPlus) {
      openUpgrade("dining-style");
      return;
    }
    setDiningStyleEnabled(value);
    if (!value) setSelectedDiningStyleIds(new Set());
  }

  function toggleChoice(choice: DiningStyleChoice) {
    if (!isPlus) {
      openUpgrade("dining-style");
      return;
    }

    setSelectedDiningStyleIds((current) => {
      const next = new Set(current);
      const selected = choice.ids.some((id) => next.has(id));

      for (const id of choice.ids) {
        if (selected) next.delete(id);
        else next.add(id);
      }

      const allActiveStyleIds = diningStyles.map((style) => style.id);

      const everyDiningStyleSelected =
        allActiveStyleIds.length > 0
        && allActiveStyleIds.every((id) => next.has(id));

      // Selecting every individual style is the same as "All".
      // Empty is the canonical representation for all dining styles.
      if (everyDiningStyleSelected) {
        return new Set<number>();
      }

      return next;
    });
  }

  function selectAllDiningStyles() {
    if (!isPlus) {
      openUpgrade("dining-style");
      return;
    }
    setSelectedDiningStyleIds(new Set());
  }

  function togglePriceFilter(value: boolean) {
    if (!isPlus) {
      openUpgrade("price");
      return;
    }
    setPriceFilterEnabled(value);
    if (!value) {
      setPriceMin(1);
      setPriceMax(4);
    }
  }

  function setMinimumPrice(value: number) {
    setPriceMin(value);
    if (value > priceMax) setPriceMax(value);
  }

  function setMaximumPrice(value: number) {
    setPriceMax(value);
    if (value < priceMin) setPriceMin(value);
  }

  function handleSave() {
    const selectedIds =
      isPlus && diningStyleEnabled
        ? [...selectedDiningStyleIds]
        : [];

    const allActiveStyleIds = diningStyles.map((style) => style.id);

    const everyDiningStyleSelected =
      allActiveStyleIds.length > 0
      && allActiveStyleIds.every((id) => selectedIds.includes(id));

    const effectiveDiningStyleIds =
      everyDiningStyleSelected ? [] : selectedIds;

    const selectedChoices = choices.filter((choice) =>
      effectiveDiningStyleIds.some((id) => choice.ids.includes(id)),
    );

    updateSessionFilters({
      matchVariety,
      diningStyleIds: effectiveDiningStyleIds,
      diningStyleNames: selectedChoices.map((choice) => choice.label),
      priceFilterEnabled: isPlus && priceFilterEnabled,
      priceMin: isPlus && priceFilterEnabled ? priceMin : 1,
      priceMax: isPlus && priceFilterEnabled ? priceMax : 4,
      glutenFreeMatchesOnly: hasGlutenFree ? glutenFreeMatchesOnly : true,
      openNow,
      somethingNew,
      cuisineIds: draft.cuisineIds,
      filtersReviewed: true,
    });

    router.replace("/(tabs)/pick");
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={themeColor("#F3344A", "color")} />
          <Text style={styles.loadingText}>Loading filters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={23} color={themeColor("#07111F", "color")} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Session Filters</Text>
          <Text style={styles.topBarSubtitle}>Turn on what matters for this meal</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <UtensilsCrossed size={27} color={themeColor("#F3344A", "color")} />
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>Build this meal</Text>
            <Text style={styles.introText}>
              Leave a filter off to keep matching broad. Turn filters on only when you want Pick Sum’N to narrow the search.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Filters</Text>
        <Text style={styles.sectionDescription}>
          Free matching stays broad. Plus unlocks the filters that require extra restaurant detail.
        </Text>

        <View style={styles.filterList}>
          <View style={styles.varietyCard}>
            <View style={styles.varietyHeader}>
              <View style={styles.toggleIcon}>
                <Shuffle size={21} color={themeColor("#F3344A", "color")} />
              </View>

              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Match Variety</Text>
                <Text style={styles.toggleDescription}>
                  Choose how Pick Sum’N arranges strong restaurant matches.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setMatchVariety("balanced")}
              style={[
                styles.varietyOption,
                matchVariety === "balanced" && styles.varietyOptionSelected,
              ]}
            >
              <View style={styles.varietyOptionIcon}>
                <Shuffle
                  size={19}
                  color={themeColor(
                    matchVariety === "balanced" ? "#F3344A" : "#69707C",
                    "color",
                  )}
                />
              </View>

              <View style={styles.varietyOptionContent}>
                <Text style={styles.varietyOptionTitle}>Balanced Mix</Text>
                <Text style={styles.varietyOptionText}>
                  Keep the strongest matches near the top while mixing in other cuisines your group also likes.
                </Text>
              </View>

              {matchVariety === "balanced" && (
                <Check size={18} color={themeColor("#F3344A", "color")} strokeWidth={3} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setMatchVariety("best")}
              style={[
                styles.varietyOption,
                matchVariety === "best" && styles.varietyOptionSelected,
              ]}
            >
              <View style={styles.varietyOptionIcon}>
                <ListOrdered
                  size={19}
                  color={themeColor(
                    matchVariety === "best" ? "#F3344A" : "#69707C",
                    "color",
                  )}
                />
              </View>

              <View style={styles.varietyOptionContent}>
                <Text style={styles.varietyOptionTitle}>Best Matches</Text>
                <Text style={styles.varietyOptionText}>
                  Show restaurants strictly in the order produced by the match score and dietary priority.
                </Text>
              </View>

              {matchVariety === "best" && (
                <Check size={18} color={themeColor("#F3344A", "color")} strokeWidth={3} />
              )}
            </Pressable>
          </View>

          <View style={[styles.toggleCard, !isPlus && styles.lockedCard]}>
            <View style={styles.toggleIcon}>
              <UtensilsCrossed size={21} color={themeColor("#F3344A", "color")} />
            </View>
            <View style={styles.toggleContent}>
              <View style={styles.titleRow}>
                <Text style={styles.toggleTitle}>Dining Style</Text>
                {!isPlus && <PlusBadge />}
              </View>
              <Text style={styles.toggleDescription}>
                {!isPlus
                  ? "All dining styles are included on Free. Upgrade to choose specific styles."
                  : diningStyleEnabled
                    ? selectedDiningStyleIds.size === 0
                      ? "All dining styles selected."
                      : "Only selected dining styles will be used."
                    : "Off — all dining styles are included."}
              </Text>
            </View>
            {!isPlus ? (
              <Pressable onPress={() => openUpgrade("dining-style")} style={styles.lockButton}>
                <LockKeyhole size={19} color={themeColor("#9A5A00", "color")} />
              </Pressable>
            ) : (
              <Switch
                value={diningStyleEnabled}
                onValueChange={toggleDiningStyleFilter}
                trackColor={{ false: "#D5D8DD", true: "#A8DDBF" }}
                thumbColor={diningStyleEnabled ? "#168B4F" : "#FFFFFF"}
              />
            )}
          </View>

          {isPlus && diningStyleEnabled && (
            <View style={styles.expandedCard}>
              <Pressable
                onPress={selectAllDiningStyles}
                style={[
                  styles.styleChip,
                  selectedDiningStyleIds.size === 0 && styles.styleChipSelected,
                ]}
              >
                {selectedDiningStyleIds.size === 0 && (
                  <Check size={16} color={themeColor("#FFFFFF", "color")} strokeWidth={3} />
                )}
                <Text
                  style={[
                    styles.styleChipText,
                    selectedDiningStyleIds.size === 0 && styles.styleChipTextSelected,
                  ]}
                >
                  All Dining Styles
                </Text>
              </Pressable>

              <View style={styles.chipContainer}>
                {choices.map((choice) => {
                  const selected = isChoiceSelected(choice);
                  return (
                    <Pressable
                      key={choice.key}
                      onPress={() => toggleChoice(choice)}
                      style={[styles.styleChip, selected && styles.styleChipSelected]}
                    >
                      {selected && (
                        <Check size={16} color={themeColor("#FFFFFF", "color")} strokeWidth={3} />
                      )}
                      <Text style={[styles.styleChipText, selected && styles.styleChipTextSelected]}>
                        {choice.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={[styles.toggleCard, !isPlus && styles.lockedCard]}>
            <View style={styles.toggleIcon}>
              <DollarSign size={21} color={themeColor("#168B4F", "color")} />
            </View>
            <View style={styles.toggleContent}>
              <View style={styles.titleRow}>
                <Text style={styles.toggleTitle}>Price Range</Text>
                {!isPlus && <PlusBadge />}
              </View>
              <Text style={styles.toggleDescription}>
                {!isPlus
                  ? "All price levels are included on Free."
                  : priceFilterEnabled
                    ? `${"$".repeat(priceMin)} through ${"$".repeat(priceMax)}`
                    : "Off — all price levels are included."}
              </Text>
            </View>
            {!isPlus ? (
              <Pressable onPress={() => openUpgrade("price")} style={styles.lockButton}>
                <LockKeyhole size={19} color={themeColor("#9A5A00", "color")} />
              </Pressable>
            ) : (
              <Switch
                value={priceFilterEnabled}
                onValueChange={togglePriceFilter}
                trackColor={{ false: "#D5D8DD", true: "#A8DDBF" }}
                thumbColor={priceFilterEnabled ? "#168B4F" : "#FFFFFF"}
              />
            )}
          </View>

          {isPlus && priceFilterEnabled && (
            <View style={styles.expandedCard}>
              <Text style={styles.rangeLabel}>Minimum price</Text>
              <View style={styles.priceRow}>
                {[1, 2, 3, 4].map((price) => (
                  <Pressable
                    key={`min-${price}`}
                    onPress={() => setMinimumPrice(price)}
                    style={[styles.priceChip, priceMin === price && styles.priceChipSelected]}
                  >
                    <Text style={[styles.priceChipText, priceMin === price && styles.priceChipTextSelected]}>
                      {"$".repeat(price)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.rangeLabel, { marginTop: 15 }]}>Maximum price</Text>
              <View style={styles.priceRow}>
                {[1, 2, 3, 4].map((price) => (
                  <Pressable
                    key={`max-${price}`}
                    onPress={() => setMaximumPrice(price)}
                    style={[styles.priceChip, priceMax === price && styles.priceChipSelected]}
                  >
                    <Text style={[styles.priceChipText, priceMax === price && styles.priceChipTextSelected]}>
                      {"$".repeat(price)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {hasGlutenFree && (
            <FilterToggle
              icon={
                <ShieldCheck
                  size={21}
                  color={themeColor("#168B4F", "color")}
                />
              }
              title="Gluten-Free Matches Only"
              description={
                requiredGlutenFree
                  ? "Someone selected has gluten-free marked as required. You can still turn this off for this session after checking with your group."
                  : "Someone selected has a gluten-free preference. Keep this on to prioritize gluten-free-friendly matches for this session."
              }
              value={glutenFreeMatchesOnly}
              onValueChange={setGlutenFreeMatchesOnly}
            />
          )}

          <FilterToggle
            icon={<Clock3 size={21} color={themeColor("#168B4F", "color")} />}
            title="Open Now"
            description="Hide restaurants that are currently closed."
            value={openNow}
            onValueChange={setOpenNow}
          />

          <FilterToggle
            icon={<Sparkles size={21} color={themeColor("#E3A008", "color")} />}
            title="Something New"
            description="Give unfamiliar restaurants a ranking bonus."
            value={somethingNew}
            onValueChange={setSomethingNew}
          />
        </View>

        {!isPlus && (
          <Pressable
            onPress={() => router.push("/settings/plus")}
            style={styles.upgradeCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>Unlock advanced filters</Text>
              <Text style={styles.upgradeText}>
                Choose dining styles, narrow by price, search farther, use larger groups, and more with Pick Sum’N Plus.
              </Text>
            </View>
            <LockKeyhole size={22} color={themeColor("#9A5A00", "color")} />
          </Pressable>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Check size={21} color={themeColor("#FFFFFF", "color")} strokeWidth={2.8} />
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

function FilterToggle({ icon, title, description, value, onValueChange }: FilterToggleProps) {
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

const styles = createThemedStyleSheet({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  topBarCenter: { alignItems: "center", flex: 1 },
  topBarTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  topBarSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "#9298A2" },
  spacer: { width: 42 },
  content: { padding: 20, paddingBottom: 50 },
  introCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 17, borderRadius: 20, backgroundColor: "#FFF0F2" },
  introContent: { flex: 1 },
  introTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  introText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#69707C" },
  sectionTitle: { marginTop: 27, fontSize: 21, fontWeight: "900", color: "#07111F" },
  sectionDescription: { marginTop: 4, fontSize: 13, lineHeight: 18, color: "#69707C" },
  filterList: { gap: 10, marginTop: 15 },
  varietyCard: { padding: 15, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  varietyHeader: { flexDirection: "row", alignItems: "center", marginBottom: 11 },
  varietyOption: { flexDirection: "row", alignItems: "center", minHeight: 72, marginTop: 8, padding: 12, borderWidth: 1.5, borderColor: "#E3E6EA", borderRadius: 16, backgroundColor: "#FAFBFC" },
  varietyOptionSelected: { borderColor: "#F5A0AA", backgroundColor: "#FFF4F5" },
  varietyOptionIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FFFFFF" },
  varietyOptionContent: { flex: 1, marginHorizontal: 10 },
  varietyOptionTitle: { fontSize: 14, fontWeight: "900", color: "#07111F" },
  varietyOptionText: { marginTop: 3, fontSize: 11, lineHeight: 16, color: "#69707C" },
  toggleCard: { flexDirection: "row", alignItems: "center", padding: 15, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  lockedCard: { borderColor: "#E8D3A7", backgroundColor: "#FFFDF7" },
  toggleIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF0F2" },
  toggleContent: { flex: 1, marginLeft: 11, marginRight: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  toggleTitle: { fontSize: 15, fontWeight: "900", color: "#07111F" },
  toggleDescription: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#69707C" },
  plusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF0F2" },
  plusBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.7, color: "#F3344A" },
  lockButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF4DC" },
  expandedCard: { padding: 15, borderWidth: 1, borderColor: "#E4E7EB", borderRadius: 18, backgroundColor: "#FAFBFC" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 10 },
  styleChip: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 43, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: "#D9DDE3", borderRadius: 999, backgroundColor: "#FFFFFF" },
  styleChipSelected: { borderColor: "#F3344A", backgroundColor: "#F3344A" },
  styleChipText: { fontSize: 13, fontWeight: "800", color: "#343B46" },
  styleChipTextSelected: { color: "#FFFFFF" },
  rangeLabel: { fontSize: 12, fontWeight: "900", color: "#343B46" },
  priceRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  priceChip: { flex: 1, minHeight: 43, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#D9DDE3", borderRadius: 13, backgroundColor: "#FFFFFF" },
  priceChipSelected: { borderColor: "#F3344A", backgroundColor: "#F3344A" },
  priceChipText: { fontSize: 14, fontWeight: "900", color: "#343B46" },
  priceChipTextSelected: { color: "#FFFFFF" },
  upgradeCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 16, padding: 15, borderWidth: 1, borderColor: "#E8D3A7", borderRadius: 18, backgroundColor: "#FFF8E9" },
  upgradeTitle: { fontSize: 14, fontWeight: "900", color: "#7A4700" },
  upgradeText: { marginTop: 4, fontSize: 11, lineHeight: 16, color: "#775F3B" },
  errorCard: { marginTop: 18, padding: 14, borderWidth: 1, borderColor: "#F3C5C5", borderRadius: 16, backgroundColor: "#FFF1F1" },
  errorText: { color: "#9F2424", fontWeight: "700", textAlign: "center" },
  saveButton: { minHeight: 57, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 25, borderRadius: 18, backgroundColor: "#F3344A" },
  saveText: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#69707C", fontWeight: "700" },
});
