import {
  Check,
  Plus,
  RefreshCw,
  Users,
  UserRoundPlus,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { CreateGroupModal } from "@/features/groups/CreateGroupModal";
import { GroupCard } from "@/features/groups/GroupCard";
import {
  getGroupInvitations,
  getGroups,
  respondToGroupInvitation,
} from "@/features/groups/groupsService";
import { JoinGroupModal } from "@/features/groups/JoinGroupModal";
import type {
  DiningGroup,
  DiningGroupInvitation,
} from "@/features/groups/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";
import {
  createThemedStyleSheet,
  themeColor,
} from "@/theme/themedStyleSheet";
import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";

export default function GroupsScreen() {
  useAppTheme();

  const [groups, setGroups] = useState<DiningGroup[]>([]);
  const [invitations, setInvitations] = useState<
    DiningGroupInvitation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setError(null);

      const [results, pendingInvitations] = await Promise.all([
        getGroups(),
        getGroupInvitations(),
      ]);

      setInvitations(pendingInvitations);

      setGroups(
        [...results].sort(
          (first, second) =>
            first.name.localeCompare(second.name),
        ),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load your groups.",
        ),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

    useFocusEffect(
        useCallback(() => {
            loadGroups();
        }, [loadGroups]),
    );

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadGroups();
  }

  function handleCreated(group: DiningGroup) {
    setGroups((currentGroups) =>
      [
        group,
        ...currentGroups.filter(
          (currentGroup) =>
            currentGroup.id !== group.id,
        ),
      ].sort(
        (first, second) =>
          first.name.localeCompare(
            second.name,
          ),
      ),
    );
  }

  function handleJoined(group: DiningGroup) {
    setGroups((currentGroups) =>
      [
        group,
        ...currentGroups.filter(
          (currentGroup) =>
            currentGroup.id !== group.id,
        ),
      ].sort(
        (first, second) =>
          first.name.localeCompare(
            second.name,
          ),
      ),
    );
  }

  async function handleInvitation(
    invitationId: string,
    action: "accept" | "decline",
  ) {
    try {
      await respondToGroupInvitation(
        invitationId,
        action,
      );

      await loadGroups();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to update the group invitation.",
        ),
      );
    }
  }

    function handleOpenGroup(group: DiningGroup) {
        router.push({
            pathname: "/groups/[id]",
            params: {
            id: group.id,
            },
        });
    }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={themeColor("#F3344A", "color")}
          />

          <Text style={styles.stateText}>
            Loading your dinner crews...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            WHO ARE YOU EATING WITH?
          </Text>

          <Text style={styles.title}>Your Groups</Text>

          <Text style={styles.subtitle}>
            Keep your favorite people one tap away.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Users
            size={27}
            color={themeColor("#F3344A", "color")}
          />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => setCreateVisible(true)}
          style={styles.primaryAction}
        >
          <Plus
            size={21}
            color={themeColor("#FFFFFF", "color")}
            strokeWidth={2.5}
          />

          <Text style={styles.primaryActionText}>
            Create Group
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setJoinVisible(true)}
          style={styles.secondaryAction}
        >
          <UserRoundPlus
            size={21}
            color={themeColor("#F3344A", "color")}
            strokeWidth={2.4}
          />

          <Text style={styles.secondaryActionText}>
            Join
          </Text>
        </Pressable>
      </View>

      {invitations.length > 0 && (
        <View style={styles.invitationSection}>
          <Text style={styles.invitationEyebrow}>
            GROUP INVITATIONS
          </Text>

          {invitations.map((invitation) => (
            <View
              key={invitation.id}
              style={styles.invitationCard}
            >
              <View style={styles.invitationCopy}>
                <Text style={styles.invitationTitle}>
                  {invitation.group_name}
                </Text>

                <Text style={styles.invitationText}>
                  {invitation.invited_by.display_name
                    || invitation.invited_by.first_name
                    || invitation.invited_by.email}{" "}
                  invited you to join this group.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  void handleInvitation(
                    invitation.id,
                    "accept",
                  )
                }
                style={styles.acceptInviteButton}
              >
                <Check
                  size={18}
                  color={themeColor("#FFFFFF", "color")}
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  void handleInvitation(
                    invitation.id,
                    "decline",
                  )
                }
                style={styles.declineInviteButton}
              >
                <X
                  size={18}
                  color={themeColor("#C62828", "color")}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            onPress={loadGroups}
            style={styles.retryButton}
          >
            <RefreshCw
              size={17}
              color={themeColor("#C62828", "color")}
            />

            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={groups}
        keyExtractor={(group) => {
            if (!group.id) {
                throw new Error(
                "A dining group was returned without an id.",
                );
            }

            return group.id;
        }}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => handleOpenGroup(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          groups.length === 0 &&
            styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColor("#F3344A", "color")}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users
                size={42}
                color={themeColor("#F3344A", "color")}
                strokeWidth={1.8}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No groups yet
            </Text>

            <Text style={styles.emptyText}>
              Create a crew or join somebody else’s group using their code.
            </Text>

            <Pressable
              onPress={() => setCreateVisible(true)}
              style={styles.emptyButton}
            >
              <Plus
                size={20}
                color={themeColor("#FFFFFF", "color")}
              />

              <Text style={styles.emptyButtonText}>
                Create Your First Group
              </Text>
            </Pressable>
          </View>
        }
      />

      <CreateGroupModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={handleCreated}
      />

      <JoinGroupModal
        visible={joinVisible}
        onClose={() => setJoinVisible(false)}
        onJoined={handleJoined}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet({
  screen: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 18,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#F3344A",
  },

  title: {
    marginTop: 5,
    fontSize: 31,
    fontWeight: "900",
    color: "#07111F",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 15,
    color: "#69707C",
  },

  headerIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#FFF0F2",
  },

  actionRow: {
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
  },

  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: "#F3344A",
  },

  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minWidth: 105,
    minHeight: 52,
    paddingHorizontal: 17,
    borderWidth: 1.5,
    borderColor: "#F3344A",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  secondaryActionText: {
    color: "#F3344A",
    fontSize: 15,
    fontWeight: "900",
  },

  invitationSection: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },

  invitationEyebrow: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#F3344A",
  },

  invitationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
    borderWidth: 1,
    borderColor: "#ECEDEF",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  invitationCopy: {
    flex: 1,
  },

  invitationTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#07111F",
  },

  invitationText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#69707C",
  },

  acceptInviteButton: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#168B4F",
  },

  declineInviteButton: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
  },

  errorCard: {
    marginHorizontal: 22,
    marginBottom: 12,
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

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 9,
  },

  retryText: {
    color: "#C62828",
    fontWeight: "900",
  },

  listContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 30,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  separator: {
    height: 13,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  stateText: {
    color: "#69707C",
    fontSize: 15,
    fontWeight: "700",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: "#FFF0F2",
  },

  emptyTitle: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: "900",
    color: "#07111F",
  },

  emptyText: {
    maxWidth: 330,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#69707C",
    textAlign: "center",
  },

  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 21,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: "#F3344A",
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});