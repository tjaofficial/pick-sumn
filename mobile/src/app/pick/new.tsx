import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
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
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/features/auth/AuthContext";
import { getFriends } from "@/features/friends/friendsService";
import type { FriendListItem, FriendUser } from "@/features/friends/types";
import { getGroup, getGroups } from "@/features/groups/groupsService";
import type {
  DiningGroup,
  DiningGroupDetail,
  DiningGroupMember,
} from "@/features/groups/types";
import { usePickDraft } from "@/features/pickSessions/PickDraftContext";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

function friendName(user: FriendUser): string {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user.display_name || user.email;
}

function memberName(member: DiningGroupMember): string {
  const fullName = [member.user.first_name, member.user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return member.nickname || fullName || member.user.display_name || member.user.email;
}

export default function PickPeopleScreen() {
  const { user } = useAuth();
  const { draft, updatePeople } = usePickDraft();

  const [groups, setGroups] = useState<DiningGroup[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DiningGroupDetail | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<number>>(
    new Set(draft.participantIds),
  );
  const [justMe, setJustMe] = useState(draft.isJustMe);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [loadedGroups, loadedFriends] = await Promise.all([
          getGroups(),
          getFriends(),
        ]);

        setGroups(
          [...loadedGroups].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setFriends(loadedFriends);

        if (draft.groupId && !draft.isJustMe) {
          setSelectedGroup(await getGroup(draft.groupId));
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load your groups and friends.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) =>
        friendName(a.user).localeCompare(friendName(b.user)),
      ),
    [friends],
  );

  async function selectGroup(group: DiningGroup) {
    try {
      setError(null);
      setJustMe(false);
      const detail = await getGroup(group.id);
      setSelectedGroup(detail);
      setSelectedParticipantIds(
        new Set(
          detail.members
            .filter((member) => member.user.id !== user?.id)
            .map((member) => member.user.id),
        ),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load this group.",
        ),
      );
    }
  }

  function selectJustMe() {
    setJustMe(true);
    setSelectedGroup(null);
    setSelectedParticipantIds(new Set());
    setError(null);
  }

  function toggleFriend(friend: FriendListItem) {
    const switchingFromGroup =
      Boolean(selectedGroup) || justMe;

    setJustMe(false);
    setSelectedGroup(null);

    setSelectedParticipantIds((current) => {
      const next = switchingFromGroup
        ? new Set<number>()
        : new Set(current);

      if (next.has(friend.user.id)) {
        next.delete(friend.user.id);
      } else {
        next.add(friend.user.id);
      }

      return next;
    });
  }

  function toggleGroupMember(userId: number) {
    setSelectedParticipantIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function handleSave() {
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

    const participantIds = [...selectedParticipantIds];

    if (selectedGroup) {
      updatePeople({
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        participantIds,
        participantNames: selectedGroup.members
          .filter(
            (member) =>
              member.user.id !== user?.id &&
              selectedParticipantIds.has(member.user.id),
          )
          .map(memberName),
        isJustMe: false,
      });
      router.replace("/(tabs)/pick");
      return;
    }

    if (participantIds.length < 1) {
      setError("Choose a group, one or more friends, or Just Me.");
      return;
    }

    updatePeople({
      groupId: null,
      groupName: "Friends",
      participantIds,
      participantNames: sortedFriends
        .filter((friend) => selectedParticipantIds.has(friend.user.id))
        .map((friend) => friendName(friend.user)),
      isJustMe: false,
    });
    router.replace("/(tabs)/pick");
  }

  const canSave = justMe || Boolean(selectedGroup) || selectedParticipantIds.size > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#F3344A" />
          <Text style={styles.loadingText}>Loading your people...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={23} color="#07111F" />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Who’s Eating?</Text>
          <Text style={styles.topBarSubtitle}>Choose today’s crew</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Users size={31} color="#F3344A" />
          </View>
          <Text style={styles.heading}>Who are you eating with?</Text>
          <Text style={styles.description}>
            Choose one group or select multiple friends for this session.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>QUICK PICK</Text>
        <ChoiceCard
          title="Just Me"
          subtitle="Find something based only on your taste."
          selected={justMe}
          onPress={selectJustMe}
          icon={
            <CircleUserRound
              size={26}
              color={justMe ? "#FFFFFF" : "#F3344A"}
            />
          }
        />

        <Text style={styles.sectionLabel}>YOUR GROUPS</Text>
        <View style={styles.list}>
          {groups.map((group) => {
            const selected = selectedGroup?.id === group.id;
            return (
              <ChoiceCard
                key={group.id}
                title={group.name}
                subtitle={`${group.member_count} ${group.member_count === 1 ? "member" : "members"}`}
                selected={selected}
                onPress={() => void selectGroup(group)}
                icon={
                  group.image ? (
                    <Image source={{ uri: group.image }} style={styles.groupImage} />
                  ) : (
                    <Users size={25} color={selected ? "#FFFFFF" : "#F3344A"} />
                  )
                }
              />
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>YOUR FRIENDS</Text>
        {sortedFriends.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyText}>
              Add friends from your Profile to quickly Pick Sum’N together.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedFriends.map((friend) => {
              const selected =
                !selectedGroup &&
                !justMe &&
                selectedParticipantIds.has(friend.user.id);
              return (
                <Pressable
                  key={friend.friendship_id}
                  onPress={() => toggleFriend(friend)}
                  style={[
                    styles.friendCard,
                    selected && styles.friendCardSelected,
                  ]}
                >
                  <Avatar
                    imageUrl={friend.user.avatar}
                    name={friendName(friend.user)}
                    size={46}
                  />
                  <Text style={styles.friendName}>{friendName(friend.user)}</Text>
                  <View
                    style={[
                      styles.checkCircle,
                      selected && styles.checkCircleSelected,
                    ]}
                  >
                    {selected && <Check size={16} color="#FFFFFF" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {selectedGroup && (
          <View style={styles.memberSection}>
            <Text style={styles.memberSectionTitle}>
              Who is joining from {selectedGroup.name}?
            </Text>
            {selectedGroup.members
              .filter((member) => member.user.id !== user?.id)
              .sort((a, b) => memberName(a).localeCompare(memberName(b)))
              .map((member) => {
                const selected = selectedParticipantIds.has(member.user.id);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => toggleGroupMember(member.user.id)}
                    style={styles.friendCard}
                  >
                    <Avatar
                      imageUrl={member.user.avatar}
                      name={memberName(member)}
                      size={44}
                    />
                    <Text style={styles.friendName}>{memberName(member)}</Text>
                    <View
                      style={[
                        styles.checkCircle,
                        selected && styles.checkCircleSelected,
                      ]}
                    >
                      {selected && <Check size={16} color="#FFFFFF" />}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
          ]}
        >
          <Check size={21} color="#FFFFFF" />
          <Text style={styles.saveText}>Save People</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChoiceCard({
  title,
  subtitle,
  selected,
  onPress,
  icon,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceCard,
        selected && styles.choiceCardSelected,
      ]}
    >
      <View
        style={[
          styles.choiceIcon,
          selected && styles.choiceIconSelected,
        ]}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.choiceTitle,
            selected && styles.choiceTitleSelected,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.choiceSubtitle,
            selected && styles.choiceSubtitleSelected,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <View
        style={[
          styles.checkCircle,
          selected && styles.checkCircleSelected,
        ]}
      >
        {selected && <Check size={16} color="#FFFFFF" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  topBarCenter: { alignItems: "center" },
  topBarTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  topBarSubtitle: { marginTop: 2, fontSize: 11, color: "#9298A2" },
  spacer: { width: 42 },
  content: { padding: 20, paddingBottom: 50 },
  intro: { alignItems: "center", marginBottom: 24 },
  introIcon: { width: 68, height: 68, alignItems: "center", justifyContent: "center", borderRadius: 23, backgroundColor: "#FFF0F2" },
  heading: { marginTop: 14, fontSize: 27, fontWeight: "900", color: "#07111F", textAlign: "center" },
  description: { maxWidth: 350, marginTop: 7, fontSize: 14, lineHeight: 21, color: "#69707C", textAlign: "center" },
  sectionLabel: { marginTop: 18, marginBottom: 10, fontSize: 11, fontWeight: "900", letterSpacing: 1.1, color: "#F3344A" },
  list: { gap: 9 },
  choiceCard: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, padding: 14, borderWidth: 1, borderColor: "#E1E3E7", borderRadius: 20, backgroundColor: "#FFFFFF" },
  choiceCardSelected: { borderColor: "#F3344A", backgroundColor: "#F3344A" },
  choiceIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 16, backgroundColor: "#FFF0F2" },
  choiceIconSelected: { backgroundColor: "rgba(255,255,255,0.18)" },
  groupImage: { width: 48, height: 48 },
  choiceTitle: { fontSize: 16, fontWeight: "900", color: "#07111F" },
  choiceTitleSelected: { color: "#FFFFFF" },
  choiceSubtitle: { marginTop: 3, fontSize: 12, color: "#69707C" },
  choiceSubtitleSelected: { color: "#FFE7EA" },
  friendCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  friendCardSelected: { borderColor: "#F3344A", backgroundColor: "#FFF3F5" },
  friendName: { flex: 1, fontSize: 15, fontWeight: "900", color: "#07111F" },
  checkCircle: { width: 27, height: 27, borderWidth: 2, borderColor: "#CDD1D7", borderRadius: 14 },
  checkCircleSelected: { alignItems: "center", justifyContent: "center", borderColor: "#F3344A", backgroundColor: "#F3344A" },
  memberSection: { marginTop: 24, gap: 9 },
  memberSectionTitle: { marginBottom: 2, fontSize: 18, fontWeight: "900", color: "#07111F" },
  emptyCard: { padding: 18, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: "#07111F" },
  emptyText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#69707C" },
  errorCard: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: "#FFF1F1" },
  errorText: { color: "#9F2424", fontWeight: "700", textAlign: "center" },
  saveButton: { minHeight: 57, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 25, borderRadius: 18, backgroundColor: "#F3344A" },
  saveButtonDisabled: { backgroundColor: "#B8BDC5" },
  saveText: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#69707C", fontWeight: "700" },
});
