import { Lora_400Regular, Lora_600SemiBold, useFonts } from '@expo-google-fonts/lora';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LockGate } from '@/components/lock-gate';
import { Fonts } from '@/constants/theme';
import { getDb } from '@/db/db';
import { useTheme, useThemeMode } from '@/hooks/use-theme';
// Ten import inicjalizuje i18n jako efekt uboczny — musi wykonac sie zanim
// jakikolwiek ekran wywola useTranslation().
import { applyStoredLanguage } from '@/i18n';
import { scheduleReminderFromSettings } from '@/notifications/reminder';
import { MonetizationProvider } from '@/monetization/provider';
import { ensureSession } from '@/sync/supabase';
import { startSyncTriggers } from '@/sync/sync';
import { ThemeProvider } from '@/theme/provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  // Serif z konceptu. Naglowki nie moga mignac czcionka systemowa i przeskoczyc
  // na Lore, wiec czekamy na font razem z reszta inicjalizacji.
  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_600SemiBold });

  useEffect(() => {
    let stopSync: (() => void) | undefined;

    (async () => {
      // Baza i jezyk musza byc gotowe przed pierwsza klatka — inaczej ekran
      // mignalby pustymi slotami i angielskimi napisami.
      await getDb();
      await applyStoredLanguage();
      setReady(true);

      // Reszta moze sie wydarzyc juz przy widocznym interfejsie. Brak sieci lub
      // nieskonfigurowana chmura nie moga zablokowac startu aplikacji.
      try {
        await ensureSession();
      } catch {
        // brak sieci przy pierwszym uruchomieniu — sync sprobuje ponownie sam
      }
      stopSync = startSyncTriggers();
      void scheduleReminderFromSettings();
    })();

    return () => stopSync?.();
  }, []);

  // Splash schodzi dopiero, gdy gotowe sa OBIE rzeczy: dane i font. Zdjecie go
  // wczesniej dawaloby przebitke naglowkow czcionka systemowa.
  const booted = ready && fontsLoaded;

  useEffect(() => {
    if (booted) void SplashScreen.hideAsync();
  }, [booted]);

  if (!booted) return null;

  return (
    <ThemeProvider>
      <MonetizationProvider>
        <LockGate>
          <Navigation />
        </LockGate>
      </MonetizationProvider>
    </ThemeProvider>
  );
}

/** Osobny komponent, bo useTheme wymaga bycia pod ThemeProvider. */
function Navigation() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { scheme } = useThemeMode();
  const dark = scheme === 'dark';

  const navigationTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
      notification: colors.accent,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: Fonts.serif, fontSize: 18 },
          headerTintColor: colors.accent,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="note/[date]"
          options={{ title: t('editor.titleNew'), presentation: 'modal' }}
        />
        <Stack.Screen name="backup" options={{ title: t('backup.title'), presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ title: t('account.title'), presentation: 'modal' }} />
        <Stack.Screen
          name="premium"
          options={{ title: t('premium.title'), presentation: 'modal' }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
