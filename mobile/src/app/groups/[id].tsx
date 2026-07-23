import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import {
  Swipeable,
} from "react-native-gesture-handler";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  Crown,
  LogOut,
  Pencil,
  Share2,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { getFriends } from "@/features/friends/friendsService";
import type { FriendListItem, FriendUser } from "@/features/friends/types";
import {
  inviteFriendsToGroup,
  deleteGroup,
  deleteGroupImage,
  getGroup,
  leaveGroup,
  removeGroupMember,
} from "@/features/groups/groupsService";
import type {
  DiningGroupDetail,
  DiningGroupMember,
} from "@/features/groups/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import { choosePhotoForCrop } from "@/services/photoPicker";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

function memberName(member: DiningGroupMember): string {
  const fullName = [member.user.first_name, member.user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return member.nickname || fullName || member.user.display_name || member.user.email;
}

function friendName(user: FriendUser): string {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user.display_name || user.email;
}

export default function GroupDetailScreen() {
  useAppTheme();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [group, setGroup] = useState<DiningGroupDetail | null>(null);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<number>>(new Set());
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);
  const [shareInviteOpen, setShareInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [
    removingMemberId,
    setRemovingMemberId,
  ] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const [loadedGroup, loadedFriends] = await Promise.all([
        getGroup(groupId),
        getFriends(),
      ]);
      setGroup(loadedGroup);
      setFriends(loadedFriends);
    } catch (requestError) {
      Alert.alert(
        "Unable to load group",
        getApiErrorMessage(
          requestError,
          "This group could not be loaded.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableFriends = useMemo(() => {
    const memberIds = new Set(
      group?.members.map((member) => member.user.id) || [],
    );

    return friends
      .filter((friend) => !memberIds.has(friend.user.id))
      .sort((a, b) => friendName(a.user).localeCompare(friendName(b.user)));
  }, [friends, group?.members]);

  if (isLoading || !group || !groupId) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={themeColor("#F3344A", "color")} />
          <Text style={styles.stateText}>Loading group...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canManage =
    group.current_user_role === "owner" ||
    group.current_user_role === "admin";

  const joinLink = `picksumn://join-group?code=${encodeURIComponent(group.join_code)}`;

  function toggleFriend(userId: number) {
    setSelectedFriendIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function inviteSelectedFriends() {
    const currentGroupId = groupId;

    if (!currentGroupId || selectedFriendIds.size === 0) {
      return;
    }

    try {
      setIsAdding(true);

      const result = await inviteFriendsToGroup(
        currentGroupId,
        [...selectedFriendIds],
      );
      setSelectedFriendIds(new Set());
      setInviteFriendsOpen(false);

      Alert.alert(
        "Invitations sent",
        result.detail,
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to invite friends",
        getApiErrorMessage(
          requestError,
          "The selected friends could not be invited.",
        ),
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function copyCode() {
    const currentGroup = group;

    if (!currentGroup) {
      return;
    }

    await Clipboard.setStringAsync(
      currentGroup.join_code,
    );

    setCopied(true);

    setTimeout(
      () => setCopied(false),
      1500,
    );
  }

  async function shareCode() {
    const currentGroup = group;

    if (!currentGroup) {
      return;
    }

    await Share.share({
      message:
        `Join my Pick Sum’N group "${currentGroup.name}".\n\n`
        + `${joinLink}\n\n`
        + `Join code: ${currentGroup.join_code}`,
    });
  }

  function managePhoto() {
    const currentGroup = group;
    const currentGroupId = groupId;

    if (
      !currentGroup
      || !currentGroupId
      || !canManage
    ) {
      return;
    }
    Alert.alert(
      currentGroup.image ? "Group Photo" : "Add Group Photo",
      "Choose what you would like to do.",
      [
        {
          text: "Choose Photo",
          onPress: () =>
            void choosePhotoForCrop({
              type: "group",
              groupId: currentGroupId,
            }),
        },
        ...(currentGroup.image
          ? [
              {
                text: "Remove Photo",
                style: "destructive" as const,
                onPress: async () => {
                  setGroup(
                    await deleteGroupImage(
                      currentGroupId,
                    ),
                  );
                },
              },
            ]
          : []),
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  function confirmDelete() {
    const currentGroupId = groupId;

    if (!currentGroupId) {
      return;
    }

    Alert.alert(
      "Delete this group?",
      "This will remove the group for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteGroup(currentGroupId);
              router.replace("/(tabs)/groups");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  function confirmLeave() {
    const currentGroupId = groupId;

    if (!currentGroupId) {
      return;
    }

    Alert.alert(
      "Leave group?",
      "You can rejoin later if you still have the join code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLeaving(true);
              await leaveGroup(currentGroupId);
              router.replace("/(tabs)/groups");
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ],
    );
  }

  function confirmRemoveMember(
    member: DiningGroupMember,
  ) {
    const currentGroupId = groupId;
    const currentGroup = group;

    if (
      !currentGroupId
      || !currentGroup
      || currentGroup.current_user_role
        !== "owner"
      || member.role === "owner"
    ) {
      return;
    }

    Alert.alert(
      "Remove member?",
      (
        `Are you sure you want to remove `
        + `${memberName(member)} from `
        + `${currentGroup.name}?`
      ),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingMemberId(
                member.id,
              );

              await removeGroupMember(
                currentGroupId,
                member.id,
              );

              setGroup(
                (currentGroup) => {
                  if (!currentGroup) {
                    return currentGroup;
                  }

                  return {
                    ...currentGroup,
                    member_count:
                      Math.max(
                        0,
                        currentGroup
                          .member_count
                        - 1,
                      ),
                    members:
                      currentGroup.members
                        .filter(
                          (currentMember) =>
                            currentMember.id
                            !== member.id,
                        ),
                  };
                },
              );
            } catch (requestError) {
              Alert.alert(
                "Unable to remove member",
                getApiErrorMessage(
                  requestError,
                  "This member could not be removed.",
                ),
              );
            } finally {
              setRemovingMemberId(
                null,
              );
            }
          },
        },
      ],
    );
  }


  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={23} color={themeColor("#07111F", "color")} />
        </Pressable>
        <Text style={styles.topTitle}>Group Details</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable onPress={managePhoto} disabled={!canManage} style={styles.photoWrap}>
            {group.image ? (
              <Image source={{ uri: group.image }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroFallback}>
                <Users size={34} color={themeColor("#F3344A", "color")} />
              </View>
            )}
            {canManage && (
              <View style={styles.cameraBadge}>
                <Camera size={15} color={themeColor("#FFFFFF", "color")} />
              </View>
            )}
          </Pressable>
          <Text style={styles.groupName}>{group.name}</Text>
          {!!group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}
          <Text style={styles.memberMeta}>
            {group.member_count} {group.member_count === 1 ? "member" : "members"}
          </Text>
          {canManage && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/groups/[id]/edit",
                  params: {
                    id: group.id,
                  },
                })
              }
              style={styles.editGroupButton}
            >
              <Pencil size={17} color={themeColor("#F3344A", "color")} />
              <Text style={styles.editGroupText}>
                Edit Group
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.eyebrow}>ADD PEOPLE</Text>

        {canManage && (
          <View style={styles.collapseCard}>
            <Pressable
              onPress={() => setInviteFriendsOpen(!inviteFriendsOpen)}
              style={styles.collapseHeader}
            >
              <View style={styles.collapseIcon}>
                <UserPlus size={21} color={themeColor("#F3344A", "color")} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collapseTitle}>Invite Friends</Text>
                <Text style={styles.collapseSubtitle}>
                  Send a group invitation to people in your Friends list
                </Text>
              </View>
              {inviteFriendsOpen ? (
                <ChevronUp size={20} color={themeColor("#69707C", "color")} />
              ) : (
                <ChevronDown size={20} color={themeColor("#69707C", "color")} />
              )}
            </Pressable>

            {inviteFriendsOpen && (
              <View style={styles.collapseBody}>
                {availableFriends.length === 0 ? (
                  <Text style={styles.emptyText}>
                    All of your friends are already in this group.
                  </Text>
                ) : (
                  availableFriends.map((friend) => {
                    const selected = selectedFriendIds.has(friend.user.id);
                    return (
                      <Pressable
                        key={friend.friendship_id}
                        onPress={() => toggleFriend(friend.user.id)}
                        style={styles.friendRow}
                      >
                        <Avatar
                          imageUrl={friend.user.avatar}
                          name={friendName(friend.user)}
                          size={42}
                        />
                        <Text style={styles.friendName}>{friendName(friend.user)}</Text>
                        <View
                          style={[
                            styles.selectCircle,
                            selected && styles.selectCircleSelected,
                          ]}
                        >
                          {selected && <Check size={15} color={themeColor("#FFFFFF", "color")} />}
                        </View>
                      </Pressable>
                    );
                  })
                )}

                {availableFriends.length > 0 && (
                  <Pressable
                    onPress={() => void inviteSelectedFriends()}
                    disabled={selectedFriendIds.size === 0 || isAdding}
                    style={[
                      styles.addButton,
                      selectedFriendIds.size === 0 && styles.disabled,
                    ]}
                  >
                    <Text style={styles.addButtonText}>
                      {isAdding
                        ? "Sending..."
                        : `Invite ${selectedFriendIds.size} Friend${selectedFriendIds.size === 1 ? "" : "s"}`}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.collapseCard}>
          <Pressable
            onPress={() => setShareInviteOpen(!shareInviteOpen)}
            style={styles.collapseHeader}
          >
            <View style={styles.collapseIcon}>
              <Share2 size={21} color={themeColor("#F3344A", "color")} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.collapseTitle}>Share Group Invite</Text>
              <Text style={styles.collapseSubtitle}>
                QR code, join code, and share link
              </Text>
            </View>
            {shareInviteOpen ? (
              <ChevronUp size={20} color={themeColor("#69707C", "color")} />
            ) : (
              <ChevronDown size={20} color={themeColor("#69707C", "color")} />
            )}
          </Pressable>

          {shareInviteOpen && (
            <View style={styles.shareBody}>
              <View style={styles.qrBox}>
                <QRCode
                  value={joinLink}
                  size={170}
                  color={themeColor("#07111F", "color")}
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={styles.code}>{group.join_code}</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={() => void copyCode()} style={styles.primary}>
                  {copied ? (
                    <Check size={18} color={themeColor("#FFFFFF", "color")} />
                  ) : (
                    <Copy size={18} color={themeColor("#FFFFFF", "color")} />
                  )}
                  <Text style={styles.primaryText}>
                    {copied ? "Copied" : "Copy Code"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => void shareCode()} style={styles.secondary}>
                  <Share2 size={18} color={themeColor("#F3344A", "color")} />
                  <Text style={styles.secondaryText}>Share</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <View style={styles.membersHeader}>
          <View>
            <Text style={styles.eyebrow}>DINNER CREW</Text>
            <Text style={styles.membersTitle}>Members</Text>
          </View>
          <Text style={styles.memberCount}>{group.member_count}</Text>
        </View>

        {[...group.members]
          .sort((a, b) =>
            memberName(a).localeCompare(
              memberName(b),
            ),
          )
          .map((member) => {
            const canRemove =
              group.current_user_role
                === "owner"
              && member.role
                !== "owner";

            const memberCard = (
              <View
                style={styles.memberCard}
              >
                <Avatar
                  imageUrl={
                    member.user.avatar
                  }
                  name={memberName(
                    member,
                  )}
                  size={47}
                />

                <View
                  style={styles.memberInfo}
                >
                  <View
                    style={styles.memberNameRow}
                  >
                    {member.role
                    === "owner" ? (
                      <Crown
                        size={17}
                        color={themeColor("#E3A008", "color")}
                      />
                    ) : (
                      <User
                        size={17}
                        color={themeColor("#69707C", "color")}
                      />
                    )}

                    <Text
                      style={styles.friendName}
                    >
                      {memberName(member)}
                    </Text>
                  </View>

                  <Text
                    style={styles.roleText}
                  >
                    {member.role_display}
                  </Text>
                </View>

                {removingMemberId
                === member.id ? (
                  <ActivityIndicator
                    size="small"
                    color={themeColor("#F3344A", "color")}
                  />
                ) : canRemove ? (
                  <View
                    style={styles.swipeHint}
                  >
                    <ChevronLeft
                      size={18}
                      color={themeColor("#9298A2", "color")}
                    />
                  </View>
                ) : null}
              </View>
            );

            if (!canRemove) {
              return (
                <View key={member.id}>
                  {memberCard}
                </View>
              );
            }

            return (
              <Swipeable
                key={member.id}
                overshootRight={false}
                rightThreshold={36}
                renderRightActions={() => (
                  <Pressable
                    onPress={() =>
                      confirmRemoveMember(
                        member,
                      )
                    }
                    disabled={
                      removingMemberId
                      === member.id
                    }
                    style={
                      styles.removeAction
                    }
                  >
                    <Trash2
                      size={21}
                      color={themeColor("#FFFFFF", "color")}
                    />

                    <Text
                      style={
                        styles.removeActionText
                      }
                    >
                      Remove
                    </Text>
                  </Pressable>
                )}
              >
                {memberCard}
              </Swipeable>
            );
          })}

        {group.current_user_role === "owner" ? (
          <Pressable
            onPress={confirmDelete}
            disabled={isDeleting}
            style={styles.dangerButton}
          >
            <Trash2 size={20} color={themeColor("#C62828", "color")} />
            <Text style={styles.dangerText}>
              {isDeleting ? "Deleting..." : "Delete Group"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={confirmLeave}
            disabled={isLeaving}
            style={styles.dangerButton}
          >
            <LogOut size={20} color={themeColor("#C62828", "color")} />
            <Text style={styles.dangerText}>
              {isLeaving ? "Leaving..." : "Leave Group"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet({
  screen: { flex: 1, backgroundColor: "#FFF9F2" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: 1, borderBottomColor: "#ECEDEF" },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFFFFF" },
  topTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  content: { padding: 20, paddingBottom: 44 },
  hero: { alignItems: "center", padding: 22, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 24, backgroundColor: "#FFFFFF" },
  photoWrap: { position: "relative" },
  heroImage: { width: 88, height: 88, borderRadius: 44 },
  heroFallback: { width: 88, height: 88, alignItems: "center", justifyContent: "center", borderRadius: 44, backgroundColor: "#FFF0F2" },
  cameraBadge: { position: "absolute", right: -2, bottom: -2, width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#F3344A" },
  groupName: { marginTop: 15, fontSize: 27, fontWeight: "900", color: "#07111F" },
  description: { marginTop: 6, fontSize: 14, lineHeight: 20, color: "#69707C", textAlign: "center" },
  memberMeta: { marginTop: 10, fontSize: 12, fontWeight: "800", color: "#F3344A" },
  editGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  editGroupText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },
  eyebrow: { marginTop: 24, marginBottom: 8, fontSize: 11, fontWeight: "900", letterSpacing: 1.1, color: "#F3344A" },
  collapseCard: { marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 20, backgroundColor: "#FFFFFF" },
  collapseHeader: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15 },
  collapseIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#FFF0F2" },
  collapseTitle: { fontSize: 15, fontWeight: "900", color: "#07111F" },
  collapseSubtitle: { marginTop: 3, fontSize: 11, color: "#69707C" },
  collapseBody: { paddingHorizontal: 15, paddingBottom: 15 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  friendName: { flex: 1, fontSize: 15, fontWeight: "900", color: "#07111F" },
  selectCircle: { width: 26, height: 26, borderWidth: 2, borderColor: "#CDD1D7", borderRadius: 13 },
  selectCircleSelected: { alignItems: "center", justifyContent: "center", borderColor: "#F3344A", backgroundColor: "#F3344A" },
  addButton: { minHeight: 47, alignItems: "center", justifyContent: "center", marginTop: 10, borderRadius: 14, backgroundColor: "#F3344A" },
  addButtonText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.4 },
  emptyText: { fontSize: 12, lineHeight: 18, color: "#69707C" },
  shareBody: { alignItems: "center", padding: 16, paddingTop: 4 },
  qrBox: { padding: 12, borderRadius: 18, backgroundColor: "#FFFFFF" },
  code: { marginTop: 15, fontSize: 25, fontWeight: "900", letterSpacing: 5, color: "#07111F" },
  actionRow: { flexDirection: "row", gap: 9, width: "100%", marginTop: 15 },
  primary: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, backgroundColor: "#F3344A" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  secondary: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: "#F3344A", borderRadius: 14 },
  secondaryText: { color: "#F3344A", fontWeight: "900" },
  membersHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  membersTitle: { fontSize: 24, fontWeight: "900", color: "#07111F" },
  memberCount: { fontSize: 18, fontWeight: "900", color: "#F3344A" },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 9, padding: 14, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  removeAction: {
    width: 96,
    minHeight: 75,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 9,
    marginLeft: 8,
    borderRadius: 18,
    backgroundColor: "#D62828",
  },
  removeActionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  memberInfo: { flex: 1 },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  swipeHint: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: { marginTop: 3, fontSize: 11, color: "#69707C" },
  dangerButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 26, borderWidth: 1.5, borderColor: "#E8A7A7", borderRadius: 16, backgroundColor: "#FFF4F4" },
  dangerText: { color: "#C62828", fontWeight: "900" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { color: "#69707C", fontWeight: "700" },
});
