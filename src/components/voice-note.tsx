import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/audio/audio';
import { Radius, Spacing } from '@/constants/theme';
import type { Voice } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  voice: Voice | null;
  editable: boolean;
  recording: boolean;
  /** Czas trwania biezacego nagrania, w milisekundach. */
  recordingMs: number;
  playing: boolean;
  playedMs: number;
  onStopRecord: () => void;
  onTogglePlay: () => void;
  onRemove: () => void;
};

/**
 * Pasek notatki glosowej pod wdziecznoscia.
 *
 * Trzy stany, nigdy dwa naraz: trwa nagrywanie, jest nagranie do odsluchania,
 * albo nie ma nic (wtedy komponent sie nie rysuje — przycisk nagrywania stoi
 * w rzedzie ze zdjeciami, zeby puste wdziecznosci nie rosly o kolejny wiersz).
 */
export function VoiceNote({
  voice,
  editable,
  recording,
  recordingMs,
  playing,
  playedMs,
  onStopRecord,
  onTogglePlay,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const colors = useTheme();

  if (recording) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text style={[styles.label, { color: colors.text }]}>{t('voice.recording')}</Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatDuration(recordingMs)}
        </Text>
        <Pressable
          onPress={onStopRecord}
          hitSlop={Spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={t('voice.stop')}
          style={[styles.action, { backgroundColor: colors.danger }]}>
          <Feather name="square" size={14} color={colors.surface} />
        </Pressable>
      </View>
    );
  }

  if (!voice) return null;

  const total = voice.durationMs ?? 0;
  // Bez znanej dlugosci nie da sie narysowac postepu uczciwie — wtedy pasek
  // zostaje pusty, zamiast udawac pozycje, ktorej nie znamy.
  const progress = total > 0 ? Math.min(1, playedMs / total) : 0;

  return (
    <View style={[styles.bar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Pressable
        onPress={onTogglePlay}
        hitSlop={Spacing.sm}
        accessibilityRole="button"
        accessibilityLabel={playing ? t('voice.pause') : t('voice.play')}
        style={[styles.action, { backgroundColor: colors.accent }]}>
        <Feather name={playing ? 'pause' : 'play'} size={14} color={colors.surface} />
      </Pressable>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[styles.fill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]}
        />
      </View>

      <Text style={[styles.time, { color: colors.textMuted }]}>
        {formatDuration(playing || playedMs > 0 ? playedMs : total)}
      </Text>

      {editable ? (
        <Pressable
          onPress={onRemove}
          hitSlop={Spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={t('voice.remove')}>
          <Feather name="trash-2" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  action: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    marginLeft: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  time: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'right',
  },
});
