import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleUserRound,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/features/auth/AuthContext";
import {
  Avatar,
} from "@/components/ui/Avatar";
import {
  getGroup,
  getGroups,
} from "@/features/groups/groupsService";
import type {
  DiningGroup,
  DiningGroupDetail,
  DiningGroupMember,
} from "@/features/groups/types";
import {
  usePickDraft,
} from "@/features/pickSessions/PickDraftContext";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/pick");
}

function getMemberName(
  member: DiningGroupMember,
): string {
  return (
    member.nickname ||
    member.user.display_name ||
    member.user.email
  );
}

export default function PickPeopleScreen() {
  const { user } = useAuth();

  const {
    draft,
    updatePeople,
  } = usePickDraft();

  const [groups, setGroups] = useState<
    DiningGroup[]
  >([]);

  const [
    selectedGroup,
    setSelectedGroup,
  ] = useState<DiningGroupDetail | null>(
    null,
  );

  const [
    selectedParticipantIds,
    setSelectedParticipantIds,
  ] = useState<Set<number>>(
    new Set(draft.participantIds),
  );

  const [justMe, setJustMe] = useState(
    draft.isJustMe,
  );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingGroup,
    setIsLoadingGroup,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setError(null);

        const results = await getGroups();
        setGroups(results);

        if (
          draft.groupId &&
          !draft.isJustMe
        ) {
          const detail = await getGroup(
            draft.groupId,
          );

          setSelectedGroup(detail);
          setSelectedParticipantIds(
            new Set(draft.participantIds),
          );
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your groups.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialData();
  }, [
    draft.groupId,
    draft.isJustMe,
    draft.participantIds,
  ]);

  async function selectGroup(
    group: DiningGroup,
  ) {
    try {
      setIsLoadingGroup(true);
      setError(null);
      setJustMe(false);

      const detail = await getGroup(group.id);

      setSelectedGroup(detail);

      const participantIds = detail.members
        .filter(
          (member) =>
            member.user.id !== user?.id,
        )
        .map(
          (member) => member.user.id,
        );

      setSelectedParticipantIds(
        new Set(participantIds),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load this group.",
        ),
      );
    } finally {
      setIsLoadingGroup(false);
    }
  }

  function selectJustMe() {
    setJustMe(true);
    setSelectedGroup(null);
    setSelectedParticipantIds(
      new Set(),
    );
    setError(null);
  }

  function toggleParticipant(
    userId: number,
  ) {
    setSelectedParticipantIds(
      (currentSelections) => {
        const next = new Set(
          currentSelections,
        );

        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }

        return next;
      },
    );
  }

  function handleSave() {
    if (!justMe && !selectedGroup) {
      setError(
        "Choose who you are eating with.",
      );
      return;
    }

    if (justMe) {
      updatePeople({
        groupId: null,
        groupName: "Just Me",
        participantIds: [],
        participantNames: [],
        isJustMe: true,
      });

      router.replace("/(tabs)/pick");
      return;
    }

    if (!selectedGroup) {
      return;
    }

    const participantIds = [
      ...selectedParticipantIds,
    ];

    const participantNames =
      selectedGroup.members
        .filter(
          (member) =>
            member.user.id !== user?.id &&
            selectedParticipantIds.has(
              member.user.id,
            ),
        )
        .map(getMemberName);

    updatePeople({
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      participantIds,
      participantNames,
      isJustMe: false,
    });

    router.replace("/(tabs)/pick");
  }

  const canSave =
    justMe || Boolean(selectedGroup);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text style={styles.loadingText}>
            Loading your dinner crews...
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

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>
            Who’s Eating?
          </Text>

          <Text style={styles.topBarSubtitle}>
            Choose today’s crew
          </Text>
        </View>

        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Users
              size={31}
              color="#F3344A"
              strokeWidth={2.2}
            />
          </View>

          <Text style={styles.heading}>
            Who are you eating with?
          </Text>

          <Text style={styles.description}>
            Choose a group, then select who
            is actually joining this session.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>
          QUICK PICK
        </Text>

        <Pressable
          onPress={selectJustMe}
          style={[
            styles.optionCard,
            justMe &&
              styles.optionCardSelected,
          ]}
        >
          <View
            style={[
              styles.optionIcon,
              justMe &&
                styles.optionIconSelected,
            ]}
          >
            <CircleUserRound
              size={26}
              color={
                justMe
                  ? "#FFFFFF"
                  : "#F3344A"
              }
            />
          </View>

          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionTitle,
                justMe &&
                  styles.optionTitleSelected,
              ]}
            >
              Just Me
            </Text>

            <Text
              style={[
                styles.optionDescription,
                justMe &&
                  styles.optionDescriptionSelected,
              ]}
            >
              Find something based only on
              your taste.
            </Text>
          </View>

          <View
            style={[
              styles.checkCircle,
              justMe &&
                styles.checkCircleSelected,
            ]}
          >
            {justMe && (
              <Check
                size={17}
                color="#FFFFFF"
                strokeWidth={3}
              />
            )}
          </View>
        </Pressable>

        <Text style={styles.sectionLabel}>
          YOUR GROUPS
        </Text>

        {groups.length > 0 ? (
          <View style={styles.groupList}>
            {groups.map((group) => {
              const selected =
                selectedGroup?.id ===
                group.id;

              return (
                <Pressable
                  key={group.id}
                  onPress={() =>
                    void selectGroup(group)
                  }
                  style={[
                    styles.optionCard,
                    selected &&
                      styles.optionCardSelected,
                  ]}
                >
                  {group.image ? (
                    <Image
                      source={{
                        uri: group.image,
                      }}
                      style={styles.groupImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.optionIcon,
                        selected &&
                          styles.optionIconSelected,
                      ]}
                    >
                      <Users
                        size={25}
                        color={
                          selected
                            ? "#FFFFFF"
                            : "#F3344A"
                        }
                      />
                    </View>
                  )}

                  <View
                    style={
                      styles.optionContent
                    }
                  >
                    <Text
                      style={[
                        styles.optionTitle,
                        selected &&
                          styles.optionTitleSelected,
                      ]}
                    >
                      {group.name}
                    </Text>

                    <Text
                      style={[
                        styles.optionDescription,
                        selected &&
                          styles.optionDescriptionSelected,
                      ]}
                    >
                      {group.member_count}{" "}
                      {group.member_count === 1
                        ? "member"
                        : "members"}
                    </Text>
                  </View>

                  {isLoadingGroup &&
                  selected ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <ChevronRight
                      size={21}
                      color={
                        selected
                          ? "#FFFFFF"
                          : "#9298A2"
                      }
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No groups yet
            </Text>

            <Text style={styles.emptyText}>
              Continue alone or create a group
              from the Groups tab.
            </Text>
          </View>
        )}

        {selectedGroup && (
          <View
            style={
              styles.participantSection
            }
          >
            <Text
              style={
                styles.participantTitle
              }
            >
              Who is eating today?
            </Text>

            <Text
              style={
                styles.participantDescription
              }
            >
              You are always included as the
              session host.
            </Text>

            <View style={styles.memberCard}>
              <Avatar
                imageUrl={user?.avatar}
                name={
                  user?.display_name
                  || user?.email
                  || "You"
                }
                size={45}
                shape="circle"
              />

              <View
                style={styles.memberContent}
              >
                <Text
                  style={styles.memberName}
                >
                  {user?.display_name ||
                    user?.email ||
                    "You"}
                </Text>

                <Text
                  style={styles.hostText}
                >
                  Host · Always included
                </Text>
              </View>

              <View
                style={styles.lockedCheck}
              >
                <Check
                  size={16}
                  color="#FFFFFF"
                  strokeWidth={3}
                />
              </View>
            </View>

            {selectedGroup.members
              .filter(
                (member) =>
                  member.user.id !==
                  user?.id,
              )
              .map((member) => {
                const selected =
                  selectedParticipantIds.has(
                    member.user.id,
                  );

                return (
                  <Pressable
                    key={member.id}
                    onPress={() =>
                      toggleParticipant(
                        member.user.id,
                      )
                    }
                    style={
                      styles.memberCard
                    }
                  >
                    <Avatar
                      imageUrl={
                        member.user.avatar
                      }
                      name={
                        getMemberName(
                          member,
                        )
                      }
                      size={45}
                      shape="circle"
                    />

                    <View
                      style={
                        styles.memberContent
                      }
                    >
                      <Text
                        style={
                          styles.memberName
                        }
                      >
                        {getMemberName(
                          member,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.memberEmail
                        }
                      >
                        {member.user.email}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.selectCircle,
                        selected &&
                          styles.selectCircleSelected,
                      ]}
                    >
                      {selected && (
                        <Check
                          size={16}
                          color="#FFFFFF"
                          strokeWidth={3}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[
            styles.saveButton,
            !canSave &&
              styles.saveButtonDisabled,
          ]}
        >
          <Check
            size={21}
            color="#FFFFFF"
            strokeWidth={2.8}
          />

          <Text style={styles.saveText}>
            Save People
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

  intro: {
    alignItems: "center",
    marginBottom: 26,
  },

  introIcon: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#FFF0F2",
  },

  heading: {
    marginTop: 14,
    fontSize: 27,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  description: {
    maxWidth: 350,
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#69707C",
    textAlign: "center",
  },

  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#F3344A",
  },

  groupList: {
    gap: 10,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minHeight: 78,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E1E3E7",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  optionCardSelected: {
    borderColor: "#F3344A",
    backgroundColor: "#F3344A",
  },

  optionIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFF0F2",
  },

  groupImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  optionIconSelected: {
    backgroundColor:
      "rgba(255,255,255,0.18)",
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  optionTitleSelected: {
    color: "#FFFFFF",
  },

  optionDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "#69707C",
  },

  optionDescriptionSelected: {
    color: "#FFE7EA",
  },

  checkCircle: {
    width: 27,
    height: 27,
    borderWidth: 2,
    borderColor: "#CDD1D7",
    borderRadius: 14,
  },

  checkCircleSelected: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#FFFFFF",
    backgroundColor:
      "rgba(255,255,255,0.2)",
  },

  participantSection: {
    marginTop: 27,
  },

  participantTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#07111F",
  },

  participantDescription: {
    marginTop: 5,
    marginBottom: 13,
    fontSize: 13,
    color: "#69707C",
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  memberContent: {
    flex: 1,
    marginLeft: 11,
  },

  memberName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  memberEmail: {
    marginTop: 3,
    fontSize: 11,
    color: "#777E89",
  },

  hostText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
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

  lockedCheck: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#07111F",
  },

  emptyCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
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
    minHeight: 57,
    marginTop: 25,
    borderRadius: 18,
    backgroundColor: "#F3344A",
  },

  saveButtonDisabled: {
    backgroundColor: "#B8BDC5",
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