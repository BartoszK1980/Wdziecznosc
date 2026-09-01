import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Radius, Spacing } from '@/constants/theme';
import { countNonEmptyDays, getState, setState } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import { getAccountState } from '@/sync/supabase';

const DISMISSED_KEY = 'protect_banner_dismissed';
const MIN_DAYS = 5;

/**
 * Dopoki konto jest anonimowe, odinstalowanie aplikacji kasuje dostep do wpisow
 * bezpowrotnie — sesja zyje wylacznie w SecureStore na tym telefonie.
 *
 * Zacheta pojawia sie dopiero po piatym zapisanym dniu: wczesniej uzytkownik nie
 * ma jeszcze czego chronic, a proszenie o e-mail na pierwszym ekranie to
 * dokladnie to tarcie, ktorego chcielismy uniknac wybierajac start anonimowy.
 */
export function ProtectBanner() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        if (await getState(DISMISSED_KEY)) return;
        const account = await getAccountState();
        if (account.kind !== 'anonymous') return;
        if ((await countNonEmptyDays()) < MIN_DAYS) return;
        if (active) setVisible(true);
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('account.protectTitle')}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{t('account.protectBody')}</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            setVisible(false);
            void setState(DISMISSED_KEY, '1');
          }}
          accessibilityRole="button">
          <Text style={[styles.later, { color: colors.textMuted }]}>{t('account.later')}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/account')} accessibilityRole="button">
          <Text style={[styles.cta, { color: colors.accent }]}>{t('account.protectCta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  later: {
    fontSize: 15,
  },
  cta: {
    fontSize: 15,
    fontWeight: '600',
  },
});
