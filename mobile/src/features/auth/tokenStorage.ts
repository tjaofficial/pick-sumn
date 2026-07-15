import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthTokens } from "./types";

const ACCESS_TOKEN_KEY = "picksumn_access_token";
const REFRESH_TOKEN_KEY = "picksumn_refresh_token";

async function setStorageItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(
  key: string,
): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStorageItem(
  key: string,
): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveTokens(
  tokens: AuthTokens,
): Promise<void> {
  await Promise.all([
    setStorageItem(ACCESS_TOKEN_KEY, tokens.access),
    setStorageItem(REFRESH_TOKEN_KEY, tokens.refresh),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getStorageItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getStorageItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteStorageItem(ACCESS_TOKEN_KEY),
    deleteStorageItem(REFRESH_TOKEN_KEY),
  ]);
}