import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type Palette } from '@/constants/theme';
import { getState, setState } from '@/db/entries';

/**
 * Koncept ma w ustawieniach przelacznik Jasny / Ciemny / Systemowy, wiec motyw
 * nie moze juz wynikac wprost z useColorScheme. Wybor uzytkownika siedzi
 * w SQLite razem z reszta ustawien urzadzenia.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

const MODE_KEY = 'theme_mode';

type ThemeValue = {
  colors: Palette;
  /** Rzeczywisty motyw po rozwiazaniu 'system'. */
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    void getState(MODE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setModeState(stored);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setState(MODE_KEY, next);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // useColorScheme zwraca null, gdy system nie podal preferencji — wtedy jasny.
    const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    return { colors: Colors[scheme], scheme, mode, setMode };
  }, [mode, system, setMode]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function useThemeValue(): ThemeValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('Brak ThemeProvider nad tym komponentem');
  return value;
}

export const useTheme = (): Palette => useThemeValue().colors;
export const useThemeMode = () => {
  const { mode, setMode, scheme } = useThemeValue();
  return { mode, setMode, scheme };
};
