// Oznacza funkcje sprzetowe jako OPCJONALNE w manifescie Androida.
//
// Google Play sam wywnioskowal dwie wymagane funkcje, ktorych nigdzie nie
// deklarujemy wprost, i ukrywal aplikacje przed urzadzeniami bez nich
// (Play Console, listopad 2026: "Deklaracje wymaganych funkcji sprzetowych
// ograniczaja dostepnosc aplikacji"):
//
// - android.hardware.screen.portrait — wynika z "orientation": "portrait"
//   w app.json. Zablokowana orientacja nie znaczy, ze ekran MUSI umiec pion;
//   tablety i Chromebooki w poziomie po prostu pokaza aplikacje w pionie.
// - android.hardware.wifi — wynika z uprawnienia ACCESS_WIFI_STATE, ktore
//   dokleja @react-native-community/netinfo. Sprawdzamy tylko, czy jest siec;
//   dane komorkowe czy Ethernet wystarcza tak samo.
//
// Jawne <uses-feature android:required="false"> ma pierwszenstwo przed
// funkcjami wywnioskowanymi z orientacji i uprawnien.
//
// Wtyczka, a nie reczna zmiana w android/, z tego samego powodu co
// with-no-stylus-handwriting: katalog android/ jest generowany przez prebuild.
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL_FEATURES = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

module.exports = function withOptionalHardware(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] ?? [];

    for (const name of OPTIONAL_FEATURES) {
      const existing = manifest['uses-feature'].find((f) => f.$?.['android:name'] === name);
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
      }
    }

    return config;
  });
};
