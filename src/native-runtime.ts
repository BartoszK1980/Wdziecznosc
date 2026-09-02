import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Rozpoznawanie srodowiska natywnego.
 *
 * Kilka bibliotek wywraca aplikacje juz przy zaladowaniu, gdy brakuje ich czesci
 * natywnej. `try/catch` wokol `await import(...)` NIE wystarcza: w Metro kod
 * modulu wykonuje sie wewnatrz oddzwonienia obietnicy (`asyncRequireModule`),
 * wiec rzucony tam wyjatek nie trafia do `catch` przy `await` — konczy sie
 * nieobsluzonym odrzuceniem i czerwonym ekranem.
 *
 * Dlatego pytamy o dostepnosc PRZED importem, a nie probujemy sprzatac po fakcie.
 */

/** Czy aplikacja dziala w kliencie Expo Go, a nie we wlasnym buildzie. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Czy modul natywny o podanej nazwie jest wkompilowany w te aplikacje.
 *
 * `TurboModuleRegistry.get` (bez "Enforcing") zwraca null zamiast rzucac.
 * Sprawdzamy tez stary rejestr NativeModules, bo nie kazda biblioteka zostala
 * juz przepisana na TurboModule.
 */
export function hasNativeModule(name: string): boolean {
  try {
    if (TurboModuleRegistry.get(name) != null) return true;
  } catch {
    // starsze wersje potrafia rzucic zamiast zwrocic null — traktujemy jak brak
  }

  try {
    return (NativeModules as Record<string, unknown>)[name] != null;
  } catch {
    return false;
  }
}
