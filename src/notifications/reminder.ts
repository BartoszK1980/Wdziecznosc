import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { clearState, getState, setState } from '@/db/entries';
import i18n from '@/i18n';

/**
 * Przypomnienie jest LOKALNE — planuje je system operacyjny na urzadzeniu.
 * Zadnego serwera push, zadnego Firebase, zadnych tokenow do rotowania.
 */

const REMINDER_KEY = 'reminder_time'; // 'HH:MM'
const ANDROID_CHANNEL = 'daily-reminder';

export type ReminderTime = { hour: number; minute: number };

export const DEFAULT_REMINDER: ReminderTime = { hour: 21, minute: 0 };

export async function getReminder(): Promise<ReminderTime | null> {
  const stored = await getState(REMINDER_KEY);
  if (!stored) return null;
  const [hour, minute] = stored.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return { hour, minute };
}

/** Zwraca false, gdy uzytkownik nie zgodzil sie na powiadomienia. */
export async function setReminder(time: ReminderTime | null): Promise<boolean> {
  if (!time) {
    await clearState(REMINDER_KEY);
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  }

  const granted = await requestPermission();
  if (!granted) return false;

  await setState(REMINDER_KEY, `${time.hour}:${time.minute}`);
  await schedule(time);
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

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  await schedule(time);
}

async function schedule(time: ReminderTime): Promise<void> {
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

async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}
