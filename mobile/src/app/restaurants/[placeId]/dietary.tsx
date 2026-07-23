import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  MessageSquarePlus,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getRestaurantDietaryDetails,
  submitRestaurantDietaryReport,
} from "@/features/pickSessions/pickSessionsService";
import type {
  DietaryReportOutcome,
  RestaurantDietaryDetailResponse,
  SubmitRestaurantDietaryReportInput,
} from "@/features/pickSessions/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


type BooleanReportField =
  | "items_clearly_labeled"
  | "staff_understood"
  | "dedicated_fryer"
  | "separate_preparation_area"
  | "gloves_changed"
  | "cross_contact_concern"
  | "restaurant_could_not_accommodate"
  | "reaction_after_eating";


type ReportOption = {
  field: BooleanReportField;
  label: string;
  concern?: boolean;
};


const POSITIVE_OPTIONS: ReportOption[] = [
  {
    field: "items_clearly_labeled",
    label: "Dietary items were clearly labeled",
  },
  {
    field: "staff_understood",
    label: "Staff understood the restriction",
  },
  {
    field: "dedicated_fryer",
    label: "Dedicated fryer",
  },
  {
    field: "separate_preparation_area",
    label: "Separate preparation area",
  },
  {
    field: "gloves_changed",
    label: "Staff changed gloves",
  },
];


const CONCERN_OPTIONS: ReportOption[] = [
  {
    field: "cross_contact_concern",
    label: "Cross-contact concern",
    concern: true,
  },
  {
    field: "restaurant_could_not_accommodate",
    label: "Restaurant could not accommodate",
    concern: true,
  },
  {
    field: "reaction_after_eating",
    label: "Reaction after eating",
    concern: true,
  },
];


const OUTCOMES: {
  value: DietaryReportOutcome;
  label: string;
  description: string;
}[] = [
  {
    value: "accommodated",
    label: "Accommodated",
    description: "The restaurant handled the dietary need well.",
  },
  {
    value: "partially_accommodated",
    label: "Partially",
    description: "Some options were available, but limitations remained.",
  },
  {
    value: "not_accommodated",
    label: "Couldn’t accommodate",
    description: "The restaurant could not meet the dietary need.",
  },
  {
    value: "reaction",
    label: "Reaction",
    description: "A reaction occurred after eating.",
  },
];


function getStringParam(
  value?: string | string[],
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}


function formatDietarySlug(
  value: string,
): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}


function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not checked yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}


async function openExternalUrl(
  url: string,
): Promise<void> {
  if (!url) {
    return;
  }

  const supported =
    await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
  }
}


export default function RestaurantDietaryScreen() {
  useAppTheme();

  const params = useLocalSearchParams<{
    placeId?: string | string[];
    dietarySlug?: string | string[];
    restaurantName?: string | string[];
    sourceUrl?: string | string[];
  }>();

  const placeId = getStringParam(
    params.placeId,
  );

  const dietarySlug = getStringParam(
    params.dietarySlug,
  );

  const fallbackRestaurantName =
    getStringParam(
      params.restaurantName,
    );

  const fallbackSourceUrl =
    getStringParam(
      params.sourceUrl,
    );

  const [
    details,
    setDetails,
  ] = useState<
    RestaurantDietaryDetailResponse | null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    outcome,
    setOutcome,
  ] = useState<DietaryReportOutcome>(
    "accommodated",
  );

  const [
    reportValues,
    setReportValues,
  ] = useState<
    Record<BooleanReportField, boolean>
  >({
    items_clearly_labeled: false,
    staff_understood: false,
    dedicated_fryer: false,
    separate_preparation_area: false,
    gloves_changed: false,
    cross_contact_concern: false,
    restaurant_could_not_accommodate: false,
    reaction_after_eating: false,
  });

  const [
    notes,
    setNotes,
  ] = useState("");

  const restaurantName =
    details?.restaurant_name
    || fallbackRestaurantName
    || "Restaurant";

  const dietaryLabel = useMemo(
    () => formatDietarySlug(
      dietarySlug,
    ),
    [dietarySlug],
  );

  const loadDetails = useCallback(
    async () => {
      if (!placeId || !dietarySlug) {
        setError(
          "Restaurant or dietary information is missing.",
        );
        setIsLoading(false);
        return;
      }

      try {
        setError(null);

        const response =
          await getRestaurantDietaryDetails(
            placeId,
            dietarySlug,
          );

        setDetails(response);

        if (response.my_report) {
          setOutcome(
            response.my_report.outcome,
          );

          setReportValues({
            items_clearly_labeled:
              response.my_report.items_clearly_labeled,
            staff_understood:
              response.my_report.staff_understood,
            dedicated_fryer:
              response.my_report.dedicated_fryer,
            separate_preparation_area:
              response.my_report.separate_preparation_area,
            gloves_changed:
              response.my_report.gloves_changed,
            cross_contact_concern:
              response.my_report.cross_contact_concern,
            restaurant_could_not_accommodate:
              response.my_report.restaurant_could_not_accommodate,
            reaction_after_eating:
              response.my_report.reaction_after_eating,
          });

          setNotes(
            response.my_report.notes,
          );
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load dietary details.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      dietarySlug,
      placeId,
    ],
  );

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  function toggleReportField(
    field: BooleanReportField,
  ) {
    setReportValues(
      (currentValues) => ({
        ...currentValues,
        [field]: !currentValues[field],
      }),
    );
  }

  function selectOutcome(
    nextOutcome: DietaryReportOutcome,
  ) {
    setOutcome(nextOutcome);

    if (nextOutcome === "reaction") {
      setReportValues(
        (currentValues) => ({
          ...currentValues,
          cross_contact_concern: true,
          reaction_after_eating: true,
        }),
      );
    }

    if (
      nextOutcome
      === "not_accommodated"
    ) {
      setReportValues(
        (currentValues) => ({
          ...currentValues,
          restaurant_could_not_accommodate:
            true,
        }),
      );
    }
  }

  async function submitReport() {
    if (!placeId || !dietarySlug) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const payload:
        SubmitRestaurantDietaryReportInput = {
          restaurant_name:
            restaurantName,
          dietary_slug:
            dietarySlug,
          outcome,
          ...reportValues,
          notes: notes.trim(),
        };

      await submitRestaurantDietaryReport(
        placeId,
        payload,
      );

      setSuccessMessage(
        "Your dietary report was saved.",
      );

      await loadDetails();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to save your dietary report.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const officialSourceUrl =
    details?.official
      ?.official_source_url
    || fallbackSourceUrl;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />

          <Text style={styles.loadingText}>
            Loading dietary details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>
            Dietary Details
          </Text>

          <Text
            style={styles.topBarSubtitle}
            numberOfLines={1}
          >
            {dietaryLabel}
          </Text>
        </View>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <ShieldCheck
              size={32}
              color={themeColor("#FFFFFF", "color")}
            />
          </View>

          <Text style={styles.heroTitle}>
            {restaurantName}
          </Text>

          <Text style={styles.heroSubtitle}>
            {dietaryLabel}
          </Text>
        </View>

        {details?.official ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeading}>
              <ShieldCheck
                size={21}
                color={themeColor("#168B4F", "color")}
              />

              <Text style={styles.sectionTitle}>
                Official evidence
              </Text>
            </View>

            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>
                Confidence
              </Text>

              <Text style={styles.confidenceValue}>
                {
                  details.official
                    .confidence_score
                }%
              </Text>
            </View>

            {details.official.dedicated_facility && (
              <View style={styles.evidenceRow}>
                <CheckCircle2
                  size={16}
                  color={themeColor("#168B4F", "color")}
                />

                <Text style={styles.evidenceText}>
                  Official source describes a dedicated facility.
                </Text>
              </View>
            )}

            {details.official.evidence.map(
              (evidence) => (
                <View
                  key={evidence.id}
                  style={styles.evidenceRow}
                >
                  <CheckCircle2
                    size={16}
                    color={themeColor("#168B4F", "color")}
                  />

                  <Text style={styles.evidenceText}>
                    {evidence.summary}
                  </Text>
                </View>
              ),
            )}

            {details.official.menu_items.length
              > 0 && (
              <View style={styles.menuSection}>
                <Text style={styles.menuTitle}>
                  Menu findings
                </Text>

                {details.official.menu_items.map(
                  (item) => (
                    <View
                      key={item}
                      style={styles.menuItemRow}
                    >
                      <View style={styles.menuDot} />

                      <Text style={styles.menuItemText}>
                        {item}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            )}

            <Text style={styles.lastCheckedText}>
              Last checked{" "}
              {formatDate(
                details.official
                  .last_checked_at,
              )}
            </Text>

            {!!officialSourceUrl && (
              <Pressable
                onPress={() =>
                  void openExternalUrl(
                    officialSourceUrl,
                  )
                }
                style={styles.sourceButton}
              >
                <ExternalLink
                  size={17}
                  color={themeColor("#F3344A", "color")}
                />

                <Text style={styles.sourceButtonText}>
                  Open official source
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.emptyOfficialCard}>
            <Text style={styles.emptyOfficialTitle}>
              No official evidence cached yet
            </Text>

            <Text style={styles.emptyOfficialText}>
              Community reports can still provide location-specific details.
            </Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <Users
              size={21}
              color={themeColor("#7C4DCC", "color")}
            />

            <Text style={styles.sectionTitle}>
              Pick Sum’N community
            </Text>
          </View>

          <View style={styles.communityStats}>
            <View style={styles.communityStat}>
              <Text style={styles.communityNumber}>
                {
                  details?.community_summary
                    .total_reports ?? 0
                }
              </Text>

              <Text style={styles.communityLabel}>
                Reports
              </Text>
            </View>

            <View style={styles.communityStat}>
              <Text style={styles.communityNumber}>
                {
                  details?.community_summary
                    .accommodated_count ?? 0
                }
              </Text>

              <Text style={styles.communityLabel}>
                Accommodated
              </Text>
            </View>

            <View style={styles.communityStat}>
              <Text
                style={[
                  styles.communityNumber,
                  styles.concernNumber,
                ]}
              >
                {
                  details?.community_summary
                    .concern_count ?? 0
                }
              </Text>

              <Text style={styles.communityLabel}>
                Concerns
              </Text>
            </View>
          </View>

          {!!details
            && details.recent_reports.length
            > 0 && (
            <View style={styles.reportList}>
              {details.recent_reports.map(
                (report) => (
                  <View
                    key={report.id}
                    style={styles.communityReport}
                  >
                    <Text
                      style={styles.reportAuthor}
                    >
                      {
                        report.user_display_name
                      }
                    </Text>

                    <Text
                      style={styles.reportOutcome}
                    >
                      {report.outcome
                        .replace(/_/g, " ")
                        .replace(
                          /\b\w/g,
                          (character) =>
                            character.toUpperCase(),
                        )}
                    </Text>

                    {!!report.notes && (
                      <Text style={styles.reportNotes}>
                        {report.notes}
                      </Text>
                    )}
                  </View>
                ),
              )}
            </View>
          )}
        </View>

        <View style={styles.reportForm}>
          <View style={styles.sectionHeading}>
            <MessageSquarePlus
              size={21}
              color={themeColor("#F3344A", "color")}
            />

            <Text style={styles.sectionTitle}>
              Share your experience
            </Text>
          </View>

          <Text style={styles.formDescription}>
            Report only what you personally experienced at this location.
          </Text>

          <Text style={styles.fieldHeading}>
            Overall outcome
          </Text>

          <View style={styles.outcomeList}>
            {OUTCOMES.map((option) => {
              const selected =
                outcome === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    selectOutcome(
                      option.value,
                    )
                  }
                  style={[
                    styles.outcomeCard,
                    selected
                      && styles.outcomeCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      selected
                        && styles.radioCircleSelected,
                    ]}
                  >
                    {selected && (
                      <View style={styles.radioDot} />
                    )}
                  </View>

                  <View style={styles.outcomeContent}>
                    <Text
                      style={[
                        styles.outcomeLabel,
                        selected
                          && styles.outcomeLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text
                      style={styles.outcomeDescription}
                    >
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldHeading}>
            What did you observe?
          </Text>

          {[...POSITIVE_OPTIONS, ...CONCERN_OPTIONS]
            .map((option) => {
              const selected =
                reportValues[
                  option.field
                ];

              return (
                <Pressable
                  key={option.field}
                  onPress={() =>
                    toggleReportField(
                      option.field,
                    )
                  }
                  style={[
                    styles.checkOption,
                    selected
                      && (
                        option.concern
                          ? styles.checkOptionConcern
                          : styles.checkOptionSelected
                      ),
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selected
                        && (
                          option.concern
                            ? styles.checkboxConcern
                            : styles.checkboxSelected
                        ),
                    ]}
                  >
                    {selected && (
                      <Check
                        size={15}
                        color={themeColor("#FFFFFF", "color")}
                        strokeWidth={3}
                      />
                    )}
                  </View>

                  <Text style={styles.checkOptionText}>
                    {option.label}
                  </Text>

                  {option.concern && (
                    <AlertTriangle
                      size={17}
                      color={themeColor("#A66B00", "color")}
                    />
                  )}
                </Pressable>
              );
            })}

          <Text style={styles.fieldHeading}>
            Optional notes
          </Text>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            placeholder="Add a short, factual note about your experience."
            placeholderTextColor={themeColor("#9298A2", "color")}
            style={styles.notesInput}
            textAlignVertical="top"
          />

          <Text style={styles.characterCount}>
            {notes.length}/500
          </Text>

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successCard}>
              <Text style={styles.successText}>
                {successMessage}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() =>
              void submitReport()
            }
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              isSubmitting
                && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={themeColor("#FFFFFF", "color")}
              />
            ) : (
              <Check
                size={20}
                color={themeColor("#FFFFFF", "color")}
                strokeWidth={3}
              />
            )}

            <Text style={styles.submitButtonText}>
              {details?.my_report
                ? "Update My Report"
                : "Submit Report"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = createThemedStyleSheet({
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
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
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

  topBarSpacer: {
    width: 42,
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  hero: {
    alignItems: "center",
    padding: 23,
    borderRadius: 25,
    backgroundColor: "#07111F",
  },

  heroIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#168B4F",
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },

  heroSubtitle: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "800",
    color: "#BFE2CF",
  },

  sectionCard: {
    marginTop: 15,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E3E6EA",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F2FAF5",
  },

  confidenceLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3C5146",
  },

  confidenceValue: {
    fontSize: 19,
    fontWeight: "900",
    color: "#168B4F",
  },

  evidenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 11,
  },

  evidenceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#3C5146",
  },

  menuSection: {
    marginTop: 15,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#F7F8FA",
  },

  menuTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#07111F",
  },

  menuItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },

  menuDot: {
    width: 6,
    height: 6,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: "#168B4F",
  },

  menuItemText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#4F5662",
  },

  lastCheckedText: {
    marginTop: 13,
    fontSize: 10,
    color: "#9298A2",
  },

  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 44,
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#F3B6BE",
    borderRadius: 14,
  },

  sourceButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },

  emptyOfficialCard: {
    marginTop: 15,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E3E6EA",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },

  emptyOfficialTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyOfficialText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },

  communityStats: {
    flexDirection: "row",
    gap: 9,
    marginTop: 15,
  },

  communityStat: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#F7F8FA",
  },

  communityNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#168B4F",
  },

  concernNumber: {
    color: "#A66B00",
  },

  communityLabel: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: "800",
    color: "#69707C",
    textAlign: "center",
  },

  reportList: {
    marginTop: 13,
    gap: 9,
  },

  communityReport: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 14,
  },

  reportAuthor: {
    fontSize: 12,
    fontWeight: "900",
    color: "#07111F",
  },

  reportOutcome: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "800",
    color: "#7C4DCC",
  },

  reportNotes: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 17,
    color: "#69707C",
  },

  reportForm: {
    marginTop: 15,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E3E6EA",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },

  formDescription: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "#69707C",
  },

  fieldHeading: {
    marginTop: 20,
    marginBottom: 9,
    fontSize: 13,
    fontWeight: "900",
    color: "#07111F",
  },

  outcomeList: {
    gap: 8,
  },

  outcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 15,
  },

  outcomeCardSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#FFF0F2",
  },

  radioCircle: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#B8BDC5",
    borderRadius: 999,
  },

  radioCircleSelected: {
    borderColor: "#F3344A",
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#F3344A",
  },

  outcomeContent: {
    flex: 1,
  },

  outcomeLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#343B46",
  },

  outcomeLabelSelected: {
    color: "#F3344A",
  },

  outcomeDescription: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "#69707C",
  },

  checkOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    marginBottom: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 14,
  },

  checkOptionSelected: {
    borderColor: "#9FD4B7",
    backgroundColor: "#F2FAF5",
  },

  checkOptionConcern: {
    borderColor: "#F0D79C",
    backgroundColor: "#FFF8E8",
  },

  checkbox: {
    width: 23,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#B8BDC5",
    borderRadius: 7,
  },

  checkboxSelected: {
    borderColor: "#168B4F",
    backgroundColor: "#168B4F",
  },

  checkboxConcern: {
    borderColor: "#A66B00",
    backgroundColor: "#A66B00",
  },

  checkOptionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#343B46",
  },

  notesInput: {
    minHeight: 110,
    padding: 13,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 15,
    fontSize: 13,
    lineHeight: 19,
    color: "#07111F",
    backgroundColor: "#FFFFFF",
  },

  characterCount: {
    marginTop: 5,
    fontSize: 9,
    color: "#9298A2",
    textAlign: "right",
  },

  errorCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9F2424",
    textAlign: "center",
  },

  successCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#E8F7EF",
  },

  successText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#168B4F",
    textAlign: "center",
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 55,
    marginTop: 18,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#69707C",
  },
});
