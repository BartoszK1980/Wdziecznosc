import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseKey?: string;
};

export const SUPABASE_URL = extra.supabaseUrl?.trim() || '';
export const SUPABASE_KEY = extra.supabaseKey?.trim() || '';

/**
 * Aplikacja jest w pelni uzywalna bez chmury — dopoki tego nie ma, dziala
 * lokalnie i po prostu nie synchronizuje. Dzieki temu da sie ja rozwijac
 * i testowac, zanim powstanie projekt Supabase.
 */
export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

// --- magazyn sesji ----------------------------------------------------------
//
// expo-secure-store przyjmuje bezpiecznie ~2048 bajtow na wartosc, a sesja
// Supabase (access token + refresh token + obiekt uzytkownika) regularnie to
// przekracza. Na Androidzie konczy sie to cichym bledem zapisu i uzytkownikiem
// wylogowanym po restarcie apki. Dlatego tniemy wartosc na kawalki.

const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function readChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function clearChunks(key: string): Promise<void> {
  const previous = await readChunkCount(key);
  for (let i = 0; i < previous; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

const ChunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const count = await readChunkCount(key);
    if (count === 0) return null;

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      // Niekompletny zapis (np. apka ubita w trakcie) to nie jest "polowa sesji"
      // — lepiej zglosic brak i pozwolic bibliotece zalogowac sie od nowa.
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await clearChunks(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(countKey(key), String(count));
  },

  async removeItem(key: string): Promise<void> {
    await clearChunks(key);
  },
};

// --- klient -----------------------------------------------------------------

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: ChunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      // W aplikacji mobilnej nie ma adresu URL z tokenem do przechwycenia.
      detectSessionInUrl: false,
    },
  });
  return client;
}

// --- konto ------------------------------------------------------------------

export type AccountState =
  | { kind: 'offline' } // brak konfiguracji chmury
  | { kind: 'anonymous' } // dziala, ale bez mozliwosci odzyskania
  | { kind: 'linked'; email: string };

/**
 * Loguje anonimowo, jesli nie ma jeszcze sesji.
 *
 * Anonimowy uzytkownik dostaje prawdziwy wiersz w auth.users, wiec RLS dziala
 * od pierwszej sekundy, a wpisy trafiaja do chmury jeszcze zanim ktokolwiek
 * poda e-mail. Podpiecie adresu NIE zmienia user_id — cala historia zostaje.
 */
export async function ensureSession(): Promise<AccountState> {
  const supabase = getSupabase();
  if (!supabase) return { kind: 'offline' };

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
  return accountStateFromSession(await supabase.auth.getUser());
}

function accountStateFromSession(result: {
  data: { user: { email?: string | null } | null };
}): AccountState {
  const email = result.data.user?.email;
  return email ? { kind: 'linked', email } : { kind: 'anonymous' };
}

export async function getAccountState(): Promise<AccountState> {
  const supabase = getSupabase();
  if (!supabase) return { kind: 'offline' };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { kind: 'anonymous' };
  return accountStateFromSession(await supabase.auth.getUser());
}

/** Krok 1 podpiecia konta do istniejacej sesji anonimowej: wyslanie kodu. */
export async function requestEmailLink(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud-not-configured');
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

/** Krok 2: potwierdzenie kodem. Po nim konto ma juz e-mail, user_id bez zmian. */
export async function confirmEmailLink(email: string, token: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud-not-configured');
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email_change' });
  if (error) throw error;
}

/** Logowanie na NOWYM urzadzeniu, do konta, ktore juz ma e-mail. */
export async function requestSignIn(email: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud-not-configured');
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function confirmSignIn(email: string, token: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud-not-configured');
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

export async function currentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
