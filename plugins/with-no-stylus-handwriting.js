// Wylacza pisanie rysikiem w polach tekstowych na Androidzie.
//
// Android 14 (API 34) wlacza te funkcje DOMYSLNIE dla kazdego pola tekstowego.
// Przy dotknieciu pola rysikiem system pokazuje wlasne okno onboardingu
// ("Try out your stylus") i przechodzi w tryb odrecznego pisania. W dzienniku
// wdziecznosci to tylko przeszkoda: pole ma dwa zdania, a nie formularz.
//
// React Native nie ma na to zadnej wlasciwosci — w jego zrodlach nie ma nawet
// wzmianki o handwriting. Ustawiamy to wiec po stronie natywnej.
//
// Dlaczego przez motyw, a nie w kodzie: ReactEditText dziedziczy po
// AppCompatEditText(context), a ten konstruktor stosuje styl wskazany
// w motywie przez `android:editTextStyle`. Jeden wpis obejmuje wiec wszystkie
// pola w aplikacji, bez dotykania kodu JavaScript.
//
// Dlaczego wtyczka, a nie recznie w android/: katalog android/ jest generowany
// przez `expo prebuild` i pominiety w repozytorium. Reczna zmiana zniknelaby
// przy najblizszym przebudowaniu.
const { withAndroidStyles } = require('expo/config-plugins');

/** Nazwa stylu dopisywanego do zasobow. */
const STYLE_NAME = 'RNEditTextNoHandwriting';

/**
 * Atrybut istnieje od API 33. Na starszych systemach jest po prostu ignorowany,
 * a kompilacja przechodzi, bo projekt kompiluje sie nowszym SDK.
 */
const ATTRIBUTE = 'android:autoHandwritingEnabled';

module.exports = function withNoStylusHandwriting(config) {
  return withAndroidStyles(config, (config) => {
    const resources = config.modResults.resources;
    resources.style = resources.style ?? [];

    // 1. Styl dla pol tekstowych.
    const existing = resources.style.find((style) => style.$?.name === STYLE_NAME);
    if (!existing) {
      resources.style.push({
        $: { name: STYLE_NAME, parent: 'Widget.AppCompat.EditText' },
        item: [
          { $: { name: ATTRIBUTE }, _: 'false' },
          // Tlo zostaje takie, jakie ustawia szablon Expo w AppTheme — bez tego
          // wlasny styl podmienilby je na domyslne z AppCompat i pola tekstowe
          // zmienilyby wyglad.
          { $: { name: 'android:background' }, _: '@drawable/rn_edit_text_material' },
        ],
      });
    }

    // 2. Wskazanie tego stylu w motywie aplikacji.
    const appTheme = resources.style.find((style) => style.$?.name === 'AppTheme');
    if (appTheme) {
      appTheme.item = appTheme.item ?? [];
      const alreadySet = appTheme.item.some((item) => item.$?.name === 'android:editTextStyle');
      if (!alreadySet) {
        appTheme.item.push({ $: { name: 'android:editTextStyle' }, _: `@style/${STYLE_NAME}` });
      }
    }

    return config;
  });
};
