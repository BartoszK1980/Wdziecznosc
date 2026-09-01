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
export const Colors = {
  light: {
    /** #FBF6F0 — kremowe tlo calej aplikacji */
    bg: '#FBF6F0',
    /** #FFFDFC — biale karty (notatki, listy) */
    surface: '#FFFDFC',
    /** #F1E4D6 — ciepla karta wyrozniona ("Notatka na dzis", seria dni) */
    surfaceWarm: '#F1E4D6',
    text: '#263A32',
    textMuted: '#817B73',
    /** #3E6654 — ciemna zielen: przyciski, FAB, aktywna zakladka */
    accent: '#3E6654',
    /** #738C78 — szalwia: ikony, znak marki, stany drugoplanowe */
    sage: '#738C78',
    /** #ECAF44 — zloto: numery slotow, iskry w logo, wyroznienia */
    gold: '#ECAF44',
    border: '#EAE1D6',
  },
  dark: {
    bg: '#141A17',
    surface: '#1D2420',
    surfaceWarm: '#2A2521',
    text: '#EDE9E2',
    textMuted: '#9AA29B',
    accent: '#7FA48C',
    sage: '#8FA894',
    gold: '#E9B45C',
    border: '#2E3833',
  },
} as const;

/**
 * Record<..., string>, a nie `typeof Colors.light` — inaczej `as const` zawezilby
 * typ do konkretnych literalow ('#FBF6F0'), przez co paleta ciemna przestalaby
 * pasowac do jasnej.
 */
export type Palette = Record<keyof typeof Colors.light, string>;

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
