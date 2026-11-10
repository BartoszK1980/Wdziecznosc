// Nazwa aplikacji na telefonie w jezyku systemu (Android).
//
// Po co: ekran zgody na reklamy (Google UMP, komunikat RODO z AdMob) wstawia
// w miejsce %%APP_NAME%% nazwe aplikacji z telefonu. Dotad byla ona wszedzie
// polska ("Wdzięczność"), a w Google Play kazdy jezyk ma wlasna nazwe
// ("Gratitude", "Dankbarkeit"...). Tester z Hiszpanii zwrocil na to uwage
// 6.11.2026 — pierwszy ekran po instalacji wital go inna nazwa niz sklep.
// Ta sama nazwa trafia tez pod ikone na ekranie glownym.
//
// Nazwy sa krotkimi wersjami nazw ze sklepu (store/opisy/<jezyk>.md, bez
// "– dziennik"), bo pod ikona miesci sie kilkanascie znakow.
//
// Domyslna nazwa (jezyki spoza listy) jest angielska, polska jest w values-pl.
//
// Dlaczego wtyczka, a nie recznie w android/: katalog android/ jest generowany
// przez `expo prebuild` i pominiety w repozytorium.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withStringsXml, AndroidConfig } = require('expo/config-plugins');

/** Nazwa domyslna — dla jezykow, ktorych nie ma nizej. */
const DEFAULT_NAME = 'Gratitude';

/** Katalog zasobow Androida -> nazwa. */
const NAMES = {
  'values-pl': 'Wdzięczność',
  'values-en': 'Gratitude',
  'values-de': 'Dankbarkeit',
  'values-es': 'Gratitud',
  'values-fr': 'Gratitude',
  'values-it': 'Gratitudine',
  'values-pt': 'Gratidão',
};

/** Znaki specjalne w zasobach Androida: apostrof i cudzyslow trzeba poprzedzic \. */
function escapeAndroidString(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

function withDefaultName(config) {
  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'app_name' }, _: DEFAULT_NAME }],
      config.modResults,
    );
    return config;
  });
}

function withLocaleNames(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      for (const [folder, name] of Object.entries(NAMES)) {
        const dir = path.join(resDir, folder);
        fs.mkdirSync(dir, { recursive: true });
        // Osobny plik, zeby nie nadpisac innych tlumaczen, ktore moga sie tu
        // kiedys pojawic (np. z innych wtyczek).
        const xml =
          '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<resources>\n' +
          `  <string name="app_name">${escapeAndroidString(name)}</string>\n` +
          '</resources>\n';
        fs.writeFileSync(path.join(dir, 'app_name.xml'), xml, 'utf8');
      }
      return config;
    },
  ]);
}

module.exports = function withLocalizedAppName(config) {
  return withLocaleNames(withDefaultName(config));
};
