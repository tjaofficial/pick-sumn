import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  ArrowDown,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Dices,
  History,
  MapPin,
  RefreshCw,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Users,
  Vote,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
  getPickSessionNotifications,
  getRecentPickSessions,
  markPickSessionNotificationRead,
  prepareGroupVote,
  startPickSessionMatching,
} from "@/features/pickSessions/pickSessionsService";
import type {
  DecisionMode,
  PickSession,
  PickSessionNotification,
} from "@/features/pickSessions/types";
import { getApiErrorMessage } from "@/services/getApiErrorMessage";

function roundCoordinate(value: number | null) {
  return value === null ? null : Number(value.toFixed(6));
}

export default function PickScreen() {
  const { user } = useAuth();
  const { draft, resetDraft } = usePickDraft();

  const [activeSessions, setActiveSessions] = useState<PickSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<PickSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [creatingMode, setCreatingMode] = useState<DecisionMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [invitation, setInvitation] =
    useState<PickSessionNotification | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const [active, recent, notifications] = await Promise.all([
        getActivePickSessions(),
        getRecentPickSessions(),
        getPickSessionNotifications(),
      ]);
      setActiveSessions(active);
      setRecentSessions(recent);
      setUnreadCount(notifications.unread_count);
      setInvitation(
        notifications.notifications.find(
          (item) => !item.is_read && item.kind === "group_vote_invite",
        ) ?? null,
      );
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  const peopleComplete = draft.isJustMe || Boolean(draft.groupId);
  const locationComplete = Boolean(
    draft.locationLabel.trim()
    && draft.latitude !== null
    && draft.longitude !== null,
  );
  const filtersComplete = draft.filtersReviewed;
  const setupComplete = peopleComplete && locationComplete && filtersComplete;
  const canStart = setupComplete && creatingMode === null;

  const hostName =
    user?.display_name || user?.first_name || user?.email || "You";

  const peopleTitle = useMemo(() => {
    if (!peopleComplete) return "Who’s Eating?";
    if (draft.isJustMe) return hostName;
    if (draft.participantNames.length === 0) return draft.groupName;
    return [hostName, ...draft.participantNames].join(" + ");
  }, [draft.groupName, draft.isJustMe, draft.participantNames, hostName, peopleComplete]);

  const peopleSubtitle = !peopleComplete
    ? "Choose your crew"
    : draft.isJustMe
      ? "Just me"
      : `${draft.participantIds.length + 1} people selected`;

  const filterSummary = useMemo(() => {
    if (!filtersComplete) return "Review your session filters";
    const values: string[] = [];
    if (draft.openNow) values.push("Open now");
    if (draft.includeDelivery) values.push("Delivery");
    if (draft.includeDriveThrough) values.push("Drive-through");
    if (draft.somethingNew) values.push("Something new");
    return values.length > 0 ? values.join(" · ") : "No extra filters";
  }, [draft.includeDelivery, draft.includeDriveThrough, draft.openNow, draft.somethingNew, filtersComplete]);

  async function createSession(decisionMode: DecisionMode) {
    if (!setupComplete) {
      setError("Complete all three setup steps before starting.");
      return;
    }

    try {
      setCreatingMode(decisionMode);
      setError(null);

      const session = await createPickSession({
        title: draft.isJustMe ? "My Pick Session" : `${draft.groupName} Pick`,
        group_id: draft.groupId || null,
        participant_ids: draft.participantIds,
        decision_mode: decisionMode,
        location_label: draft.locationLabel.trim(),
        latitude: roundCoordinate(draft.latitude),
        longitude: roundCoordinate(draft.longitude),
        search_radius_miles: draft.searchRadiusMiles,
        price_min: draft.priceMin,
        price_max: draft.priceMax,
        open_now: draft.openNow,
        include_delivery: draft.includeDelivery,
        include_drive_through: draft.includeDriveThrough,
        something_new: draft.somethingNew,
        cuisine_ids: draft.cuisineIds,
      });

      if (decisionMode === "group_vote") {
        await prepareGroupVote(session.id);
        router.replace({ pathname: "/pick-votes/[id]", params: { id: session.id } });
        return;
      }

      await startPickSessionMatching(session.id);
      router.replace({
        pathname: "/(tabs)/matches",
        params: { sessionId: session.id, decisionMode },
      });
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to start matching."),
      );
    } finally {
      setCreatingMode(null);
    }
  }

  async function openInvitation() {
    if (!invitation) return;
    try {
      await markPickSessionNotificationRead(invitation.id);
    } catch {}
    setUnreadCount((count) => Math.max(0, count - 1));
    setInvitation(null);
    router.push({ pathname: "/pick-votes/[id]", params: { id: invitation.session_id } });
  }

  function confirmResetSetup() {
    Alert.alert(
      "Reset session setup?",
      (
        "This will clear Who’s Eating, location, "
        + "search radius, and session filters."
      ),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetDraft();
            setError(null);
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
          <Text style={styles.loadingText}>Loading Pick Sum’N...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Modal visible={invitation !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Vote size={34} color="#F3344A" />
            <Text style={styles.modalTitle}>Group Vote Invitation</Text>
            <Text style={styles.modalText}>{invitation?.message}</Text>
            <Pressable onPress={() => void openInvitation()} style={styles.modalPrimary}>
              <Text style={styles.modalPrimaryText}>Open Vote</Text>
            </Pressable>
            <Pressable onPress={() => setInvitation(null)} style={styles.modalSecondary}>
              <Text style={styles.modalSecondaryText}>Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadSessions();
            }}
            tintColor="#F3344A"
          />
        }
      >
        <View style={styles.logoRow}>
          <View style={styles.logoSpacer} />
          <Image
            source={require("../../../assets/images/pick-sumn-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Pressable onPress={() => router.push("/notifications")} style={styles.notificationButton}>
            <Bell size={23} color="#07111F" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={styles.guideTitle}>Set up your session</Text>
        <Text style={styles.guideSubtitle}>Follow the path, then Pick Sum’N.</Text>

        <Pressable
          onPress={confirmResetSetup}
          disabled={creatingMode !== null}
          style={({ pressed }) => [
            styles.resetSetupButton,
            pressed
              && styles.resetSetupButtonPressed,
            creatingMode !== null
              && styles.resetSetupButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Reset session setup"
        >
          <RotateCcw
            size={17}
            color="#C62828"
          />

          <Text
            style={
              styles.resetSetupText
            }
          >
            Reset Setup
          </Text>
        </Pressable>

        <StepCard
          complete={peopleComplete}
          active={!peopleComplete}
          icon={<Users size={27} color={peopleComplete ? "#168B4F" : "#F3344A"} />}
          title={peopleTitle}
          subtitle={peopleSubtitle}
          onPress={() => router.navigate("/pick/new")}
        />

        <GuideArrow active={peopleComplete && !locationComplete} complete={peopleComplete} />

        <StepCard
          complete={locationComplete}
          active={peopleComplete && !locationComplete}
          icon={<MapPin size={27} color={locationComplete ? "#168B4F" : "#F3344A"} />}
          title={locationComplete ? draft.locationLabel : "Location"}
          subtitle={locationComplete ? `${draft.searchRadiusMiles} mile search radius` : "Choose an area or address"}
          onPress={() => router.navigate("/pick/location")}
        />

        <GuideArrow active={locationComplete && !filtersComplete} complete={locationComplete} />

        <StepCard
          complete={filtersComplete}
          active={locationComplete && !filtersComplete}
          icon={<SlidersHorizontal size={27} color={filtersComplete ? "#168B4F" : "#F3344A"} />}
          title={filtersComplete ? "Session Filters Saved" : "Session Filters"}
          subtitle={filterSummary}
          onPress={() => router.navigate("/pick/setup")}
        />

        <GuideArrow active={setupComplete} complete={filtersComplete} />

        <Text style={[styles.readyText, setupComplete && styles.readyTextComplete]}>
          {setupComplete ? "Everything is ready." : "Complete each step to unlock the buttons."}
        </Text>

        <View style={styles.decisionRow}>
          <DecisionSideButton
            label={"Surprise\nMe"}
            icon={<Shuffle size={29} color="#07111F" />}
            disabled={!canStart}
            loading={creatingMode === "pick_for_us"}
            onPress={() => void createSession("pick_for_us")}
          />

          <Pressable
            onPress={() => void createSession("ranked")}
            disabled={!canStart}
            style={[styles.pickOuter, !canStart && styles.pickDisabled]}
          >
            <View style={[styles.pickInner, setupComplete && styles.pickInnerReady]}>
              {creatingMode === "ranked" ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <>
                  <Dices size={49} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.pickText}>PICK SUM’N</Text>
                </>
              )}
            </View>
          </Pressable>

          <DecisionSideButton
            label={"Group\nVote"}
            icon={<Vote size={29} color="#07111F" />}
            disabled={!canStart}
            loading={creatingMode === "group_vote"}
            onPress={() => void createSession("group_vote")}
          />
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <Shortcut
            icon={<Clock3 size={21} color="#F3344A" />}
            title="Active Session"
            subtitle={activeSessions.length > 0 ? `${activeSessions.length} in progress` : "No active session"}
            onPress={() => router.push("/pick/active")}
          />
          <Shortcut
            icon={<History size={21} color="#F3344A" />}
            title="Recent Picks"
            subtitle={recentSessions.length > 0 ? `${recentSessions.length} recent picks` : "Nothing picked yet"}
            onPress={() => router.push("/pick/recent")}
          />
        </View>

        <Pressable onPress={() => void loadSessions()} style={styles.refreshButton}>
          <RefreshCw size={15} color="#777E89" />
          <Text style={styles.refreshText}>Refresh sessions</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type StepCardProps = {
  complete: boolean;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function StepCard({ complete, active, icon, title, subtitle, onPress }: StepCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.stepCard,
        active && styles.stepCardActive,
        complete && styles.stepCardComplete,
      ]}
    >
      <View style={[styles.stepIcon, complete && styles.stepIconComplete]}>{icon}</View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, complete && styles.stepTitleComplete]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.stepSubtitle, complete && styles.stepSubtitleComplete]} numberOfLines={2}>{subtitle}</Text>
      </View>
      {complete ? (
        <View style={styles.checkCircle}><Check size={17} color="#FFFFFF" strokeWidth={3} /></View>
      ) : (
        <ChevronRight size={23} color={active ? "#F3344A" : "#9298A2"} />
      )}
    </Pressable>
  );
}

function GuideArrow({ active, complete }: { active: boolean; complete: boolean }) {
  return (
    <View style={styles.arrowWrap}>
      <View style={[styles.arrowLine, complete && styles.arrowLineComplete]} />
      <ArrowDown size={24} color={active ? "#F3344A" : complete ? "#168B4F" : "#C7CBD1"} strokeWidth={3} />
    </View>
  );
}

function DecisionSideButton({ label, icon, disabled, loading, onPress }: { label: string; icon: React.ReactNode; disabled: boolean; loading: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.sideButton, disabled && styles.sideDisabled]}>
      {loading ? <ActivityIndicator size="small" color="#07111F" /> : icon}
      <Text style={styles.sideText}>{label}</Text>
    </Pressable>
  );
}

function Shortcut({ icon, title, subtitle, onPress }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <View style={styles.shortcutHeading}>{icon}<Text style={styles.shortcutTitle}>{title}</Text></View>
      <Text style={styles.shortcutSubtitle}>{subtitle}</Text>
      <ChevronRight size={19} color="#F3344A" style={styles.shortcutArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFDFB" },
  content: { paddingHorizontal: 18, paddingBottom: 38 },
  logoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoSpacer: { width: 45 },
  logo: { width: 220, height: 124, marginTop: -10, marginBottom: -14 },
  notificationButton: { position: "relative", width: 45, height: 45, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 16, backgroundColor: "#FFFFFF" },
  notificationBadge: { position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderWidth: 2, borderColor: "#FFFDFB", borderRadius: 10, backgroundColor: "#F3344A" },
  notificationBadgeText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF" },
  guideTitle: { fontSize: 22, fontWeight: "900", color: "#07111F", textAlign: "center" },
  guideSubtitle: { marginTop: 4, marginBottom: 10, fontSize: 13, color: "#69707C", textAlign: "center" },
  resetSetupButton: { alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 38, marginBottom: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: "#F3C5C5", borderRadius: 999, backgroundColor: "#FFF4F4" },
  resetSetupButtonPressed: { opacity: 0.72 },
  resetSetupButtonDisabled: { opacity: 0.45 },
  resetSetupText: { fontSize: 12, fontWeight: "900", color: "#C62828" },
  stepCard: { minHeight: 82, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderWidth: 2, borderColor: "#E4E7EB", borderRadius: 22, backgroundColor: "#FFFFFF" },
  stepCardActive: { borderColor: "#F3344A", shadowColor: "#F3344A", shadowOpacity: 0.12, shadowRadius: 10, elevation: 3 },
  stepCardComplete: { borderColor: "#168B4F", backgroundColor: "#EFFAF3" },
  stepIcon: { width: 49, height: 49, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#FFF0F2" },
  stepIconComplete: { backgroundColor: "#DDF4E6" },
  stepContent: { flex: 1, marginHorizontal: 12 },
  stepTitle: { fontSize: 17, fontWeight: "900", color: "#07111F" },
  stepTitleComplete: { color: "#116A3D" },
  stepSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, color: "#69707C" },
  stepSubtitleComplete: { color: "#397A58" },
  checkCircle: { width: 29, height: 29, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#168B4F" },
  arrowWrap: { height: 36, alignItems: "center", justifyContent: "center" },
  arrowLine: { position: "absolute", top: 0, bottom: 0, width: 3, borderRadius: 2, backgroundColor: "#E0E3E7" },
  arrowLineComplete: { backgroundColor: "#B8E4CA" },
  readyText: { marginTop: 5, fontSize: 12, fontWeight: "800", color: "#777E89", textAlign: "center" },
  readyTextComplete: { color: "#168B4F" },
  decisionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  sideButton: { width: 88, minHeight: 108, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 23, backgroundColor: "#FFFFFF" },
  sideDisabled: { opacity: 0.38 },
  sideText: { marginTop: 8, fontSize: 13, fontWeight: "900", lineHeight: 17, color: "#07111F", textAlign: "center" },
  pickOuter: { width: 148, height: 148, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#FF9A38", borderRadius: 74, backgroundColor: "#FFF2E8", shadowColor: "#F3344A", shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 },
  pickDisabled: { opacity: 0.38 },
  pickInner: { width: 129, height: 129, alignItems: "center", justifyContent: "center", borderRadius: 65, backgroundColor: "#A7ADB6" },
  pickInnerReady: { backgroundColor: "#F3344A" },
  pickText: { marginTop: 7, fontSize: 18, fontWeight: "900", color: "#FFFFFF" },
  errorCard: { marginTop: 15, padding: 13, borderWidth: 1, borderColor: "#F3C5C5", borderRadius: 17, backgroundColor: "#FFF1F1" },
  errorText: { fontSize: 13, fontWeight: "700", color: "#9F2424", textAlign: "center" },
  bottomRow: { flexDirection: "row", gap: 11, marginTop: 22 },
  shortcut: { flex: 1, minHeight: 90, padding: 14, borderWidth: 1, borderColor: "#ECEDEF", borderRadius: 21, backgroundColor: "#FFFFFF" },
  shortcutHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  shortcutTitle: { fontSize: 13, fontWeight: "900", color: "#07111F" },
  shortcutSubtitle: { marginTop: 8, paddingRight: 18, fontSize: 11, color: "#69707C" },
  shortcutArrow: { position: "absolute", right: 11, bottom: 12 },
  refreshButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 15 },
  refreshText: { fontSize: 11, fontWeight: "800", color: "#777E89" },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(7,17,31,0.58)" },
  modalCard: { width: "100%", maxWidth: 380, alignItems: "center", padding: 25, borderRadius: 25, backgroundColor: "#FFFFFF" },
  modalTitle: { marginTop: 15, fontSize: 22, fontWeight: "900", color: "#07111F" },
  modalText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: "#69707C", textAlign: "center" },
  modalPrimary: { width: "100%", minHeight: 53, alignItems: "center", justifyContent: "center", marginTop: 21, borderRadius: 17, backgroundColor: "#F3344A" },
  modalPrimaryText: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  modalSecondary: { padding: 12 },
  modalSecondaryText: { fontSize: 13, fontWeight: "900", color: "#69707C" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontWeight: "700", color: "#69707C" },
});
