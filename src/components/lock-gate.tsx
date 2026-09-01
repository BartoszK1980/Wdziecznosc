import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, View } from 'react-native';

import { Heading, Muted, PrimaryButton } from './ui';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authenticate, isLockEnabled } from '@/lock/lock';

/**
 * Zaslania aplikacje, dopoki uzytkownik sie nie uwierzytelni.
 *
 * Zamyka sie ponownie po powrocie z tla, a nie tylko przy zimnym starcie —
 * inaczej blokada nie chronilaby przed najczestszym przypadkiem, czyli
 * odblokowaniem lezacego telefonu przez kogos innego.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const prompting = useRef(false);

  const prompt = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      setUnlocked(await authenticate());
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    void isLockEnabled().then((on) => {
      setEnabled(on);
      if (on) void prompt();
    });
  }, [prompt]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') setUnlocked(false);
      if (state === 'active') void prompt();
    });
    return () => subscription.remove();
  }, [enabled, prompt]);

  // Dopoki nie wiemy, czy blokada jest wlaczona, nie pokazujemy nic — mignięcie
  // trescia przed monitem byloby dokladnie tym wyciekiem, ktoremu zapobiegamy.
  if (enabled === null) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!enabled || unlocked) return <>{children}</>;

  return (
    <View style={[styles.gate, { backgroundColor: colors.bg }]}>
      <Heading size={24}>{t('lock.locked')}</Heading>
      <Muted>{t('lock.prompt')}</Muted>
      <PrimaryButton label={t('lock.unlock')} icon="unlock" onPress={() => void prompt()} />
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
});
