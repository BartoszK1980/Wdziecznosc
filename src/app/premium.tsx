import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Heading, Muted, PrimaryButton } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  annualOffer,
  isPurchasingConfigured,
  purchaseAnnual,
  restorePurchases,
  type Offer,
} from '@/monetization/entitlement';
import { useMonetization } from '@/monetization/provider';

export default function PremiumScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { premium, refresh } = useMonetization();

  const [offer, setOffer] = useState<Offer>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void annualOffer().then((next) => {
      if (!active) return;
      setOffer(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const buy = async () => {
    setBusy(true);
    try {
      const result = await purchaseAnnual();
      if (result === 'purchased') {
        await refresh();
        router.back();
        return;
      }
      // Rezygnacja uzytkownika to nie blad — milczymy.
      if (result === 'cancelled') return;
      Alert.alert(t('premium.title'), t('premium.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const active = await restorePurchases();
      await refresh();
      Alert.alert(t('premium.title'), active ? t('premium.restored') : t('premium.nothingToRestore'));
    } finally {
      setBusy(false);
    }
  };

  if (premium) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Feather name="check-circle" size={40} color={colors.accent} />
        <Heading size={22}>{t('premium.activeTitle')}</Heading>
        <Muted>{t('premium.activeBody')}</Muted>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <Heading size={26}>{t('premium.title')}</Heading>
        <Muted>{t('premium.subtitle')}</Muted>

        <Card warm style={styles.benefits}>
          {['noAds', 'support', 'sameFeatures'].map((key) => (
            <View key={key} style={styles.benefit}>
              <Feather name="check" size={18} color={colors.accent} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t(`premium.${key}`)}
              </Text>
            </View>
          ))}
        </Card>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : offer ? (
          <>
            <View style={[styles.price, { borderColor: colors.accent }]}>
              <Text style={[styles.priceValue, { color: colors.text }]}>{offer.priceString}</Text>
              <Muted size={13}>{t('premium.perYear')}</Muted>
            </View>
            <PrimaryButton label={t('premium.buy')} onPress={() => void buy()} disabled={busy} />
          </>
        ) : (
          <Card style={styles.unavailable}>
            <Feather name="alert-circle" size={20} color={colors.gold} />
            <Muted size={14}>
              {isPurchasingConfigured() ? t('premium.unavailable') : t('premium.notConfigured')}
            </Muted>
          </Card>
        )}

        <Pressable onPress={() => void restore()} disabled={busy} accessibilityRole="button">
          <Text style={[styles.restore, { color: colors.accent }]}>{t('premium.restore')}</Text>
        </Pressable>

        <Muted size={12}>{t('premium.legal')}</Muted>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, alignItems: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.md },
  benefits: { gap: Spacing.md, padding: Spacing.lg },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  benefitText: { flex: 1, fontSize: 15, lineHeight: 21 },
  loader: { paddingVertical: Spacing.lg },
  price: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  priceValue: { fontFamily: Fonts.serif, fontSize: 28 },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  restore: { fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: Spacing.sm },
});
