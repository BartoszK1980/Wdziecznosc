import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import type { Slot } from '@/db/db';
import type { Photo } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import { ensureLocalPhoto } from '@/sync/sync';

type Props = {
  date: string;
  slot: Slot;
  photo: Photo;
  size: number;
};

/**
 * Pokazuje plik lokalny, jesli jest. Jesli wpis przyjechal z chmury i ma tylko
 * sciezke zdalna, zdjecie pobiera sie dopiero teraz — czyli wtedy, gdy naprawde
 * trafilo na ekran.
 */
export function EntryPhoto({ date, slot, photo, size }: Props) {
  const colors = useTheme();
  const [uri, setUri] = useState<string | null>(photo.localUri);

  useEffect(() => {
    setUri(photo.localUri);
    if (photo.localUri || !photo.path) return;

    let active = true;
    ensureLocalPhoto(date, slot, photo.position).then((downloaded) => {
      if (active) setUri(downloaded);
    });
    return () => {
      active = false;
    };
  }, [date, slot, photo.position, photo.localUri, photo.path]);

  // Bez adnotacji typu: te trzy wlasciwosci sa wspolne dla ViewStyle i ImageStyle,
  // wiec wywnioskowany typ pasuje i do placeholdera, i do zdjecia.
  const box = { width: size, height: size, borderRadius: Radius.md };

  if (!uri) {
    return (
      <View
        style={[
          styles.placeholder,
          box,
          { backgroundColor: colors.surfaceWarm, borderColor: colors.border },
        ]}
      />
    );
  }

  return <Image source={uri} style={box} contentFit="cover" transition={150} cachePolicy="disk" />;
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
