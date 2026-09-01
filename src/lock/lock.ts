import * as LocalAuthentication from 'expo-local-authentication';

import { getState, setState } from '@/db/entries';
import i18n from '@/i18n';

/**
 * "Haslo / Blokada" z konceptu zrealizowane odciskiem palca albo kodem
 * urzadzenia, a nie wlasnym haslem.
 *
 * Powod jest praktyczny: wlasne haslo trzeba gdzies przechowac, obsluzyc jego
 * reset i wytlumaczyc uzytkownikowi, ze zapomniane haslo oznacza utrate dostepu
 * do wpisow na tym telefonie. Blokada systemowa nie wymaga niczego z tych rzeczy,
 * a chroni dokladnie tak samo — bo i tak chodzi o to, zeby ktos inny nie
 * przeczytal wpisow po siegnieciu po lezacy telefon.
 */

const LOCK_KEY = 'app_lock';

/** Blokada wymaga, zeby urzadzenie mialo w ogole ustawiony jakis zamek. */
export async function supportsLock(): Promise<boolean> {
  return LocalAuthentication.isEnrolledAsync();
}

export async function isLockEnabled(): Promise<boolean> {
  return (await getState(LOCK_KEY)) === '1';
}

/** Zwraca false, gdy urzadzenie nie ma ustawionej blokady ekranu. */
export async function setLockEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    await setState(LOCK_KEY, '0');
    return true;
  }

  if (!(await supportsLock())) return false;

  // Wlaczenie blokady potwierdzamy od razu — inaczej uzytkownik dowiedzialby sie,
  // ze cos nie dziala, dopiero przy nastepnym uruchomieniu aplikacji.
  if (!(await authenticate())) return false;

  await setState(LOCK_KEY, '1');
  return true;
}

export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: i18n.t('lock.prompt'),
    cancelLabel: i18n.t('common.cancel'),
    // Kod urzadzenia jako zapas: czytelnik z odciskiem bywa zawodny, a bez tego
    // uzytkownik z mokrymi rekami zostalby zamkniety poza wlasnymi zapiskami.
    disableDeviceFallback: false,
  });
  return result.success;
}
