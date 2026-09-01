import { Platform } from 'react-native';

import { clearState, getState, setState } from '@/db/entries';
import i18n from '@/i18n';

/**
 * Przypomnienie jest LOKALNE — planuje je system operacyjny na urzadzeniu.
 * Zadnego serwera push, zadnego Firebase, zadnych tokenow do rotowania.
 *
 * Modul expo-notifications ladujemy LENIWIE, a nie zwyklym importem na gorze
 * pliku. Powod: w Expo Go na Androidzie (SDK 53+) sam import rzuca wyjatkiem,
 * bo wycieto stamtad powiadomienia push. Statyczny import wywracal przez to
 * cale drzewo tras aplikacji — z powodu funkcji, ktora jest calkowicie
 * opcjonalna. Teraz brak modulu wylacza tylko przypomnienia.
 */

type NotificationsModule = typeof import('expo-notifications');

const REMINDER_KEY = 'reminder_time'; // 'HH:MM'
const ANDROID_CHANNEL = 'daily-reminder';

let modulePromise: Promise<NotificationsModule | null> | null = null;

/**
 * `null`, gdy modul jest niedostepny (np. Expo Go na Androidzie).
 *
 * try/catch wewnatrz async, a nie `.catch()` na samym `import()`: modul nie
 * wysypuje sie przy ladowaniu, tylko przy WYKONYWANIU (jego kod rejestruje
 * nasluch tokenu push i rzuca wyjatkiem). Ten rzut jest synchroniczny, wiec
 * `.catch()` na wyrazeniu import go nie widzi — dopiero `await` w bloku try
 * zamienia go na odrzucenie, ktore da sie przechwycic.
 */
function loadNotifications(): Promise<NotificationsModule | null> {
  modulePromise ??= (async () => {
    try {
      return await import('expo-notifications');
    } catch {
      return null;
    }
  })();
  return modulePromise;
}

export type ReminderTime = { hour: number; minute: number };

export const DEFAULT_REMINDER: ReminderTime = { hour: 21, minute: 0 };

/** Czy na tym urzadzeniu da sie w ogole zaplanowac przypomnienie. */
export async function remindersAvailable(): Promise<boolean> {
  return (await loadNotifications()) !== null;
}

export async function getReminder(): Promise<ReminderTime | null> {
  const stored = await getState(REMINDER_KEY);
  if (!stored) return null;
  const [hour, minute] = stored.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return { hour, minute };
}

/** Zwraca false, gdy uzytkownik odmowil zgody albo modulu nie ma. */
export async function setReminder(time: ReminderTime | null): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  if (!time) {
    await clearState(REMINDER_KEY);
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;

  await setState(REMINDER_KEY, `${time.hour}:${time.minute}`);
  await schedule(Notifications, time);
  return true;
}

/**
 * Wolane przy kazdym starcie aplikacji. Powod: tresc powiadomienia jest
 * przetlumaczona i zamrozona w momencie planowania — po zmianie jezyka
 * (albo po aktualizacji apki) trzeba je przeplanowac, inaczej uzytkownik
 * dostawalby monit w poprzednim jezyku.
 */
export async function scheduleReminderFromSettings(): Promise<void> {
  const time = await getReminder();
  if (!time) return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  await schedule(Notifications, time);
}

async function schedule(Notifications: NotificationsModule, time: ReminderTime): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: i18n.t('settings.reminder'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Kasujemy przed zaplanowaniem, zeby zmiana godziny nie zostawiala starego
  // wpisu — inaczej po kilku edycjach telefon dzwonilby kilka razy dziennie.
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('today.title'),
      body: i18n.t('today.prompt'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
  });
}
