import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import {
  ACCENT_NAMES,
  buildPalette,
  DEFAULT_ACCENT,
  type AccentName,
  type Palette,
} from '@/constants/theme';
import { getState, setState } from '@/db/entries';

/**
 * Koncept ma w ustawieniach przelacznik Jasny / Ciemny / Systemowy, wiec motyw
 * nie moze wynikac wprost z useColorScheme. Do tego doszedl wybor koloru
 * akcentu. Oba ustawienia siedza w SQLite razem z reszta preferencji urzadzenia
 * — celowo NIE w chmurze: to wyglad tego telefonu, nie dana konta.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

const MODE_KEY = 'theme_mode';
const ACCENT_KEY = 'theme_accent';

type ThemeValue = {
  colors: Palette;
  /** Rzeczywisty motyw po rozwiazaniu 'system'. */
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

const isAccent = (value: string | null): value is AccentName =>
  !!value && (ACCENT_NAMES as string[]).includes(value);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accent, setAccentState] = useState<AccentName>(DEFAULT_ACCENT);

  useEffect(() => {
    void getState(MODE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setModeState(stored);
    });
    void getState(ACCENT_KEY).then((stored) => {
      if (isAccent(stored)) setAccentState(stored);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setState(MODE_KEY, next);
  }, []);

  const setAccent = useCallback((next: AccentName) => {
    setAccentState(next);
    void setState(ACCENT_KEY, next);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // useColorScheme zwraca null, gdy system nie podal preferencji — wtedy jasny.
    const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    return { colors: buildPalette(scheme, accent), scheme, mode, setMode, accent, setAccent };
  }, [mode, system, accent, setMode, setAccent]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function useThemeValue(): ThemeValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('Brak ThemeProvider nad tym komponentem');
  return value;
}

export const useTheme = (): Palette => useThemeValue().colors;

export const useThemeMode = () => {
  const { mode, setMode, scheme, accent, setAccent } = useThemeValue();
  return { mode, setMode, scheme, accent, setAccent };
};
