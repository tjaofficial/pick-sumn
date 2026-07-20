import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Check,
  QrCode,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCallback, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import {
  getFriendRequests,
  getFriends,
  removeFriend,
  respondToFriendRequest,
  searchFriends,
  sendFriendRequest,
} from "@/features/friends/friendsService";
import type {
  FriendListItem,
  FriendRequest,
  FriendSearchResult,
  FriendUser,
} from "@/features/friends/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

function friendName(user: FriendUser): string {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.display_name || user.email;
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [loadedFriends, loadedRequests] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      setFriends(loadedFriends);
      setRequests(loadedRequests);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to load your friends.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const groupedFriends = useMemo(() => {
    const groups = new Map<string, FriendListItem[]>();

    for (const friend of friends) {
      const letter = friendName(friend.user).charAt(0).toUpperCase() || "#";
      groups.set(letter, [...(groups.get(letter) || []), friend]);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [friends]);

  async function handleSearch() {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults([]);
      setError("Enter at least two characters to search.");
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      setResults(await searchFriends(clean));
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to search for friends.",
        ),
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function requestFriend(userId: number) {
    try {
      await sendFriendRequest({ user_id: userId });
      await handleSearch();
      await load();
    } catch (requestError) {
      Alert.alert(
        "Unable to add friend",
        getApiErrorMessage(
          requestError,
          "The friend request could not be sent.",
        ),
      );
    }
  }

  async function respond(
    friendshipId: string,
    action: "accept" | "decline",
  ) {
    try {
      await respondToFriendRequest(friendshipId, action);
      await load();
    } catch (requestError) {
      Alert.alert(
        "Unable to update request",
        getApiErrorMessage(
          requestError,
          "The friend request could not be updated.",
        ),
      );
    }
  }

  function confirmRemove(friend: FriendListItem) {
    Alert.alert(
      "Friend options",
      `Manage your connection with ${friendName(friend.user)}.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove Friend",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriend(
                friend.friendship_id,
              );

              await load();
            } catch (requestError) {
              Alert.alert(
                "Unable to remove friend",
                getApiErrorMessage(
                  requestError,
                  "The friend could not be removed.",
                ),
              );
            }
          },
        },
        {
          text: "Block User",
          style: "destructive",
          onPress: async () => {
            try {
              await respondToFriendRequest(
                friend.friendship_id,
                "block",
              );

              await load();
            } catch (requestError) {
              Alert.alert(
                "Unable to block user",
                getApiErrorMessage(
                  requestError,
                  "The user could not be blocked.",
                ),
              );
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#F3344A" />
          <Text style={styles.loadingText}>Loading your friends...</Text>
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
          <Text style={styles.topBarTitle}>Your Friends</Text>
          <Text style={styles.topBarSubtitle}>People you can Pick Sum’N with</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push("/friends/scan")}
            style={styles.actionCard}
          >
            <QrCode size={24} color="#F3344A" />
            <Text style={styles.actionTitle}>Scan Friend QR</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/friends/code")}
            style={styles.actionCard}
          >
            <Users size={24} color="#F3344A" />
            <Text style={styles.actionTitle}>My Friend Code</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Find Friends</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or email"
            placeholderTextColor="#9298A2"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
            style={styles.searchInput}
          />
          <Pressable onPress={() => void handleSearch()} style={styles.searchButton}>
            {isSearching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Search size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {results.map((result) => (
          <View key={result.user.id} style={styles.personCard}>
            <Avatar
              imageUrl={result.user.avatar}
              name={friendName(result.user)}
              size={46}
            />
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{friendName(result.user)}</Text>
              <Text style={styles.personMeta}>{result.user.email}</Text>
            </View>
            {result.relationship_status === "accepted" ? (
              <View style={styles.statusPill}>
                <Check size={14} color="#168B4F" />
                <Text style={styles.statusText}>Friends</Text>
              </View>
            ) : result.relationship_status === "pending" ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>Pending</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => void requestFriend(result.user.id)}
                style={styles.smallPrimary}
              >
                <UserPlus size={17} color="#FFFFFF" />
                <Text style={styles.smallPrimaryText}>Add</Text>
              </Pressable>
            )}
          </View>
        ))}

        {requests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {requests.map((request) => (
              <View key={request.friendship_id} style={styles.personCard}>
                <Avatar
                  imageUrl={request.user.avatar}
                  name={friendName(request.user)}
                  size={46}
                />
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{friendName(request.user)}</Text>
                  <Text style={styles.personMeta}>Wants to be friends</Text>
                </View>
                <Pressable
                  onPress={() => void respond(request.friendship_id, "accept")}
                  style={styles.iconAccept}
                >
                  <Check size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => void respond(request.friendship_id, "decline")}
                  style={styles.iconDecline}
                >
                  <X size={18} color="#C62828" />
                </Pressable>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Your Friends</Text>
        {groupedFriends.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={34} color="#F3344A" />
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyText}>
              Search for someone, scan their QR code, or share your friend code.
            </Text>
          </View>
        ) : (
          groupedFriends.map(([letter, items]) => (
            <View key={letter}>
              <Text style={styles.letter}>{letter}</Text>
              {items.map((friend) => (
                <View key={friend.friendship_id} style={styles.personCard}>
                  <Avatar
                    imageUrl={friend.user.avatar}
                    name={friendName(friend.user)}
                    size={46}
                  />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{friendName(friend.user)}</Text>
                    <Text style={styles.personMeta}>{friend.user.email}</Text>
                  </View>
                  <Pressable
                    onPress={() => confirmRemove(friend)}
                    style={styles.removeButton}
                  >
                    <UserMinus size={19} color="#C62828" />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  actionRow: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, minHeight: 92, alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 18, backgroundColor: "#FFFFFF" },
  actionTitle: { fontSize: 12, fontWeight: "900", color: "#07111F" },
  sectionTitle: { marginTop: 26, marginBottom: 10, fontSize: 20, fontWeight: "900", color: "#07111F" },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: { flex: 1, minHeight: 50, paddingHorizontal: 15, borderWidth: 1, borderColor: "#D9DDE3", borderRadius: 15, backgroundColor: "#FFFFFF", color: "#07111F" },
  searchButton: { width: 50, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#F3344A" },
  personCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 17, backgroundColor: "#FFFFFF" },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: "900", color: "#07111F" },
  personMeta: { marginTop: 3, fontSize: 11, color: "#777E89" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E8F7EF" },
  statusText: { fontSize: 10, fontWeight: "900", color: "#168B4F" },
  smallPrimary: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F3344A" },
  smallPrimaryText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" },
  iconAccept: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#168B4F" },
  iconDecline: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FFF1F1" },
  removeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FFF1F1" },
  letter: { marginTop: 10, marginBottom: 6, fontSize: 13, fontWeight: "900", color: "#F3344A" },
  emptyCard: { alignItems: "center", padding: 24, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 20, backgroundColor: "#FFFFFF" },
  emptyTitle: { marginTop: 10, fontSize: 17, fontWeight: "900", color: "#07111F" },
  emptyText: { marginTop: 5, fontSize: 12, lineHeight: 18, color: "#69707C", textAlign: "center" },
  errorCard: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: "#FFF1F1" },
  errorText: { color: "#9F2424", fontWeight: "700", textAlign: "center" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#69707C", fontWeight: "700" },
});
