import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  Check,
  Copy,
  Crown,
  LogOut,
  Share2,
  ShieldCheck,
  User,
  Users,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  deleteGroupImage,
  getGroup,
  leaveGroup,
} from "@/features/groups/groupsService";
import {
  Avatar,
} from "@/components/ui/Avatar";
import type {
  DiningGroupDetail,
  DiningGroupMember,
} from "@/features/groups/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import {
  choosePhotoForCrop,
} from "@/services/photoPicker";

function getRoleIcon(role: DiningGroupMember["role"]) {
  if (role === "owner") {
    return (
      <Crown
        size={18}
        color="#D99A00"
        fill="#FFE18A"
      />
    );
  }

  if (role === "admin") {
    return (
      <ShieldCheck
        size={18}
        color="#3A72D8"
      />
    );
  }

  return (
    <User
      size={18}
      color="#69707C"
    />
  );
}

function getMemberName(member: DiningGroupMember): string {
  return (
    member.nickname ||
    member.user.display_name ||
    member.user.email
  );
}

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const groupId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [group, setGroup] =
    useState<DiningGroupDetail | null>(null);

  const joinLink = group
    ? `picksumn://join-group?code=${encodeURIComponent(
        group.join_code,
      )}`
    : "";

  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!groupId) {
      setError("The group ID is missing.");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const result = await getGroup(groupId);
      setGroup(result);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load this group.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  async function handleCopyCode() {
    if (!group) {
      return;
    }

    await Clipboard.setStringAsync(group.join_code);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  async function handleShareCode() {
  if (!group) {
    return;
  }

  await Share.share({
    message:
      `Join my Pick Sum’N group "${group.name}".\n\n` +
      `Open Pick Sum’N: ${joinLink}\n\n` +
      `Or enter join code: ${group.join_code}`,
  });
}

  function manageGroupPhoto() {
    if (
      !group
      || !groupId
      || !(
        group.current_user_role
        === "owner"
        || group.current_user_role
        === "admin"
      )
    ) {
      return;
    }

    Alert.alert(
      group.image
        ? "Group Photo"
        : "Add Group Photo",
      "Choose what you would like to do.",
      [
        {
          text: "Choose Photo",
          onPress: () => {
            void choosePhotoForCrop({
              type: "group",
              groupId,
            });
          },
        },
        ...(group.image
          ? [
              {
                text: "Remove Photo",
                style:
                  "destructive" as const,
                onPress: async () => {
                  try {
                    const result =
                      await deleteGroupImage(
                        groupId,
                      );

                    setGroup(result);
                  } catch (
                    requestError
                  ) {
                    Alert.alert(
                      "Unable to remove photo",
                      getApiErrorMessage(
                        requestError,
                        (
                          "The group photo "
                          + "could not be removed."
                        ),
                      ),
                    );
                  }
                },
              },
            ]
          : []),
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  }


  async function performLeave() {
    if (!groupId) {
      return;
    }

    try {
      setIsLeaving(true);

      await leaveGroup(groupId);

      router.replace("/(tabs)/groups");
    } catch (requestError) {
      Alert.alert(
        "Unable to leave group",
        getApiErrorMessage(
          requestError,
          "The group could not be left.",
        ),
      );
    } finally {
      setIsLeaving(false);
    }
  }

  function handleLeave() {
    Alert.alert(
      group?.current_user_role === "owner"
        ? "Leave this group?"
        : "Leave group?",
      group?.current_user_role === "owner"
        ? (
            "Owners must transfer ownership before leaving " +
            "a group that still has other active members."
          )
        : "You can rejoin later if you still have the code.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: performLeave,
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#F3344A"
          />

          <Text style={styles.stateText}>
            Loading group...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Group unavailable
          </Text>

          <Text style={styles.errorMessage}>
            {error ?? "This group could not be found."}
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>
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
          onPress={() => router.back()}
          style={styles.topBarButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft
            size={24}
            color="#07111F"
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          Group Details
        </Text>

        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        data={group.members}
        keyExtractor={(member) => String(member.id)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Pressable
                onPress={manageGroupPhoto}
                disabled={
                  !(
                    group.current_user_role
                    === "owner"
                    || group.current_user_role
                    === "admin"
                  )
                }
                style={
                  styles.heroImageButton
                }
              >
                {group.image ? (
                  <Image
                    source={{
                      uri: group.image,
                    }}
                    style={styles.heroImage}
                  />
                ) : (
                  <View style={styles.heroIcon}>
                    <Users
                      size={34}
                      color="#F3344A"
                      strokeWidth={2.2}
                    />
                  </View>
                )}

                {(
                  group.current_user_role
                  === "owner"
                  || group.current_user_role
                  === "admin"
                ) && (
                  <View
                    style={
                      styles.heroCameraBadge
                    }
                  >
                    <Camera
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                )}
              </Pressable>

              {(
                group.current_user_role
                === "owner"
                || group.current_user_role
                === "admin"
              ) && (
                <Pressable
                  onPress={manageGroupPhoto}
                >
                  <Text
                    style={
                      styles.groupPhotoAction
                    }
                  >
                    {group.image
                      ? "Change Group Photo"
                      : "Add Group Photo"}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.groupName}>
                {group.name}
              </Text>

              {!!group.description && (
                <Text style={styles.description}>
                  {group.description}
                </Text>
              )}

              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <CalendarClock
                    size={15}
                    color="#69707C"
                  />

                  <Text style={styles.badgeText}>
                    {group.group_type === "temporary"
                      ? "Temporary"
                      : "Permanent"}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Users
                    size={15}
                    color="#69707C"
                  />

                  <Text style={styles.badgeText}>
                    {group.member_count}{" "}
                    {group.member_count === 1
                      ? "member"
                      : "members"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.joinCard}>
              <Text style={styles.sectionEyebrow}>
                INVITE PEOPLE
              </Text>

              <Text style={styles.joinTitle}>
                Group Join Code
              </Text>

              <Text style={styles.joinDescription}>
                Share this code with anyone you want to
                add to the group.
              </Text>

              <View style={styles.qrSection}>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={joinLink}
                    size={164}
                    color="#07111F"
                    backgroundColor="#FFFFFF"
                    quietZone={4}
                  />
                </View>

                <Text style={styles.qrTitle}>
                  Scan to Join
                </Text>

                <Text style={styles.qrDescription}>
                  Open your phone’s camera and scan this code to join
                  the group in Pick Sum’N.
                </Text>
              </View>

              <View style={styles.codeDivider}>
                <View style={styles.codeDividerLine} />

                <Text style={styles.codeDividerText}>
                  OR USE THE CODE
                </Text>

                <View style={styles.codeDividerLine} />
              </View>

              <View style={styles.codeContainer}>
                <Text style={styles.code}>
                  {group.join_code}
                </Text>
              </View>

              <View style={styles.codeActions}>
                <Pressable
                  onPress={handleCopyCode}
                  style={styles.copyButton}
                >
                  {copied ? (
                    <Check
                      size={20}
                      color="#FFFFFF"
                    />
                  ) : (
                    <Copy
                      size={20}
                      color="#FFFFFF"
                    />
                  )}

                  <Text style={styles.copyButtonText}>
                    {copied ? "Copied" : "Copy Code"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShareCode}
                  style={styles.shareButton}
                >
                  <Share2
                    size={20}
                    color="#F3344A"
                  />

                  <Text style={styles.shareButtonText}>
                    Share
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.membersHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>
                  DINNER CREW
                </Text>

                <Text style={styles.membersTitle}>
                  Members
                </Text>
              </View>

              <Text style={styles.memberCount}>
                {group.member_count}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <Avatar
              imageUrl={item.user.avatar}
              name={getMemberName(item)}
              size={47}
              shape="circle"
            />

            <View style={styles.memberContent}>
              <Text style={styles.memberName}>
                {getMemberName(item)}
              </Text>

              <Text style={styles.memberEmail}>
                {item.user.email}
              </Text>
            </View>

            <View style={styles.roleContainer}>
              {getRoleIcon(item.role)}

              <Text style={styles.roleText}>
                {item.role_display}
              </Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListFooterComponent={
          <Pressable
            onPress={handleLeave}
            disabled={isLeaving}
            style={[
              styles.leaveButton,
              isLeaving && styles.leaveButtonDisabled,
            ]}
          >
            <LogOut
              size={20}
              color="#C62828"
            />

            <Text style={styles.leaveButtonText}>
              {isLeaving
                ? "Leaving..."
                : "Leave Group"}
            </Text>
          </Pressable>
        }
      />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
    backgroundColor: "#FFF9F2",
  },

  topBarButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },

  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#07111F",
  },

  topBarSpacer: {
    width: 42,
  },

  content: {
    padding: 20,
    paddingBottom: 44,
  },

  heroCard: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
  },

  heroImageButton: {
    position: "relative",
  },

  heroImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },

  heroCameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  groupPhotoAction: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "#F3344A",
  },

  heroIcon: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
    backgroundColor: "#FFF0F2",
  },

  groupName: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "900",
    color: "#07111F",
    textAlign: "center",
  },

  description: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 9,
    marginTop: 17,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F4F5F7",
  },

  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#69707C",
  },

  joinCard: {
    marginTop: 17,
    padding: 21,
    borderRadius: 24,
    backgroundColor: "#07111F",
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#F3344A",
  },

  joinTitle: {
    marginTop: 5,
    fontSize: 23,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  joinDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#B8BEC7",
  },
  qrSection: {
    alignItems: "center",
    marginTop: 19,
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#303B49",
    borderRadius: 19,
    backgroundColor: "#111D2B",
  },

  qrContainer: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  qrTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  qrDescription: {
    maxWidth: 270,
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#B8BEC7",
    textAlign: "center",
  },

  codeDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 17,
  },

  codeDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#303B49",
  },

  codeDividerText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#929AA5",
  },
  codeContainer: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: "#303B49",
    borderRadius: 17,
    backgroundColor: "#111D2B",
  },

  code: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
    color: "#FFFFFF",
  },

  codeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },

  copyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },

  copyButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 16,
  },

  shareButtonText: {
    color: "#F3344A",
    fontWeight: "900",
  },

  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 27,
    marginBottom: 13,
  },

  membersTitle: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "900",
    color: "#07111F",
  },

  memberCount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F3344A",
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },

  memberContent: {
    flex: 1,
    marginLeft: 12,
  },

  memberName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#07111F",
  },

  memberEmail: {
    marginTop: 3,
    fontSize: 12,
    color: "#777E89",
  },

  roleContainer: {
    alignItems: "center",
    gap: 3,
  },

  roleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#69707C",
  },

  separator: {
    height: 10,
  },

  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#E8A7A7",
    borderRadius: 17,
    backgroundColor: "#FFF4F4",
  },

  leaveButtonDisabled: {
    opacity: 0.55,
  },

  leaveButtonText: {
    color: "#C62828",
    fontSize: 15,
    fontWeight: "900",
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },

  stateText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#69707C",
  },

  errorTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#07111F",
  },

  errorMessage: {
    maxWidth: 340,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  errorButton: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#F3344A",
  },

  errorButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});