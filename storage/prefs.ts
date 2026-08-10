// Deliberate use of expo-file-system/legacy API for chunked file reading and file ops
import * as FileSystem from 'expo-file-system/legacy';

function getPrefsPath(bookId: string): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}prefs_${bookId}.json`;
}

type ReadingPrefs = Record<string, number>; // chapterId -> blockIndex

export async function saveReadingPosition(
  bookId: string,
  chapterId: string,
  blockIndex: number
): Promise<void> {
  const path = getPrefsPath(bookId);
  let prefs: ReadingPrefs = {};
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(path);
      prefs = JSON.parse(content) as ReadingPrefs;
    }
  } catch {
    prefs = {};
  }

  prefs[chapterId] = blockIndex;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(prefs));
}

export async function getReadingPosition(
  bookId: string,
  chapterId: string
): Promise<number> {
  const path = getPrefsPath(bookId);
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return 0;
    const content = await FileSystem.readAsStringAsync(path);
    const prefs = JSON.parse(content) as ReadingPrefs;
    return prefs[chapterId] ?? 0;
  } catch {
    return 0;
  }
}
