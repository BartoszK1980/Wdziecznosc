// Konfiguracja dynamiczna. Zrodlem prawdy pozostaje app.json — ten plik tylko
// nadpisuje JEDNO ustawienie zaleznie od trybu uruchomienia.
//
// Po co: React Compiler przetwarza kazdy modul osobno i w trybie deweloperskim
// wydluza pierwsze budowanie paczki z sekund do kilkunastu minut. Zmierzone na
// tym projekcie 16 wrzesnia 2026 na emulatorze: z kompilatorem paczka nie
// zbudowala sie w 15 minut i trzeba bylo przerwac, bez niego byla gotowa po 32
// sekundach. Praca na emulatorze przestawala byc mozliwa.
//
// W wersji produkcyjnej kompilator zostaje, bo tam liczy sie wydajnosc gotowej
// aplikacji, a budowanie i tak wykonuje sie raz.
//
// Polaryzacja jest celowa: wlaczamy wszedzie POZA trybem deweloperskim, a nie
// "tylko gdy produkcja". `expo start` ustawia NODE_ENV na "development", ale
// przy niektorych sciezkach budowania wydania zmienna bywa nieustawiona —
// przy odwrotnym warunku kompilator wypadlby wtedy po cichu z gotowej paczki.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    reactCompiler: process.env.NODE_ENV !== 'development',
  },
});
