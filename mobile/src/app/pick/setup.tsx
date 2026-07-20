import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Clock3,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getPreferenceOptions,
} from "@/features/preferences/preferencesService";
import type {
  DiningStyleOption,
} from "@/features/preferences/types";
import {
  usePickDraft,
} from "@/features/pickSessions/PickDraftContext";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


type DiningStyleChoice = {
  key: string;
  label: string;
  ids: number[];
};


const MERGED_STYLE_GROUPS = [
  {
    key: "casual-dining-dine-in",
    label: "Casual Dining / Dine-In",
    slugs: [
      "casual-dining",
      "dine-in",
    ],
  },
  {
    key: "fast-casual-fast-food",
    label: "Fast Casual / Fast Food",
    slugs: [
      "fast-casual",
      "fast-food",
    ],
  },
];


function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/pick");
}


function buildDiningStyleChoices(
  diningStyles: DiningStyleOption[],
): DiningStyleChoice[] {
  const groupedIds = new Set<number>();
  const choices: DiningStyleChoice[] = [];

  for (const group of MERGED_STYLE_GROUPS) {
    const matching = diningStyles.filter(
      (style) =>
        group.slugs.includes(
          style.slug,
        ),
    );

    if (matching.length > 0) {
      matching.forEach(
        (style) =>
          groupedIds.add(style.id),
      );

      choices.push({
        key: group.key,
        label: group.label,
        ids: matching.map(
          (style) => style.id,
        ),
      });
    }
  }

  for (const style of diningStyles) {
    if (groupedIds.has(style.id)) {
      continue;
    }

    choices.push({
      key: style.slug,
      label: style.name,
      ids: [style.id],
    });
  }

  return choices.sort(
    (first, second) =>
      first.label.localeCompare(
        second.label,
      ),
  );
}


export default function PickFiltersScreen() {
  const {
    draft,
    updateSessionFilters,
  } = usePickDraft();

  const [
    diningStyles,
    setDiningStyles,
  ] = useState<DiningStyleOption[]>([]);

  const [
    selectedDiningStyleIds,
    setSelectedDiningStyleIds,
  ] = useState<Set<number>>(
    new Set(
      draft.diningStyleIds,
    ),
  );

  const [openNow, setOpenNow] =
    useState(draft.openNow);

  const [
    somethingNew,
    setSomethingNew,
  ] = useState(
    draft.somethingNew,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  useEffect(() => {
    async function loadDiningStyles() {
      try {
        setError(null);

        const options =
          await getPreferenceOptions();

        setDiningStyles(
          options.dining_styles,
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load dining styles.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDiningStyles();
  }, []);


  const choices = useMemo(
    () =>
      buildDiningStyleChoices(
        diningStyles,
      ),
    [diningStyles],
  );


  function isChoiceSelected(
    choice: DiningStyleChoice,
  ): boolean {
    return choice.ids.some(
      (id) =>
        selectedDiningStyleIds.has(
          id,
        ),
    );
  }


  function toggleChoice(
    choice: DiningStyleChoice,
  ) {
    setError(null);

    setSelectedDiningStyleIds(
      (current) => {
        const next = new Set(
          current,
        );

        const selected =
          choice.ids.some(
            (id) =>
              next.has(id),
          );

        for (const id of choice.ids) {
          if (selected) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }

        return next;
      },
    );
  }


  function handleSave() {
    if (
      selectedDiningStyleIds.size
      < 1
    ) {
      setError(
        "Choose at least one dining style for this session.",
      );

      return;
    }

    const selectedChoices =
      choices.filter(
        (choice) =>
          isChoiceSelected(
            choice,
          ),
      );

    updateSessionFilters({
      diningStyleIds: [
        ...selectedDiningStyleIds,
      ],
      diningStyleNames:
        selectedChoices.map(
          (choice) =>
            choice.label,
        ),
      openNow,
      somethingNew,
      cuisineIds:
        draft.cuisineIds,
      filtersReviewed: true,
    });

    router.replace(
      "/(tabs)/pick",
    );
  }


  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text
            style={styles.loadingText}
          >
            Loading dining styles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <View
          style={
            styles.topBarCenter
          }
        >
          <Text
            style={styles.topBarTitle}
          >
            Session Filters
          </Text>

          <Text
            style={
              styles.topBarSubtitle
            }
          >
            Set what sounds good now
          </Text>
        </View>

        <View
          style={styles.spacer}
        />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.introCard}>
          <UtensilsCrossed
            size={27}
            color="#F3344A"
          />

          <View
            style={
              styles.introContent
            }
          >
            <Text
              style={styles.introTitle}
            >
              Build this meal
            </Text>

            <Text
              style={styles.introText}
            >
              Choose at least one dining style,
              then add any extra filters that
              matter right now.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.sectionHeadingRow
          }
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              Dining Style
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              Choose one or more for this
              session.
            </Text>
          </View>

          <View
            style={
              styles.requiredBadge
            }
          >
            <Text
              style={
                styles.requiredBadgeText
              }
            >
              REQUIRED
            </Text>
          </View>
        </View>

        <View
          style={styles.chipContainer}
        >
          {choices.map(
            (choice) => {
              const selected =
                isChoiceSelected(
                  choice,
                );

              return (
                <Pressable
                  key={choice.key}
                  onPress={() =>
                    toggleChoice(
                      choice,
                    )
                  }
                  style={[
                    styles.styleChip,
                    selected
                      && styles.styleChipSelected,
                  ]}
                >
                  {selected && (
                    <Check
                      size={16}
                      color="#FFFFFF"
                      strokeWidth={3}
                    />
                  )}

                  <Text
                    style={[
                      styles.styleChipText,
                      selected
                        && styles.styleChipTextSelected,
                    ]}
                  >
                    {choice.label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <View
          style={styles.divider}
        />

        <Text
          style={styles.sectionTitle}
        >
          Extra Filters
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Optional filters for this
          meal.
        </Text>

        <View
          style={
            styles.filterList
          }
        >
          <FilterToggle
            icon={
              <Clock3
                size={21}
                color="#168B4F"
              />
            }
            title="Open Now"
            description="Hide restaurants that are currently closed."
            value={openNow}
            onValueChange={
              setOpenNow
            }
          />

          <FilterToggle
            icon={
              <Sparkles
                size={21}
                color="#E3A008"
              />
            }
            title="Something New"
            description="Give unfamiliar restaurants a ranking bonus."
            value={
              somethingNew
            }
            onValueChange={
              setSomethingNew
            }
          />
        </View>

        {error && (
          <View
            style={styles.errorCard}
          >
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={
            selectedDiningStyleIds
              .size < 1
          }
          style={[
            styles.saveButton,
            selectedDiningStyleIds
              .size < 1
              && styles.saveButtonDisabled,
          ]}
        >
          <Check
            size={21}
            color="#FFFFFF"
            strokeWidth={2.8}
          />

          <Text
            style={styles.saveText}
          >
            Save Session Filters
          </Text>
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
  onValueChange: (
    value: boolean,
  ) => void;
};


function FilterToggle({
  icon,
  title,
  description,
  value,
  onValueChange,
}: FilterToggleProps) {
  return (
    <View
      style={styles.toggleCard}
    >
      <View
        style={styles.toggleIcon}
      >
        {icon}
      </View>

      <View
        style={
          styles.toggleContent
        }
      >
        <Text
          style={styles.toggleTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.toggleDescription
          }
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={
          onValueChange
        }
        trackColor={{
          false: "#D5D8DD",
          true: "#A8DDBF",
        }}
        thumbColor={
          value
            ? "#168B4F"
            : "#FFFFFF"
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  topBarCenter: {
    alignItems: "center",
  },

  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  topBarSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#9298A2",
  },

  spacer: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 17,
    borderRadius: 20,
    backgroundColor: "#FFF0F2",
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  introText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#69707C",
  },

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent:
      "space-between",
    gap: 12,
    marginTop: 27,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
  },

  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#69707C",
  },

  requiredBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF0F2",
  },

  requiredBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#F3344A",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 16,
  },

  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: "#D9DDE3",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  styleChipSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },

  styleChipText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#343B46",
  },

  styleChipTextSelected: {
    color: "#FFFFFF",
  },

  divider: {
    height: 1,
    marginVertical: 27,
    backgroundColor: "#E3E5E8",
  },

  filterList: {
    gap: 10,
    marginTop: 15,
  },

  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  toggleIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFF0F2",
  },

  toggleContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 10,
  },

  toggleTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  toggleDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#69707C",
  },

  errorCard: {
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 16,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    color: "#9F2424",
    fontWeight: "700",
    textAlign: "center",
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 58,
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  saveButtonDisabled: {
    opacity: 0.42,
  },

  saveText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#69707C",
  },
});
