import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

import { hasExpoModule } from '@/native-runtime';

/**
 * Nagrania zyja w documentDirectory/audio/, NIE w cache.
 *
 * Ten sam powod co przy zdjeciach: rekorder zwraca plik w katalogu tymczasowym,
 * ktory system kasuje przy braku miejsca. Wpis wygladalby wtedy na uszkodzony —
 * suwak odtwarzania bez dzwieku, bez zadnego bledu.
 */

/** Gorna granica dlugosci nagrania. Jedno zdanie wdziecznosci, nie podcast. */
export const MAX_RECORDING_MS = 3 * 60 * 1000;

/** Ponizej tego progu traktujemy nagranie jak przypadkowe dotkniecie przycisku. */
export const MIN_RECORDING_MS = 700;

/**
 * Kontener nagrania. RecordingPresets.HIGH_QUALITY daje .m4a na obu systemach,
 * a `audio/mp4` to poprawny typ MIME tego kontenera — bucket ma go na liscie
 * dozwolonych, wiec upload nie odbije sie od walidacji.
 */
export const AUDIO_EXTENSION = '.m4a';
export const AUDIO_MIME = 'audio/mp4';

/** Czy modul nagrywania jest w tej wersji aplikacji w ogole obecny. */
export const recordingAvailable = () => hasExpoModule('ExpoAudio');

function audioDir(): Directory {
  const dir = new Directory(Paths.document, 'audio');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

/**
 * Losowy sufiks jest istotny: bez niego nagranie zastapione nowym trafialoby
 * pod ta sama nazwe, a odtwarzacz podawalby z pamieci poprzednie.
 */
const fileNameFor = (date: string, slot: number) =>
  `${date}-${slot}-${randomSuffix()}${AUDIO_EXTENSION}`;

export type PermissionResult = 'granted' | 'denied';

/**
 * Pyta o mikrofon i przelacza sesje audio w tryb nagrywania.
 *
 * `playsInSilentMode` dotyczy iPhone'a: bez tego odtwarzanie wlasnego nagrania
 * milczy, gdy telefon jest na dzwonku wyciszonym — a to jest domyslny stan
 * u wiekszosci ludzi i wyglada jak zepsute nagranie, nie jak ustawienie.
 */
export async function ensureMicrophone(): Promise<PermissionResult> {
  const current = await getRecordingPermissionsAsync();
  const granted = current.granted ? current : await requestRecordingPermissionsAsync();
  if (!granted.granted) return 'denied';

  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  return 'granted';
}

/**
 * Po nagraniu oddajemy sesje audio z powrotem.
 *
 * Na iOS pozostawiony tryb nagrywania przekierowuje dzwiek na sluchawke
 * telefoniczna zamiast na glosnik — odtwarzanie jest wtedy ledwo slyszalne.
 */
export async function releaseMicrophone(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
}

/** Przenosi swieze nagranie z katalogu tymczasowego do katalogu aplikacji. */
export async function storeRecording(
  recordedUri: string,
  date: string,
  slot: number
): Promise<string> {
  const target = new File(audioDir(), fileNameFor(date, slot));
  await new File(recordedUri).move(target);
  return target.uri;
}

/** Pobiera nagranie z chmury na nowym urzadzeniu. */
export async function downloadAudio(
  signedUrl: string,
  date: string,
  slot: number
): Promise<string> {
  const target = new File(audioDir(), fileNameFor(date, slot));
  await File.downloadFileAsync(signedUrl, target, { idempotent: true });
  return target.uri;
}

export async function readAudioBytes(localUri: string): Promise<Uint8Array> {
  return new File(localUri).bytes();
}

/** Kasowanie pliku nigdy nie moze wywrocic zapisu wpisu — stad ciche przelkniecie. */
export function deleteAudioFile(localUri: string | null): void {
  if (!localUri) return;
  try {
    const file = new File(localUri);
    if (file.exists) file.delete();
  } catch {
    // plik juz nie istnieje albo jest niedostepny — nie ma czego ratowac
  }
}

export function audioExists(localUri: string | null): boolean {
  if (!localUri) return false;
  try {
    return new File(localUri).exists;
  } catch {
    return false;
  }
}

/** "0:07", "1:24" — format znany z kazdego odtwarzacza. */
export function formatDuration(ms: number | null | undefined): string {
  const total = Math.max(0, Math.round((ms ?? 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
