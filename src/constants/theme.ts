import { Platform } from 'react-native';

/**
 * Paleta i skala pochodza z konceptu wizualnego dostarczonego przez klienta
 * (assets/brand/design-manifest.json, assets/brand/palette-reference.png).
 * Charakter: ciepla, botaniczna, spokojna — kremowe tlo, szalwiowa zielen,
 * ciemna zielen na akcje, zloto na akcenty.
 *
 * Koncept jest narysowany wylacznie w wariancie jasnym, ale sam przewiduje
 * przelacznik Jasny / Ciemny / Systemowy, wiec wariant ciemny jest wyprowadzony:
 * te same relacje (tlo < powierzchnia < ciepla powierzchnia), zielenie i zloto
 * rozjasnione tak, zeby utrzymac kontrast na ciemnym tle.
 */
const base = {
  light: {
    /** #FBF6F0 — kremowe tlo calej aplikacji */
    bg: '#FBF6F0',
    /** #FFFDFC — biale karty (notatki, listy) */
    surface: '#FFFDFC',
    /** #F1E4D6 — ciepla karta wyrozniona ("Notatka na dzis", seria dni) */
    surfaceWarm: '#F1E4D6',
    text: '#263A32',
    textMuted: '#817B73',
    /** #ECAF44 — zloto: numery wpisow, iskry w logo, wyroznienia */
    gold: '#ECAF44',
    border: '#EAE1D6',
  },
  dark: {
    bg: '#141A17',
    surface: '#1D2420',
    surfaceWarm: '#2A2521',
    text: '#EDE9E2',
    textMuted: '#9AA29B',
    gold: '#E9B45C',
    border: '#2E3833',
  },
} as const;

/**
 * Kolory akcentu do wyboru w ustawieniach.
 *
 * Kazdy wariant to PARA: mocny kolor na przyciski i aktywne elementy oraz
 * jasniejszy odcien tej samej rodziny na ikony i stany drugoplanowe. Dobrane
 * recznie, a nie wyliczone przez rozjasnianie — automatyczne jasnienie zieleni
 * daje szarosc, a terakoty roz.
 *
 * Tlo, powierzchnie i zloto zostaja bez zmian, wiec kazdy wybor trzyma sie
 * ciepla oryginalnego konceptu.
 */
export const ACCENTS = {
  sage: {
    light: { accent: '#3E6654', sage: '#738C78' },
    dark: { accent: '#7FA48C', sage: '#8FA894' },
  },
  ocean: {
    light: { accent: '#35617F', sage: '#7391A5' },
    dark: { accent: '#7BA6C4', sage: '#8FA9BC' },
  },
  terracotta: {
    light: { accent: '#A05541', sage: '#B98878' },
    dark: { accent: '#D08D77', sage: '#BE988A' },
  },
  plum: {
    light: { accent: '#6B4A6E', sage: '#9B84A0' },
    dark: { accent: '#A98BAE', sage: '#A995AD' },
  },
  graphite: {
    light: { accent: '#454B4F', sage: '#838B90' },
    dark: { accent: '#9AA4AA', sage: '#8F989D' },
  },
  amber: {
    light: { accent: '#9A6520', sage: '#B99460' },
    dark: { accent: '#D9A45E', sage: '#C0A075' },
  },
} as const;

export type AccentName = keyof typeof ACCENTS;
export const ACCENT_NAMES = Object.keys(ACCENTS) as AccentName[];
export const DEFAULT_ACCENT: AccentName = 'sage';

export type Palette = {
  bg: string;
  surface: string;
  surfaceWarm: string;
  text: string;
  textMuted: string;
  gold: string;
  border: string;
  accent: string;
  sage: string;
};

export function buildPalette(scheme: 'light' | 'dark', accent: AccentName): Palette {
  return { ...base[scheme], ...ACCENTS[accent][scheme] };
}

/** Domyslna paleta — uzywana tam, gdzie kontekst motywu jeszcze nie istnieje. */
export const Colors = {
  light: buildPalette('light', DEFAULT_ACCENT),
  dark: buildPalette('dark', DEFAULT_ACCENT),
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Koncept konsekwentnie uzywa duzych zaokraglen — stad hojna skala. */
export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Miekki, niskokontrastowy cien z konceptu ("shadows: soft, low-contrast").
 * Na Androidzie `elevation` renderuje sie inaczej niz cien iOS, wiec trzymamy
 * go nisko — inaczej karty na kremowym tle dostaja szara obwodke.
 */
export const CardShadow = {
  shadowColor: '#3E3226',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Naglowki to serif (Lora), tekst interfejsu — czcionka systemowa.
 * Wprost z konceptu: "editorial serif for headings + clean sans-serif for UI text".
 * Sans zostaje systemowy, zeby aplikacja startowala bez czekania na plik fontu.
 */
export const Fonts = {
  serif: 'Lora_600SemiBold',
  serifRegular: 'Lora_400Regular',
} as const;

export const MaxContentWidth = 640;
