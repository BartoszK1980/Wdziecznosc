import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Chip, Heading, Muted, SectionLabel } from '@/components/ui';
import { ACCENTS, ACCENT_NAMES, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { exportEntriesJson } from '@/db/export';
import { useTheme, useThemeMode } from '@/hooks/use-theme';
import { getStoredLanguage, LANGUAGES, LANGUAGE_CODES, setLanguage, type Language } from '@/i18n';
import { formatTime } from '@/i18n/dates';
import { isLockEnabled, setLockEnabled, supportsLock } from '@/lock/lock';
import {
  DEFAULT_REMINDER,
  getReminder,
  remindersAvailable,
  setReminder,
  type ReminderTime,
} from '@/notifications/reminder';
import { getAccountState, type AccountState } from '@/sync/supabase';
import type { ThemeMode } from '@/theme/provider';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { mode: 'light', label: 'settings.themeLight', icon: 'sun' },
  { mode: 'dark', label: 'settings.themeDark', icon: 'moon' },
  { mode: 'system', label: 'settings.themeSystem', icon: 'smartphone' },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const { mode, setMode, scheme, accent, setAccent } = useThemeMode();
  const router = useRouter();

  const [language, setLanguageState] = useState<Language | null>(null);
  const [reminder, setReminderState] = useState<ReminderTime | null>(null);
  const [account, setAccount] = useState<AccountState>({ kind: 'offline' });
  const [lock, setLock] = useState(false);
  const [lockAvailable, setLockAvailable] = useState(true);
  const [reminderAvailable, setReminderAvailable] = useState(true);
  const [iosPicker, setIosPicker] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getStoredLanguage().then(setLanguageState);
      void getReminder().then(setReminderState);
      void getAccountState().then(setAccount);
      void isLockEnabled().then(setLock);
      void supportsLock().then(setLockAvailable);
      void remindersAvailable().then(setReminderAvailable);
    }, [])
  );

  const applyReminder = async (time: ReminderTime | null) => {
    const ok = await setReminder(time);
    if (!ok) {
      Alert.alert(t('settings.reminder'), t('settings.reminderUnavailable'));
      return;
    }
    setReminderState(time);
  };

  const openTimePicker = () => {
    const current = reminder ?? DEFAULT_REMINDER;
    const value = new Date();
    value.setHours(current.hour, current.minute, 0, 0);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        is24Hour: true,
        onChange: (event, selected) => {
          if (event.type !== 'set' || !selected) return;
          void applyReminder({ hour: selected.getHours(), minute: selected.getMinutes() });
        },
      });
    } else {
      setIosPicker(true);
    }
  };

  const toggleLock = async (next: boolean) => {
    const ok = await setLockEnabled(next);
    if (!ok) {
      Alert.alert(t('settings.lock'), t('settings.lockUnavailable'));
      return;
    }
    setLock(next);
  };

  const accountValue =
    account.kind === 'linked'
      ? account.email
      : account.kind === 'anonymous'
        ? t('account.protectCta')
        : t('sync.offline');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
          <Heading size={26}>{t('settings.title')}</Heading>

          <Card style={styles.group}>
            <Row
              icon="bell"
              label={t('settings.reminder')}
              hint={reminderAvailable ? undefined : t('settings.reminderUnavailable')}
              last={!reminder}>
              <Switch
                value={reminder !== null}
                disabled={!reminderAvailable}
                onValueChange={(on) => void applyReminder(on ? DEFAULT_REMINDER : null)}
                trackColor={{ true: colors.accent }}
              />
            </Row>
            {reminder ? (
              <Row icon="clock" label={t('settings.reminder')} onPress={openTimePicker} last>
                <View style={[styles.pill, { backgroundColor: colors.surfaceWarm }]}>
                  <Text style={[styles.pillText, { color: colors.text }]}>
                    {formatTime(reminder.hour, reminder.minute, i18n.language)}
                  </Text>
                </View>
              </Row>
            ) : null}
          </Card>

          <View style={styles.section}>
            <SectionLabel>{t('settings.theme')}</SectionLabel>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.mode}
                  accessibilityRole="button"
                  accessibilityState={mode === option.mode ? { selected: true } : {}}
                  onPress={() => setMode(option.mode)}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: mode === option.mode ? colors.accent : colors.border,
                      borderWidth: mode === option.mode ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}>
                  <Feather
                    name={option.icon}
                    size={20}
                    color={mode === option.mode ? colors.gold : colors.textMuted}
                  />
                  <Text style={[styles.themeLabel, { color: colors.text }]}>{t(option.label)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel>{t('settings.accent')}</SectionLabel>
            <View style={styles.accentRow}>
              {ACCENT_NAMES.map((name) => {
                const swatch = ACCENTS[name][scheme];
                const selected = accent === name;
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={t(`accents.${name}`)}
                    accessibilityState={selected ? { selected: true } : {}}
                    onPress={() => setAccent(name)}
                    style={styles.accentItem}>
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: swatch.accent,
                          // Obwodka rysowana kolorem tla, a nie brakiem obwodki:
                          // inaczej zaznaczony kafelek skakalby o 3 px.
                          borderColor: selected ? colors.text : colors.bg,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.accentLabel,
                        { color: selected ? colors.text : colors.textMuted },
                      ]}
                      numberOfLines={1}>
                      {t(`accents.${name}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel>{t('settings.language')}</SectionLabel>
            <Card style={styles.group}>
              <Row
                icon="globe"
                label={t('settings.language')}
                onPress={() => setLanguagesOpen((open) => !open)}
                last={!languagesOpen}>
                <Text style={[styles.value, { color: colors.textMuted }]}>
                  {language ? LANGUAGES[language] : t('settings.languageSystem')}
                </Text>
                <Feather name={languagesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Row>

              {languagesOpen ? (
                <View style={styles.languages}>
                  <Chip
                    label={t('settings.languageSystem')}
                    selected={language === null}
                    onPress={() => {
                      void setLanguage(null);
                      setLanguageState(null);
                    }}
                  />
                  {LANGUAGE_CODES.map((code) => (
                    <Chip
                      key={code}
                      label={LANGUAGES[code]}
                      selected={language === code}
                      onPress={() => {
                        void setLanguage(code);
                        setLanguageState(code);
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          </View>

          <Card style={styles.group}>
            <Row icon="cloud" label={t('settings.backup')} onPress={() => router.push('/backup')}>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Row>
            <Row icon="user" label={t('settings.account')} onPress={() => router.push('/account')}>
              <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
                {accountValue}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Row>
            <Row icon="download" label={t('settings.export')} onPress={() => void exportEntriesJson()}>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Row>
            <Row icon="lock" label={t('settings.lock')} hint={t('settings.lockHint')} last>
              <Switch
                value={lock}
                disabled={!lockAvailable}
                onValueChange={(next) => void toggleLock(next)}
                trackColor={{ true: colors.accent }}
              />
            </Row>
          </Card>

          <View style={styles.about}>
            <Muted size={13}>
              {t('settings.version')} {Constants.expoConfig?.version ?? '—'}
            </Muted>
          </View>
        </View>
      </ScrollView>

      {iosPicker && reminder ? (
        <DateTimePicker
          value={(() => {
            const date = new Date();
            date.setHours(reminder.hour, reminder.minute, 0, 0);
            return date;
          })()}
          mode="time"
          display="spinner"
          onChange={(event, selected) => {
            setIosPicker(false);
            if (event.type !== 'set' || !selected) return;
            void applyReminder({ hour: selected.getHours(), minute: selected.getMinutes() });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  hint,
  children,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  hint?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const colors = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}>
      <Feather name={icon} size={19} color={colors.sage} />
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );

  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    alignItems: 'center',
  },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  group: { padding: 0, paddingHorizontal: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 54,
  },
  rowText: { flex: 1, gap: 1 },
  label: { fontSize: 16 },
  hint: { fontSize: 12 },
  value: { fontSize: 14, maxWidth: 150 },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  pillText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  themeLabel: { fontSize: 13, fontWeight: '500' },
  accentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  accentItem: { alignItems: 'center', gap: Spacing.xs, width: 68 },
  swatch: { width: 40, height: 40, borderRadius: Radius.pill, borderWidth: 3 },
  accentLabel: { fontSize: 11 },
  languages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  about: { alignItems: 'center', paddingTop: Spacing.sm },
});
