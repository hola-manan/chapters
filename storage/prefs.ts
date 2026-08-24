import { readText, writeText } from './kv';
import { mergeChapterProgress, type BookPrefs, type ChapterProgress } from './progress.ts';

export * from './progress.ts';

function getPrefsKey(bookId: string): string {
  return `prefs_${bookId}.json`;
}

function getLastReadKey(bookId: string): string {
  return `lastread_${bookId}.json`;
}

export async function getBookPrefs(bookId: string): Promise<BookPrefs> {
  const key = getPrefsKey(bookId);
  try {
    const content = await readText(key);
    if (!content) return {};
    const raw = JSON.parse(content) as Record<string, number | ChapterProgress>;
    const prefs: BookPrefs = {};
    for (const [k, val] of Object.entries(raw)) {
      if (typeof val === 'number') {
        prefs[k] = { blockIndex: val, progress: 0 };
      } else if (val && typeof val === 'object') {
        prefs[k] = {
          blockIndex: typeof val.blockIndex === 'number' ? val.blockIndex : 0,
          progress: typeof val.progress === 'number' ? Math.min(1, Math.max(0, val.progress)) : 0,
        };
      }
    }
    return prefs;
  } catch {
    return {};
  }
}

let saveChain: Promise<void> = Promise.resolve();

export function saveReadingPosition(
  bookId: string,
  chapterId: string,
  blockIndex: number,
  progress: number = 0
): Promise<void> {
  saveChain = saveChain
    .then(async () => {
      const key = getPrefsKey(bookId);
      const prefs = await getBookPrefs(bookId);

      const existing = prefs[chapterId];
      prefs[chapterId] = mergeChapterProgress(existing, { blockIndex, progress });

      await writeText(key, JSON.stringify(prefs));
    })
    .catch((err) => {
      console.warn('Failed to save reading position:', err);
    });

  return saveChain;
}

export async function getReadingPosition(
  bookId: string,
  chapterId: string
): Promise<ChapterProgress> {
  const prefs = await getBookPrefs(bookId);
  return prefs[chapterId] ?? { blockIndex: 0, progress: 0 };
}

export async function getLastChapter(bookId: string): Promise<string | undefined> {
  const key = getLastReadKey(bookId);
  try {
    const content = await readText(key);
    if (!content) return undefined;
    const raw = JSON.parse(content) as { chapterId?: unknown };
    if (typeof raw?.chapterId === 'string' && raw.chapterId.length > 0) {
      return raw.chapterId;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function saveLastChapter(bookId: string, chapterId: string): Promise<void> {
  saveChain = saveChain
    .then(async () => {
      const key = getLastReadKey(bookId);
      await writeText(key, JSON.stringify({ chapterId }));
    })
    .catch((err) => {
      console.warn('Failed to save last chapter:', err);
    });

  return saveChain;
}
