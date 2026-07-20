import { router } from "expo-router";
import {
  ArrowLeft,
  CircleDollarSign,
  Heart,
  Leaf,
  Save,
  Sparkles,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { PreferenceChip } from "@/features/preferences/PreferenceChip";
import {
  getCurrentPreferences,
  getPreferenceOptions,
  savePreferences,
} from "@/features/preferences/preferencesService";
import type {
  CurrentPreferences,
  PreferenceLevel,
  PreferenceOptions,
  SavePreferencesInput,
} from "@/features/preferences/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

type SelectedCuisine = {
  level: PreferenceLevel;
  rank: number;
};

type SelectedDietaryTag = {
  isRequired: boolean;
};


type SectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function SectionHeader({
  icon,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        {icon}
      </View>

      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function PreferencesScreen() {
  const [options, setOptions] =
    useState<PreferenceOptions | null>(null);

  const [current, setCurrent] =
    useState<CurrentPreferences | null>(null);

  const [selectedCuisines, setSelectedCuisines] =
    useState<Map<number, SelectedCuisine>>(
      new Map(),
    );

  const [
    selectedDietaryTags,
    setSelectedDietaryTags,
  ] = useState<Map<number, SelectedDietaryTag>>(
    new Map(),
  );


  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);

        const [
          loadedOptions,
          loadedPreferences,
        ] = await Promise.all([
          getPreferenceOptions(),
          getCurrentPreferences(),
        ]);

        setOptions(loadedOptions);
        setCurrent(loadedPreferences);

        setSelectedCuisines(
          new Map(
            loadedPreferences.cuisines.map(
              (preference) => [
                preference.cuisine_id,
                {
                  level: preference.level,
                  rank:
                    preference.rank ??
                    loadedPreferences.cuisines.length +
                      1,
                },
              ],
            ),
          ),
        );

        setSelectedDietaryTags(
          new Map(
            loadedPreferences.dietary_preferences.map(
              (preference) => [
                preference.dietary_tag_id,
                {
                  isRequired:
                    preference.is_required,
                },
              ],
            ),
          ),
        );

      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load food preferences.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  const sortedCuisineSelections = useMemo(
    () =>
      [...selectedCuisines.entries()].sort(
        (first, second) =>
          first[1].rank - second[1].rank,
      ),
    [selectedCuisines],
  );

  function normalizeCuisineRanks(
    selections: Map<number, SelectedCuisine>,
  ): Map<number, SelectedCuisine> {
    const sorted = [...selections.entries()].sort(
      (first, second) =>
        first[1].rank - second[1].rank,
    );

    return new Map(
      sorted.map(([id, value], index) => [
        id,
        {
          ...value,
          rank: index + 1,
        },
      ]),
    );
  }

  function toggleCuisine(cuisineId: number) {
    setError(null);

    setSelectedCuisines((currentSelections) => {
      const next = new Map(currentSelections);

      if (next.has(cuisineId)) {
        next.delete(cuisineId);
        return normalizeCuisineRanks(next);
      }

      if (next.size >= 5) {
        setError(
          "Choose no more than five favorite cuisines.",
        );

        return currentSelections;
      }

      next.set(cuisineId, {
        level: 2,
        rank: next.size + 1,
      });

      return next;
    });
  }

  function moveCuisine(
    cuisineId: number,
    direction: "up" | "down",
  ) {
    setSelectedCuisines((currentSelections) => {
      const ordered = [
        ...currentSelections.entries(),
      ].sort(
        (first, second) =>
          first[1].rank - second[1].rank,
      );

      const currentIndex = ordered.findIndex(
        ([id]) => id === cuisineId,
      );

      const targetIndex =
        direction === "up"
          ? currentIndex - 1
          : currentIndex + 1;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= ordered.length
      ) {
        return currentSelections;
      }

      const nextOrder = [...ordered];

      [
        nextOrder[currentIndex],
        nextOrder[targetIndex],
      ] = [
        nextOrder[targetIndex],
        nextOrder[currentIndex],
      ];

      return new Map(
        nextOrder.map(([id, value], index) => [
          id,
          {
            ...value,
            rank: index + 1,
          },
        ]),
      );
    });
  }

  function toggleDietaryTag(
    dietaryTagId: number,
  ) {
    setSelectedDietaryTags(
      (currentSelections) => {
        const next = new Map(currentSelections);

        if (next.has(dietaryTagId)) {
          next.delete(dietaryTagId);
        } else {
          next.set(dietaryTagId, {
            isRequired: false,
          });
        }

        return next;
      },
    );
  }

  function toggleDietaryRequired(
    dietaryTagId: number,
  ) {
    setSelectedDietaryTags(
      (currentSelections) => {
        const next = new Map(currentSelections);
        const currentValue =
          next.get(dietaryTagId);

        if (!currentValue) {
          return currentSelections;
        }

        next.set(dietaryTagId, {
          isRequired:
            !currentValue.isRequired,
        });

        return next;
      },
    );
  }


    function handleBack() {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace("/(tabs)/profile");
    }

  async function handleSave() {
    if (selectedCuisines.size < 3) {
      setError(
        "Choose at least three favorite cuisines.",
      );

      return;
    }

    const payload: SavePreferencesInput = {
      cuisines: sortedCuisineSelections.map(
        ([cuisineId, value]) => ({
          cuisine_id: cuisineId,
          level: value.level,
          rank: value.rank,
        }),
      ),

      // Dining Styles are session-level now.
      // Preserve any legacy permanent values without editing them.
      dining_styles:
        current?.dining_styles ?? [],

      dietary_preferences: [
        ...selectedDietaryTags.entries(),
      ].map(([dietaryTagId, value]) => ({
        dietary_tag_id: dietaryTagId,
        is_required: value.isRequired,
      })),

      // Dislikes & Avoid is no longer part of the visible
      // preference flow. Preserve legacy values without editing them.
      food_dislikes:
        current?.food_dislikes ?? [],
    };

    try {
      setIsSaving(true);
      setError(null);

      const saved = await savePreferences(
        payload,
      );

      setCurrent(saved);

      router.replace("/(tabs)/profile");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to save your preferences.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text style={styles.loadingText}>
            Loading your taste profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!options) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Preferences unavailable
          </Text>

          <Text style={styles.errorMessage}>
            {error ??
              "The preference options could not be loaded."}
          </Text>

          <Pressable
            onPress={() => handleBack()}
            style={styles.backHomeButton}
          >
            <Text style={styles.backHomeText}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
            onPress={handleBack}
            style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color="#07111F"
          />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>
            Food Preferences
          </Text>

          <Text style={styles.topBarSubtitle}>
            {current?.completion_percentage ?? 0}%
            complete
          </Text>
        </View>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Sparkles
            size={26}
            color="#E3A008"
          />

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Teach us your taste
            </Text>

            <Text style={styles.introText}>
              Pick Sum’N uses these answers to compare
              everyone in your group.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            icon={
              <Heart
                size={22}
                color="#F3344A"
              />
            }
            title="Top Five Cuisines"
            description="Select at least three. Tap the arrows below to change their order."
          />

          <View style={styles.chipContainer}>
            {options.cuisines.map((cuisine) => {
              const selection =
                selectedCuisines.get(cuisine.id);

              return (
                <PreferenceChip
                  key={cuisine.id}
                  label={cuisine.name}
                  selected={Boolean(selection)}
                  rank={selection?.rank}
                  onPress={() =>
                    toggleCuisine(cuisine.id)
                  }
                />
              );
            })}
          </View>

          {sortedCuisineSelections.length > 1 && (
            <View style={styles.rankingCard}>
              <Text style={styles.rankingTitle}>
                Your Ranking
              </Text>

              {sortedCuisineSelections.map(
                ([cuisineId, value]) => {
                  const cuisine =
                    options.cuisines.find(
                      (option) =>
                        option.id === cuisineId,
                    );

                  if (!cuisine) {
                    return null;
                  }

                  return (
                    <View
                      key={cuisineId}
                      style={styles.rankRow}
                    >
                      <View style={styles.rankNumber}>
                        <Text
                          style={
                            styles.rankNumberText
                          }
                        >
                          {value.rank}
                        </Text>
                      </View>

                      <Text style={styles.rankName}>
                        {cuisine.name}
                      </Text>

                      <View
                        style={styles.rankActions}
                      >
                        <Pressable
                          onPress={() =>
                            moveCuisine(
                              cuisineId,
                              "up",
                            )
                          }
                          style={styles.rankButton}
                        >
                          <Text
                            style={
                              styles.rankButtonText
                            }
                          >
                            ↑
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            moveCuisine(
                              cuisineId,
                              "down",
                            )
                          }
                          style={styles.rankButton}
                        >
                          <Text
                            style={
                              styles.rankButtonText
                            }
                          >
                            ↓
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                },
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            icon={
              <Leaf
                size={22}
                color="#21A05A"
              />
            }
            title="Dietary Preferences"
            description="Select anything that applies. Mark required items that restaurants must support."
          />

          <View style={styles.chipContainer}>
            {options.dietary_tags.map(
              (dietaryTag) => {
                const selection =
                  selectedDietaryTags.get(
                    dietaryTag.id,
                  );

                return (
                  <PreferenceChip
                    key={dietaryTag.id}
                    label={dietaryTag.name}
                    selected={Boolean(selection)}
                    secondarySelected={
                      selection?.isRequired
                    }
                    secondaryLabel="Required"
                    onPress={() =>
                      toggleDietaryTag(
                        dietaryTag.id,
                      )
                    }
                    onSecondaryPress={() =>
                      toggleDietaryRequired(
                        dietaryTag.id,
                      )
                    }
                  />
                );
              },
            )}
          </View>

          <Text style={styles.sectionNote}>
            Leave this section empty when no dietary
            preferences apply.
          </Text>
        </View>

        <View style={styles.priceReminder}>
          <CircleDollarSign
            size={24}
            color="#E3A008"
          />

          <Text style={styles.priceReminderText}>
            Your price and distance defaults are managed
            from Edit Profile.
          </Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton,
            isSaving && styles.saveButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Save
              size={21}
              color="#FFFFFF"
            />
          )}

          <Text style={styles.saveButtonText}>
            {isSaving
              ? "Saving Preferences..."
              : "Save Preferences"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
    backgroundColor: "#FFF9F2",
  },

  topBarButton: {
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
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  topBarSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "#F3344A",
  },

  topBarSpacer: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 52,
  },

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F0DDA4",
    borderRadius: 21,
    backgroundColor: "#FFF8DF",
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

  section: {
    marginTop: 28,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  sectionIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  sectionHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#07111F",
  },

  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#69707C",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  rankingCard: {
    marginTop: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  rankingTitle: {
    marginBottom: 9,
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
  },

  rankNumber: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  rankNumberText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  rankName: {
    flex: 1,
    marginLeft: 11,
    fontSize: 14,
    fontWeight: "800",
    color: "#343B46",
  },

  rankActions: {
    flexDirection: "row",
    gap: 5,
  },

  rankButton: {
    width: 33,
    height: 33,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9DDE3",
    borderRadius: 11,
    backgroundColor: "#F8F8F9",
  },

  rankButtonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  sectionNote: {
    marginTop: 13,
    fontSize: 12,
    fontStyle: "italic",
    color: "#777E89",
  },

  priceReminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 30,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF8DF",
  },

  priceReminderText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: "#5B5133",
  },

  errorCard: {
    marginTop: 20,
    padding: 15,
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
    gap: 9,
    marginTop: 24,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  saveButtonDisabled: {
    opacity: 0.62,
  },

  saveButtonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  loadingText: {
    color: "#69707C",
    fontWeight: "700",
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#07111F",
  },

  errorMessage: {
    maxWidth: 350,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  backHomeButton: {
    marginTop: 10,
    paddingHorizontal: 21,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  backHomeText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});