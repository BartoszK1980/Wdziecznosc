import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import type { Slot } from '@/db/db';
import { useTheme } from '@/hooks/use-theme';
import { ensureLocalPhoto } from '@/sync/sync';

type Props = {
  date: string;
  slot: Slot;
  localUri: string | null;
  photoPath: string | null;
  size: number;
};

/**
 * Pokazuje plik lokalny, jesli jest. Jesli wpis przyjechal z chmury i ma tylko
 * sciezke zdalna, zdjecie pobiera sie dopiero teraz — czyli wtedy, gdy naprawde
 * trafilo na ekran.
 */
export function EntryPhoto({ date, slot, localUri, photoPath, size }: Props) {
  const colors = useTheme();
  const [uri, setUri] = useState<string | null>(localUri);

  useEffect(() => {
    setUri(localUri);
    if (localUri || !photoPath) return;

    let active = true;
    ensureLocalPhoto(date, slot).then((downloaded) => {
      if (active) setUri(downloaded);
    });
    return () => {
      active = false;
    };
  }, [date, slot, localUri, photoPath]);

  // Bez adnotacji typu: te trzy wlasciwosci sa wspolne dla ViewStyle i ImageStyle,
  // wiec wywnioskowany typ pasuje i do placeholdera, i do zdjecia.
  const box = { width: size, height: size, borderRadius: Radius.md };

  if (!uri) {
    return (
      <View
        style={[styles.placeholder, box, { backgroundColor: colors.surface, borderColor: colors.border }]}
      />
    );
  }

  return (
    <Image
      source={uri}
      style={box}
      contentFit="cover"
      transition={150}
      // Kazde zdjecie ma losowy sufiks w nazwie, wiec cache nigdy nie pokaze
      // starego obrazka po podmianie.
      cachePolicy="disk"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
