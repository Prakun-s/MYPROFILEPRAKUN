import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "../types/auth";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export async function saveSession(token: string, user: AuthUser) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function loadSession(): Promise<{
  token: string;
  user: AuthUser;
} | null> {
  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([
    TOKEN_KEY,
    USER_KEY,
  ]);

  if (!token || !userRaw) {
    return null;
  }

  try {
    const user = JSON.parse(userRaw) as AuthUser;
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
