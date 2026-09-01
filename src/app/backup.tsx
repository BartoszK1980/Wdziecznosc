import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Heading, Muted, PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getDb } from '@/db/db';
import { getState } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import { getAccountState, type AccountState } from '@/sync/supabase';
import { getSyncStatus, subscribeSyncStatus, syncNow, type SyncStatus } from '@/sync/sync';

/**
 * "Kopia zapasowa" z konceptu to u nas synchronizacja z Supabase — nie ma
 * osobnego mechanizmu tworzenia kopii, bo wpisy i tak jada do chmury po kazdej
 * zmianie. Ten ekran pokazuje, czy naprawde dojechaly.
 */
export default function BackupScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();

  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [pending, setPending] = useState(0);
  const [lastPulled, setLastPulled] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountState>({ kind: 'offline' });

  const refresh = useCallback(async () => {
    const db = await getDb();
    const entries = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM entries WHERE dirty = 1 OR photo_dirty = 1'
    );
    const days = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM days WHERE dirty = 1');
    setPending((entries?.n ?? 0) + (days?.n ?? 0));
    setLastPulled(await getState('last_pulled_at'));
    setAccount(await getAccountState());
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeSyncStatus((next) => {
      setStatus(next);
      void refresh();
    });
  }, [refresh]);

  const when =
    lastPulled && lastPulled !== '1970-01-01T00:00:00.000Z'
      ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(lastPulled)
        )
      : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <Heading size={24}>{t('backup.title')}</Heading>
        <Muted>{t('backup.explain')}</Muted>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Feather
              name={pending === 0 ? 'check-circle' : 'upload-cloud'}
              size={20}
              color={pending === 0 ? colors.sage : colors.gold}
            />
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {pending === 0 ? t('backup.allSynced') : t('backup.pending', { count: pending })}
            </Text>
          </View>

          <View style={styles.row}>
            <Feather name="clock" size={20} color={colors.sage} />
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
              {when ? t('backup.syncedAt', { when }) : t('backup.never')}
            </Text>
          </View>

          {account.kind === 'anonymous' ? (
            <View style={styles.row}>
              <Feather name="alert-circle" size={20} color={colors.gold} />
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                {t('account.protectBody')}
              </Text>
            </View>
          ) : null}
        </Card>

        <PrimaryButton
          icon="refresh-cw"
          label={status === 'syncing' ? t('sync.syncing') : t('backup.syncNow')}
          disabled={status === 'syncing'}
          onPress={() => void syncNow().then(refresh)}
        />

        {status === 'error' ? <Muted size={13}>{t('sync.error')}</Muted> : null}
        {status === 'offline' ? <Muted size={13}>{t('sync.offline')}</Muted> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.md },
  card: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowLabel: { flex: 1, fontSize: 15, lineHeight: 21 },
});
