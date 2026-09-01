import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Zdjecia zyja w documentDirectory/photos/, NIE w cache.
 *
 * To nie jest detal: URI zwracane przez pickera i przez image-manipulator wskazuja
 * katalog cache, ktory system kasuje, gdy brakuje miejsca. Wpis wygladalby wtedy
 * na uszkodzony — pusta ramka zamiast zdjecia, bez zadnego bledu.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.8;

export type PickedImage = { uri: string; width: number; height: number };

export type PickResult =
  | { status: 'picked'; image: PickedImage }
  | { status: 'canceled' }
  | { status: 'denied' };

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

/**
 * Nazwa pliku niesie date, slot i pozycje w galerii — ulatwia diagnostyke
 * i sprzatanie. Losowy sufiks jest istotny: bez niego podmienione zdjecie
 * trafialoby pod ta sama nazwe i cache obrazkow pokazywalby stare.
 */
const fileNameFor = (date: string, slot: number, position: number) =>
  `${date}-${slot}-${position}-${randomSuffix()}.jpg`;

function toResult(result: ImagePicker.ImagePickerResult): PickResult {
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return { status: 'canceled' };
  return {
    status: 'picked',
    image: { uri: asset.uri, width: asset.width, height: asset.height },
  };
}

export async function pickFromLibrary(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };
  return toResult(
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Kompresje robimy sami, ponizej — pickerowi kazemy oddac oryginal,
      // zeby nie stracic jakosci dwa razy.
      quality: 1,
      exif: false,
    })
  );
}

export async function pickFromCamera(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };
  return toResult(
    await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false })
  );
}

/**
 * Skaluje dluzsza krawedz do MAX_EDGE, zapisuje jako JPEG i przenosi do katalogu
 * aplikacji. Kompresja idzie PRZED zapisem lokalnym, nie dopiero przed uploadem —
 * inaczej telefon zapychalby sie oryginalami z aparatu.
 */
export async function storePhoto(
  image: PickedImage,
  date: string,
  slot: number,
  position: number
): Promise<string> {
  const context = ImageManipulator.manipulate(image.uri);

  const longerEdge = Math.max(image.width, image.height);
  if (longerEdge > MAX_EDGE) {
    // resize() zachowuje proporcje, gdy podamy tylko jeden wymiar. Trzeba wybrac
    // wlasciwa os — samo { width: MAX_EDGE } powiekszyloby zdjecie pionowe.
    context.resize(
      image.width >= image.height ? { width: MAX_EDGE } : { height: MAX_EDGE }
    );
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });

  const target = new File(photosDir(), fileNameFor(date, slot, position));
  await new File(saved.uri).move(target);
  return target.uri;
}

/** Pobiera zdjecie z chmury na nowym urzadzeniu. */
export async function downloadPhoto(
  signedUrl: string,
  date: string,
  slot: number,
  position: number
): Promise<string> {
  const target = new File(photosDir(), fileNameFor(date, slot, position));
  await File.downloadFileAsync(signedUrl, target, { idempotent: true });
  return target.uri;
}

export async function readPhotoBytes(localUri: string): Promise<Uint8Array> {
  return new File(localUri).bytes();
}

/** Kasowanie pliku nigdy nie moze wywrocic zapisu wpisu — stad ciche przelkniecie. */
export function deletePhotoFile(localUri: string | null): void {
  if (!localUri) return;
  try {
    const file = new File(localUri);
    if (file.exists) file.delete();
  } catch {
    // plik juz nie istnieje albo jest niedostepny — nie ma czego ratowac
  }
}

export function photoExists(localUri: string | null): boolean {
  if (!localUri) return false;
  try {
    return new File(localUri).exists;
  } catch {
    return false;
  }
}
