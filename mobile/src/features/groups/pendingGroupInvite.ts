import * as SecureStore from "expo-secure-store";


const PENDING_GROUP_JOIN_CODE_KEY =
  "picksumn_pending_group_join_code";


function normalizeJoinCode(
  value: string,
): string {
  return value
    .trim()
    .toUpperCase();
}


export async function savePendingGroupJoinCode(
  joinCode: string,
): Promise<void> {
  const normalized =
    normalizeJoinCode(
      joinCode,
    );

  if (!normalized) {
    return;
  }

  await SecureStore.setItemAsync(
    PENDING_GROUP_JOIN_CODE_KEY,
    normalized,
  );
}


export async function getPendingGroupJoinCode(): Promise<
  string | null
> {
  return SecureStore.getItemAsync(
    PENDING_GROUP_JOIN_CODE_KEY,
  );
}


export async function clearPendingGroupJoinCode(): Promise<
  void
> {
  await SecureStore.deleteItemAsync(
    PENDING_GROUP_JOIN_CODE_KEY,
  );
}
