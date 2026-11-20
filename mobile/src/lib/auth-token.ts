import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'flashdrop.auth-token';
const USER_KEY = 'flashdrop.auth-user';

export type StoredUser = { id: string; name: string; email: string };

export async function getAuthToken() {
  try {
    if (Platform.OS === 'web') {
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<StoredUser | null> {
  try {
    const value = Platform.OS === 'web'
      ? (typeof window === 'undefined' ? null : window.sessionStorage.getItem(USER_KEY))
      : await SecureStore.getItemAsync(USER_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<StoredUser>;
    return typeof parsed.id === 'string' && typeof parsed.name === 'string' && typeof parsed.email === 'string'
      ? { id: parsed.id, name: parsed.name, email: parsed.email }
      : null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(user: StoredUser, token: string) {
  const profile = JSON.stringify(user);
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(USER_KEY, profile);
        window.sessionStorage.setItem(TOKEN_KEY, token);
      }
      return;
    }

    await SecureStore.setItemAsync(USER_KEY, profile);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    await clearAuthSession();
    throw error;
  }
}

export async function clearAuthSession() {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(USER_KEY);
        window.sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Browsers may disable session storage; the in-memory session still clears.
    }
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
  ]);
}
