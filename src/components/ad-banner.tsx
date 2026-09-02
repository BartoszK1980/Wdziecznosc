import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bannerUnitId, loadAds, usingTestUnit, type AdsModule } from '@/monetization/ads';
import { useMonetization } from '@/monetization/provider';
import type { AdPlacement } from '@/monetization/policy';

/**
 * Baner reklamowy. Sam decyduje, czy w ogole sie pokazac — ekran wola go
 * bezwarunkowo i nie zna regul monetyzacji.
 *
 * Gdy SDK jest niedostepne (Expo Go), rysujemy zastepcze pole zamiast niczego.
 * Inaczej ekran wygladalby w Expo Go inaczej niz w prawdziwej aplikacji i nie
 * dalo by sie sprawdzic, czy baner nie zaslania tresci.
 */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { showBanner } = useMonetization();

  // Trzymamy caly modul, a nie gotowy komponent: useState traktuje funkcje jako
  // aktualizator stanu, wiec przechowywanie komponentu wymagaloby opakowywania
  // go w kolejna funkcje i psuloby typowanie propsow.
  const [ads, setAds] = useState<AdsModule | null>(null);
  const [checked, setChecked] = useState(false);

  const visible = showBanner(placement);

  useEffect(() => {
    if (!visible) return;

    let active = true;
    void loadAds().then((mod) => {
      if (!active) return;
      setAds(mod);
      setChecked(true);
    });

    return () => {
      active = false;
    };
  }, [visible]);

  if (!visible) return null;

  if (ads) {
    const { BannerAd, BannerAdSize } = ads;
    return (
      <View style={[styles.slot, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <BannerAd unitId={bannerUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
    );
  }

  // SDK jeszcze sie laduje — nie rezerwujemy miejsca, zeby tresc nie skakala.
  if (!checked) return null;

  return (
    <View
      style={[
        styles.placeholder,
        { backgroundColor: colors.surfaceWarm, borderColor: colors.border },
      ]}>
      <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
        {usingTestUnit() ? t('ads.placeholderTest') : t('ads.placeholder')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.xs,
    /**
     * Odstep od paska zakladek MUSI byc wiekszy niz wyniesienie przycisku "+"
     * (Spacing.lg w tab-bar.tsx). Inaczej przycisk naklada sie na dolna krawedz
     * banera — a regulamin AdMob zabrania zaslaniania reklam czymkolwiek
     * i grozi za to zablokowaniem konta.
     */
    marginBottom: Spacing.lg + Spacing.sm,
  },
  placeholder: {
    height: 50,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg + Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
  },
});
