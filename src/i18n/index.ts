import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';

import { getState, setState } from '@/db/entries';

export const LANGUAGES = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pl: 'Polski',
  pt: 'Português',
} as const;

export type Language = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as Language[];

const LANGUAGE_KEY = 'language';

const isSupported = (code: string | null | undefined): code is Language =>
  !!code && (LANGUAGE_CODES as string[]).includes(code);

/** Pierwszy jezyk urzadzenia, ktory obslugujemy; w ostatecznosci angielski. */
function deviceLanguage(): Language {
  for (const locale of getLocales()) {
    if (isSupported(locale.languageCode)) return locale.languageCode;
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    pl: { translation: pl },
    pt: { translation: pt },
  },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  // React sam zabezpiecza sie przed wstrzyknieciem, wiec podwojne escapowanie
  // tylko rozjechaloby apostrofy i znaki diakrytyczne.
  interpolation: { escapeValue: false },
});

/**
 * i18n startuje synchronicznie na jezyku urzadzenia, zeby pierwsza klatka
 * miala juz teksty. Reczny wybor uzytkownika siedzi w SQLite, wiec docieramy
 * do niego dopiero po otwarciu bazy — stad osobne wywolanie z korzenia apki.
 */
export async function applyStoredLanguage(): Promise<void> {
  const stored = await getState(LANGUAGE_KEY);
  if (isSupported(stored) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

/** `null` przywraca podazanie za jezykiem systemu. */
export async function setLanguage(language: Language | null): Promise<void> {
  if (language) {
    await setState(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
  } else {
    await setState(LANGUAGE_KEY, '');
    await i18n.changeLanguage(deviceLanguage());
  }
}

export async function getStoredLanguage(): Promise<Language | null> {
  const stored = await getState(LANGUAGE_KEY);
  return isSupported(stored) ? stored : null;
}

export default i18n;
