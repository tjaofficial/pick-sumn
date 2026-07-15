import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  Ban,
  ChevronRight,
  Clock3,
  Dices,
  History,
  MapPin,
  RefreshCw,
  Shuffle,
  Store,
  Users,
  Vote,
  WalletCards,
  Utensils,
} from "lucide-react-native";
import {
  ActivityIndicator,
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
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/features/auth/AuthContext";
import {
  usePickDraft,
} from "@/features/pickSessions/PickDraftContext";
import {
  createPickSession,
  getActivePickSessions,
  getRecentPickSessions,
  startPickSessionMatching,
} from "@/features/pickSessions/pickSessionsService";
import type {
  DecisionMode,
  PickSession,
} from "@/features/pickSessions/types";
import {
  getApiErrorMessage,
} from "@/services/getApiErrorMessage";


function roundCoordinate(
  value: number | null,
): number | null {
  if (value === null) {
    return null;
  }

  return Number(
    value.toFixed(6),
  );
}


export default function PickScreen() {
  const { user } = useAuth();
  const { draft } = usePickDraft();

  const [
    activeSessions,
    setActiveSessions,
  ] = useState<PickSession[]>([]);

  const [
    recentSessions,
    setRecentSessions,
  ] = useState<PickSession[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    creatingMode,
    setCreatingMode,
  ] = useState<DecisionMode | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadSessions = useCallback(
    async () => {
      try {
        setError(null);

        const [
          active,
          recent,
        ] = await Promise.all([
          getActivePickSessions(),
          getRecentPickSessions(),
        ]);

        setActiveSessions(active);
        setRecentSessions(recent);
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your Pick Sum’N sessions.",
          ),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  const peopleSelected =
    draft.isJustMe
    || Boolean(draft.groupId);

  const filtersSelected =
    Boolean(
      draft.locationLabel.trim(),
    );

  const canStart =
    peopleSelected
    && filtersSelected
    && creatingMode === null;

  const hostName =
    user?.display_name
    || user?.first_name
    || user?.email
    || "You";

  const peopleSubtitle =
    useMemo(() => {
      if (!peopleSelected) {
        return (
          "Choose a group or start by yourself."
        );
      }

      if (draft.isJustMe) {
        return `${hostName} · Just me`;
      }

      const participantCount =
        draft.participantIds.length + 1;

      return `${draft.groupName} · ${participantCount} ${
        participantCount === 1
          ? "person"
          : "people"
      }`;
    }, [
      draft.groupName,
      draft.isJustMe,
      draft.participantIds.length,
      hostName,
      peopleSelected,
    ]);

  const confidence = useMemo(() => {
    if (!peopleSelected) {
      return 0;
    }

    if (!filtersSelected) {
      return 42;
    }

    let score = 78;

    if (
      draft.participantIds.length > 0
    ) {
      score += 7;
    }

    if (draft.openNow) {
      score += 3;
    }

    if (draft.includeDelivery) {
      score += 2;
    }

    if (
      draft.includeDriveThrough
    ) {
      score += 2;
    }

    if (draft.somethingNew) {
      score += 3;
    }

    return Math.min(
      score,
      95,
    );
  }, [
    draft.includeDelivery,
    draft.includeDriveThrough,
    draft.openNow,
    draft.participantIds.length,
    draft.somethingNew,
    filtersSelected,
    peopleSelected,
  ]);

  async function handleRefresh() {
    setIsRefreshing(true);

    await loadSessions();
  }

  function openSession(
    session: PickSession,
  ) {
    router.navigate({
      pathname:
        "/pick-sessions/[id]",
      params: {
        id: session.id,
      },
    });
  }

  function openActiveSession() {
    const session =
      activeSessions[0];

    if (!session) {
      setError(
        "You do not have an active session right now.",
      );

      return;
    }

    openSession(session);
  }

  async function createSession(
    decisionMode: DecisionMode,
  ) {
    if (!peopleSelected) {
      setError(
        "Choose who is eating before starting.",
      );

      return;
    }

    if (!filtersSelected) {
      setError(
        "Set your current filters before starting.",
      );

      return;
    }

    try {
      setCreatingMode(
        decisionMode,
      );

      setError(null);

      const title =
        draft.isJustMe
          ? "My Pick Session"
          : `${draft.groupName} Pick`;

      const session =
        await createPickSession({
          title,

          group_id:
            draft.groupId || null,

          participant_ids:
            draft.participantIds,

          decision_mode:
            decisionMode,

          location_label:
            draft.locationLabel.trim(),

          latitude:
            roundCoordinate(
              draft.latitude,
            ),

          longitude:
            roundCoordinate(
              draft.longitude,
            ),

          search_radius_miles:
            draft.searchRadiusMiles,

          price_min:
            draft.priceMin,

          price_max:
            draft.priceMax,

          open_now:
            draft.openNow,

          include_delivery:
            draft.includeDelivery,

          include_drive_through:
            draft.includeDriveThrough,

          something_new:
            draft.somethingNew,

          cuisine_ids:
            draft.cuisineIds,
        });

      await startPickSessionMatching(
        session.id,
      );

      router.replace({
        pathname:
          "/(tabs)/matches",
        params: {
          sessionId:
            session.id,

          decisionMode,
        },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to start matching.",
        ),
      );
    } finally {
      setCreatingMode(null);
    }
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
            Loading Pick Sum’N...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
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
            onRefresh={handleRefresh}
            tintColor="#F3344A"
          />
        }
      >
        <Image
          source={require(
            "../../../assets/images/pick-sumn-logo.png"
          )}
          style={styles.logo}
          resizeMode="contain"
        />

        <Pressable
          onPress={() =>
            router.navigate(
              "/pick/new",
            )
          }
          style={({ pressed }) => [
            styles.peopleCard,
            pressed
              && styles.cardPressed,
          ]}
        >
          <View
            style={styles.peopleIcon}
          >
            <Users
              size={29}
              color="#F3344A"
            />
          </View>

          <View
            style={styles.peopleContent}
          >
            <Text
              style={styles.peopleTitle}
            >
              Who’s Eating?
            </Text>

            <Text
              style={
                styles.peopleSubtitle
              }
              numberOfLines={1}
            >
              {peopleSubtitle}
            </Text>
          </View>

          <ChevronRight
            size={23}
            color="#9298A2"
          />
        </Pressable>

        <Pressable
          onPress={() =>
            router.navigate(
              "/pick/setup",
            )
          }
          style={({ pressed }) => [
            styles.filtersCard,
            pressed
              && styles.cardPressed,
          ]}
        >
          <View
            style={
              styles.filtersHeadingRow
            }
          >
            <Text
              style={
                styles.filtersHeading
              }
            >
              Current Filters
            </Text>

            <ChevronRight
              size={22}
              color="#9298A2"
            />
          </View>

          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <View
                style={
                  styles.filterIconCircle
                }
              >
                <Utensils
                  size={21}
                  color="#F3344A"
                />
              </View>

              <Text
                style={styles.filterLabel}
              >
                Cuisines
              </Text>

              <Text
                style={styles.filterValue}
              >
                Any
              </Text>
            </View>

            <View style={styles.filterItem}>
              <View
                style={
                  styles.filterIconCircle
                }
              >
                <WalletCards
                  size={21}
                  color="#168B4F"
                />
              </View>

              <Text
                style={styles.filterLabel}
              >
                Price Range
              </Text>

              <Text
                style={styles.filterValue}
              >
                {"$".repeat(
                  draft.priceMin,
                )}
                {"–"}
                {"$".repeat(
                  draft.priceMax,
                )}
              </Text>
            </View>

            <View style={styles.filterItem}>
              <View
                style={
                  styles.filterIconCircle
                }
              >
                <MapPin
                  size={21}
                  color="#168B4F"
                />
              </View>

              <Text
                style={styles.filterLabel}
              >
                Distance
              </Text>

              <Text
                style={styles.filterValue}
              >
                {filtersSelected
                  ? `${draft.searchRadiusMiles} mi`
                  : "Not set"}
              </Text>
            </View>

            <View style={styles.filterItem}>
              <View
                style={
                  styles.filterIconCircle
                }
              >
                <Store
                  size={21}
                  color="#07111F"
                />
              </View>

              <Text
                style={styles.filterLabel}
              >
                Dining Type
              </Text>

              <Text
                style={styles.filterValue}
              >
                {draft.includeDriveThrough
                  ? "Drive-through"
                  : draft.includeDelivery
                    ? "Delivery"
                    : "Any"}
              </Text>
            </View>

            <View style={styles.filterItem}>
              <View
                style={
                  styles.filterIconCircle
                }
              >
                <Clock3
                  size={21}
                  color="#168B4F"
                />
              </View>

              <Text
                style={styles.filterLabel}
              >
                Open Now
              </Text>

              <Text
                style={styles.filterValue}
              >
                {draft.openNow
                  ? "Yes"
                  : "No"}
              </Text>
            </View>

            <View style={styles.filterItem}>
              <View
                style={
                  styles.filterIconCircle
                }
              >
                <Ban
                  size={21}
                  color="#F3344A"
                />
              </View>

              <Text
                style={styles.filterLabel}
              >
                Something New
              </Text>

              <Text
                style={styles.filterValue}
              >
                {draft.somethingNew
                  ? "Preferred"
                  : "Any"}
              </Text>
            </View>
          </View>
        </Pressable>

        <View
          style={
            styles.confidenceSection
          }
        >
          <Text
            style={
              styles.confidenceLabel
            }
          >
            Match Confidence
          </Text>

          <Text
            style={
              styles.confidenceNumber
            }
          >
            {confidence}%
          </Text>

          <Text
            style={
              styles.confidenceMessage
            }
          >
            {!peopleSelected
              ? "Choose who’s eating to get started."
              : !filtersSelected
                ? "Add your location and filters."
                : "Great matches ahead!"}
          </Text>
        </View>

        <View style={styles.decisionRow}>
          <Pressable
            onPress={() =>
              void createSession(
                "pick_for_us",
              )
            }
            disabled={!canStart}
            style={({ pressed }) => [
              styles.sideDecisionButton,

              !canStart
                && styles.disabledButton,

              pressed
                && canStart
                && styles.pressedButton,
            ]}
          >
            {creatingMode
              === "pick_for_us" ? (
              <ActivityIndicator
                size="small"
                color="#07111F"
              />
            ) : (
              <Shuffle
                size={30}
                color="#07111F"
              />
            )}

            <Text
              style={
                styles.sideDecisionText
              }
            >
              Surprise{"\n"}Me
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              void createSession(
                "ranked",
              )
            }
            disabled={!canStart}
            style={({ pressed }) => [
              styles.pickButtonOuter,

              !canStart
                && styles.pickButtonDisabled,

              pressed
                && canStart
                && styles.pickButtonPressed,
            ]}
          >
            <View
              style={
                styles.pickButtonInner
              }
            >
              {creatingMode
                === "ranked" ? (
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Dices
                    size={52}
                    color="#FFFFFF"
                    strokeWidth={2.5}
                  />

                  <Text
                    style={
                      styles.pickButtonText
                    }
                  >
                    PICK SUM’N
                  </Text>
                </>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() =>
              void createSession(
                "group_vote",
              )
            }
            disabled={!canStart}
            style={({ pressed }) => [
              styles.sideDecisionButton,

              !canStart
                && styles.disabledButton,

              pressed
                && canStart
                && styles.pressedButton,
            ]}
          >
            {creatingMode
              === "group_vote" ? (
              <ActivityIndicator
                size="small"
                color="#07111F"
              />
            ) : (
              <Vote
                size={30}
                color="#07111F"
              />
            )}

            <Text
              style={
                styles.sideDecisionText
              }
            >
              Group{"\n"}Vote
            </Text>
          </Pressable>
        </View>

        <Text
          style={styles.tapInstruction}
        >
          Tap the button to find your top
          matches!
        </Text>

        {!canStart
          && creatingMode === null && (
          <Text
            style={
              styles.unlockMessage
            }
          >
            Select who’s eating and set your
            current filters to unlock the
            buttons.
          </Text>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              onPress={() =>
                setError(null)
              }
            >
              <Text
                style={styles.dismissText}
              >
                Dismiss
              </Text>
            </Pressable>
          </View>
        )}

        <View
          style={
            styles.bottomShortcutRow
          }
        >
          <Pressable
            onPress={openActiveSession}
            style={({ pressed }) => [
              styles.bottomShortcut,
              pressed
                && styles.cardPressed,
            ]}
          >
            <View
              style={
                styles.shortcutHeading
              }
            >
              <Clock3
                size={21}
                color="#F3344A"
              />

              <Text
                style={
                  styles.shortcutTitle
                }
              >
                Active Session
              </Text>
            </View>

            <Text
              style={
                styles.shortcutDescription
              }
            >
              {activeSessions.length > 0
                ? `${activeSessions.length} session${
                    activeSessions.length
                    === 1
                      ? ""
                      : "s"
                  } in progress`
                : "No active session"}
            </Text>

            <ChevronRight
              size={20}
              color="#F3344A"
              style={
                styles.shortcutArrow
              }
            />
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                "/pick/recent",
              )
            }
            style={({ pressed }) => [
              styles.bottomShortcut,
              pressed
                && styles.cardPressed,
            ]}
          >
            <View
              style={
                styles.shortcutHeading
              }
            >
              <History
                size={21}
                color="#F3344A"
              />

              <Text
                style={
                  styles.shortcutTitle
                }
              >
                Recent Picks
              </Text>
            </View>

            <Text
              style={
                styles.shortcutDescription
              }
            >
              {recentSessions.length > 0
                ? `${recentSessions.length} recent pick${
                    recentSessions.length
                    === 1
                      ? ""
                      : "s"
                  }`
                : "Nothing picked yet"}
            </Text>

            <ChevronRight
              size={20}
              color="#F3344A"
              style={
                styles.shortcutArrow
              }
            />
          </Pressable>
        </View>

        <Pressable
          onPress={() =>
            void loadSessions()
          }
          style={styles.refreshButton}
        >
          <RefreshCw
            size={15}
            color="#777E89"
          />

          <Text
            style={styles.refreshText}
          >
            Refresh sessions
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFDFB",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 38,
  },

  logo: {
    width: 236,
    height: 142,
    alignSelf: "center",
    marginTop: -11,
    marginBottom: -7,
  },

  peopleCard: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 17,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 13,
    elevation: 3,
  },

  peopleIcon: {
    width: 53,
    height: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#FFF0F2",
  },

  peopleContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 10,
  },

  peopleTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  peopleSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#69707C",
  },

  filtersCard: {
    marginBottom: 14,
    paddingHorizontal: 17,
    paddingTop: 15,
    paddingBottom: 17,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 13,
    elevation: 3,
  },

  filtersHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filtersHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },

  cardPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.995,
      },
    ],
  },

  filterGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  filterItem: {
    width: "16%",
    alignItems: "center",
  },

  filterIconCircle: {
    width: 41,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E7E9ED",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },

  filterLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  filterValue: {
    marginTop: 3,
    fontSize: 9,
    color: "#4F5662",
    textAlign: "center",
  },

  confidenceSection: {
    alignItems: "center",
    marginTop: 4,
  },

  confidenceLabel: {
    fontSize: 18,
    fontWeight: "900",
    color: "#07111F",
  },

  confidenceNumber: {
    marginTop: 3,
    fontSize: 42,
    fontWeight: "900",
    color: "#239B45",
  },

  confidenceMessage: {
    marginTop: -3,
    fontSize: 13,
    color: "#69707C",
  },

  decisionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 17,
  },

  sideDecisionButton: {
    width: 92,
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },

  sideDecisionText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    color: "#07111F",
    textAlign: "center",
  },

  pickButtonOuter: {
    width: 151,
    height: 151,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FF9A38",
    borderRadius: 76,
    backgroundColor: "#FFF2E8",
    shadowColor: "#F3344A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },

  pickButtonInner: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 66,
    backgroundColor: "#F3344A",
  },

  pickButtonText: {
    marginTop: 7,
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.42,
  },

  pickButtonDisabled: {
    opacity: 0.45,
  },

  pressedButton: {
    opacity: 0.8,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  pickButtonPressed: {
    transform: [
      {
        scale: 0.96,
      },
    ],
  },

  tapInstruction: {
    marginTop: 13,
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "700",
    color: "#07111F",
    textAlign: "center",
  },

  unlockMessage: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 16,
    color: "#777E89",
    textAlign: "center",
  },

  errorCard: {
    alignItems: "center",
    marginTop: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F3C5C5",
    borderRadius: 17,
    backgroundColor: "#FFF1F1",
  },

  errorText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9F2424",
    textAlign: "center",
  },

  dismissText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: "900",
    color: "#C62828",
  },

  bottomShortcutRow: {
    flexDirection: "row",
    gap: 11,
    marginTop: 22,
  },

  bottomShortcut: {
    flex: 1,
    minHeight: 92,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
  },

  shortcutHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  shortcutTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#07111F",
  },

  shortcutDescription: {
    marginTop: 8,
    paddingRight: 20,
    fontSize: 11,
    lineHeight: 16,
    color: "#69707C",
  },

  shortcutArrow: {
    position: "absolute",
    right: 12,
    bottom: 13,
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
  },

  refreshText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#777E89",
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