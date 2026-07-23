import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Crown,
  MapPin,
  RefreshCw,
  Star,
  Trophy,
  Users,
  Vote,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  finishGroupVote,
  getGroupVote,
  getPickSessionNotifications,
  markPickSessionNotificationRead,
  submitGroupVote,
} from "@/features/pickSessions/pickSessionsService";
import type {
  GroupVoteOption,
  GroupVoteState,
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


function getPriceText(
  option: GroupVoteOption,
): string {
  const priceNumber =
    option.restaurant.price_number;

  if (
    typeof priceNumber === "number"
  ) {
    return priceNumber === 0
      ? "Free"
      : "$".repeat(priceNumber);
  }

  return "Price unavailable";
}


export default function GroupVoteScreen() {
  useAppTheme();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const sessionId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [
    state,
    setState,
  ] = useState<GroupVoteState | null>(
    null,
  );

  const [
    selectedOptionId,
    setSelectedOptionId,
  ] = useState<string | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  const requestSequence =
    useRef(0);

  const isMounted =
    useRef(true);


  const loadVote = useCallback(
    async (
      showRefreshState = false,
    ) => {
      if (!sessionId) {
        setError(
          "The Group Vote ID is missing.",
        );

        setIsLoading(false);
        setIsRefreshing(false);

        return;
      }

      const requestId =
        ++requestSequence.current;

      if (showRefreshState) {
        setIsRefreshing(true);
      }

      try {
        const result =
          await getGroupVote(
            sessionId,
          );

        if (
          !isMounted.current
          || requestId
          !== requestSequence.current
        ) {
          return;
        }

        setError(null);
        setState(result);

        setSelectedOptionId(
          (currentSelection) =>
            currentSelection
            ?? result.my_vote_option_id,
        );
      } catch (requestError) {
        if (
          !isMounted.current
          || requestId
          !== requestSequence.current
        ) {
          return;
        }

        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load this Group Vote.",
          ),
        );
      } finally {
        if (
          isMounted.current
          && requestId
          === requestSequence.current
        ) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [sessionId],
  );


  useEffect(() => {
    isMounted.current = true;

    void loadVote();

    async function markVoteNotificationsRead() {
      if (!sessionId) {
        return;
      }

      try {
        const response =
          await getPickSessionNotifications();

        const matchingUnread =
          response.notifications.filter(
            (notification) =>
              !notification.is_read
              && notification.session_id
                === sessionId,
          );

        await Promise.all(
          matchingUnread.map(
            (notification) =>
              markPickSessionNotificationRead(
                notification.id,
              ),
          ),
        );
      } catch {
        // The vote screen should still work if notification cleanup fails.
      }
    }

    void markVoteNotificationsRead();

    const interval = setInterval(
      () => {
        if (
          state?.session.status
          !== "completed"
          && !isSubmitting
        ) {
          void loadVote();
        }
      },
      2000,
    );

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [
    isSubmitting,
    loadVote,
    state?.session.status,
  ]);


  const winner = useMemo(
    () =>
      state?.options.find(
        (option) =>
          option.id
          === state.winner_option_id,
      ) ?? null,
    [
      state?.options,
      state?.winner_option_id,
    ],
  );


  async function handleSubmitVote() {
    if (
      !sessionId
      || !selectedOptionId
    ) {
      setError(
        "Choose a restaurant before submitting your vote.",
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      ++requestSequence.current;

      const result =
        await submitGroupVote(
          sessionId,
          selectedOptionId,
        );

      setState(result);
      setSelectedOptionId(
        result.my_vote_option_id,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to submit your vote.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  async function performFinishVote() {
    if (!sessionId) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      ++requestSequence.current;

      const result =
        await finishGroupVote(
          sessionId,
        );

      setState(result);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to finish the vote.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  function handleFinishVote() {
    Alert.alert(
      "Finish Group Vote?",
      (
        "The restaurant with the most votes "
        + "will become the final pick. Ties "
        + "use the highest match score."
      ),
      [
        {
          text: "Keep Voting",
          style: "cancel",
        },
        {
          text: "Finish Vote",
          onPress: () => {
            void performFinishVote();
          },
        },
      ],
    );
  }


  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />

          <Text style={styles.loadingText}>
            Loading the Group Vote...
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  if (!state) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Vote unavailable
          </Text>

          <Text style={styles.errorMessage}>
            {error
              || "This vote could not be loaded."}
          </Text>

          <Pressable
            onPress={() =>
              void loadVote()
            }
            style={styles.retryButton}
          >
            <RefreshCw
              size={18}
              color={themeColor("#FFFFFF", "color")}
            />

            <Text
              style={styles.retryText}
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  const completed =
    state.session.status
    === "completed";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() =>
            router.replace(
              "/(tabs)/pick",
            )
          }
          style={styles.topBarButton}
        >
          <ArrowLeft
            size={23}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          {completed
            ? "Vote Results"
            : "Group Vote"}
        </Text>

        <Pressable
          onPress={() =>
            void loadVote()
          }
          style={styles.topBarButton}
        >
          <RefreshCw
            size={20}
            color={themeColor("#07111F", "color")}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadVote(true);
            }}
            tintColor={themeColor("#F3344A", "color")}
          />
        }
      >
        <View style={styles.hero}>
          {completed ? (
            <Trophy
              size={38}
              color={themeColor("#FFE18A", "color")}
            />
          ) : (
            <Vote
              size={38}
              color={themeColor("#FFFFFF", "color")}
            />
          )}

          <Text style={styles.heroTitle}>
            {completed
              ? "The group picked Sum’N!"
              : state.session.title}
          </Text>

          <Text
            style={styles.heroDescription}
          >
            {completed
              ? winner?.name
                || state.session
                  .selected_restaurant_name
              : (
                  `${state.total_votes} of `
                  + `${state.eligible_voter_count} `
                  + "votes submitted"
                )}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Users
              size={18}
              color={themeColor("#F3344A", "color")}
            />

            <Text style={styles.summaryValue}>
              {state.eligible_voter_count}
            </Text>

            <Text style={styles.summaryLabel}>
              Voters
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Check
              size={18}
              color={themeColor("#168B4F", "color")}
            />

            <Text style={styles.summaryValue}>
              {state.total_votes}
            </Text>

            <Text style={styles.summaryLabel}>
              Submitted
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <MapPin
              size={18}
              color={themeColor("#3A72D8", "color")}
            />

            <Text
              style={styles.summaryLocation}
              numberOfLines={1}
            >
              {
                state.session
                  .location_label
              }
            </Text>

            <Text style={styles.summaryLabel}>
              Area
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {completed
            ? "Final Results"
            : "Choose one restaurant"}
        </Text>

        <View style={styles.optionList}>
          {state.options.map(
            (option) => {
              const selected =
                selectedOptionId
                === option.id;

              const isWinner =
                state.winner_option_id
                === option.id;

              return (
                <Pressable
                  key={option.id}
                  disabled={completed}
                  onPress={() =>
                    setSelectedOptionId(
                      option.id,
                    )
                  }
                  style={[
                    styles.optionCard,
                    selected
                      && styles.selectedCard,
                    isWinner
                      && styles.winnerCard,
                  ]}
                >
                  <View
                    style={styles.photoBox}
                  >
                    {option.restaurant
                      .photo_url ? (
                      <Image
                        source={{
                          uri:
                            option.restaurant
                              .photo_url,
                        }}
                        style={styles.photo}
                      />
                    ) : (
                      <View
                        style={
                          styles.photoFallback
                        }
                      >
                        <Vote
                          size={28}
                          color={themeColor("#F3344A", "color")}
                        />
                      </View>
                    )}

                    <View
                      style={styles.rankBadge}
                    >
                      <Text
                        style={
                          styles.rankText
                        }
                      >
                        #{option.rank}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.optionBody}>
                    <View
                      style={
                        styles.optionHeading
                      }
                    >
                      <Text
                        style={
                          styles.optionName
                        }
                        numberOfLines={2}
                      >
                        {option.name}
                      </Text>

                      <Text
                        style={
                          styles.matchScore
                        }
                      >
                        {option.match_score}%
                      </Text>
                    </View>

                    <View
                      style={styles.metaRow}
                    >
                      <Star
                        size={14}
                        color={themeColor("#E3A008", "color")}
                        fill="#E3A008"
                      />

                      <Text
                        style={styles.metaText}
                      >
                        {option.restaurant
                          .rating !== null
                          ? option.restaurant
                            .rating.toFixed(1)
                          : "No rating"}
                      </Text>

                      <Text
                        style={styles.dot}
                      >
                        ·
                      </Text>

                      <Text
                        style={styles.metaText}
                      >
                        {getPriceText(option)}
                      </Text>

                      <Text
                        style={styles.dot}
                      >
                        ·
                      </Text>

                      <Text
                        style={styles.metaText}
                      >
                        {option.restaurant
                          .distance_miles
                          !== null
                          ? (
                              `${option.restaurant
                                .distance_miles
                                .toFixed(1)} mi`
                            )
                          : "Distance unavailable"}
                      </Text>
                    </View>

                    <View
                      style={styles.voteRow}
                    >
                      <Text
                        style={
                          styles.voteCount
                        }
                      >
                        {option.vote_count}{" "}
                        vote
                        {option.vote_count
                        === 1
                          ? ""
                          : "s"}
                      </Text>

                      {isWinner ? (
                        <View
                          style={
                            styles.winnerActions
                          }
                        >
                          <View
                            style={
                              styles.winnerBadge
                            }
                          >
                            <Crown
                              size={14}
                              color={themeColor("#9A6C00", "color")}
                            />

                            <Text
                              style={
                                styles.winnerText
                              }
                            >
                              Winner
                            </Text>
                          </View>

                          <Pressable
                            onPress={() =>
                              router.replace({
                                pathname:
                                  "/restaurants/[sessionId]/[optionId]",
                                params: {
                                  sessionId:
                                    state.session.id,
                                  optionId:
                                    option.id,
                                },
                              })
                            }
                            style={
                              styles.viewButton
                            }
                          >
                            <Text
                              style={
                                styles.viewButtonText
                              }
                            >
                              View
                            </Text>

                            <ChevronRight
                              size={14}
                              color={themeColor("#FFFFFF", "color")}
                            />
                          </Pressable>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.selectCircle,
                            selected
                              && styles
                                .selectCircleSelected,
                          ]}
                        >
                          {selected && (
                            <Check
                              size={16}
                              color={themeColor("#FFFFFF", "color")}
                              strokeWidth={3}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            },
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {!completed && (
          <Pressable
            onPress={() =>
              void handleSubmitVote()
            }
            disabled={
              !selectedOptionId
              || isSubmitting
            }
            style={[
              styles.submitButton,
              (
                !selectedOptionId
                || isSubmitting
              )
              && styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={themeColor("#FFFFFF", "color")}
              />
            ) : (
              <Check
                size={21}
                color={themeColor("#FFFFFF", "color")}
                strokeWidth={3}
              />
            )}

            <Text style={styles.submitText}>
              {state.my_vote_option_id
                ? "Update My Vote"
                : "Submit My Vote"}
            </Text>
          </Pressable>
        )}

        {!completed
          && state.session.is_host && (
          <Pressable
            onPress={handleFinishVote}
            disabled={
              state.total_votes === 0
              || isSubmitting
            }
            style={[
              styles.finishButton,
              (
                state.total_votes === 0
                || isSubmitting
              )
              && styles.finishDisabled,
            ]}
          >
            <Trophy
              size={20}
              color={themeColor("#F3344A", "color")}
            />

            <Text style={styles.finishText}>
              Finish Vote
            </Text>
          </Pressable>
        )}
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

  topBarButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  topBarTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
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

  heroTitle: {
    marginTop: 12,
    fontSize: 25,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },

  heroDescription: {
    marginTop: 6,
    fontSize: 14,
    color: "#F7A4AE",
    textAlign: "center",
  },

  summaryRow: {
    flexDirection: "row",
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  summaryLocation: {
    maxWidth: 100,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "900",
    color: "#07111F",
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "800",
    color: "#69707C",
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 11,
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
  },

  optionList: {
    gap: 11,
  },

  optionCard: {
    flexDirection: "row",
    padding: 9,
    borderWidth: 1,
    borderColor: "#E2E5EA",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  selectedCard: {
    borderWidth: 2,
    borderColor: "#F3344A",
    backgroundColor: "#FFF7F8",
  },

  winnerCard: {
    borderWidth: 2,
    borderColor: "#E3A008",
    backgroundColor: "#FFF9E8",
  },

  photoBox: {
    position: "relative",
    width: 104,
    height: 104,
    overflow: "hidden",
    borderRadius: 15,
    backgroundColor: "#FFF0F2",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  photoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  rankBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F3344A",
  },

  rankText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  optionBody: {
    flex: 1,
    marginLeft: 11,
  },

  optionHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  optionName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    color: "#07111F",
  },

  matchScore: {
    fontSize: 13,
    fontWeight: "900",
    color: "#168B4F",
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
  },

  metaText: {
    fontSize: 10,
    color: "#69707C",
  },

  dot: {
    fontSize: 10,
    color: "#A2A7AF",
  },

  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },

  voteCount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },

  selectCircle: {
    width: 27,
    height: 27,
    borderWidth: 2,
    borderColor: "#CDD1D7",
    borderRadius: 14,
  },

  selectCircleSelected: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },

  winnerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  winnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF1B8",
  },

  winnerText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#9A6C00",
  },

  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F3344A",
  },

  viewButtonText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 57,
    marginTop: 22,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  submitText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  disabledButton: {
    backgroundColor: "#B8BDC5",
  },

  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    marginTop: 11,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  finishDisabled: {
    opacity: 0.5,
  },

  finishText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#F3344A",
  },

  errorCard: {
    marginTop: 17,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    color: "#9F2424",
    fontWeight: "700",
    textAlign: "center",
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
    maxWidth: 340,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 9,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F3344A",
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
