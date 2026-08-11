// Deliberate use of expo-file-system/legacy API for chunked file reading and file ops
import * as FileSystem from 'expo-file-system/legacy';
import type { Book } from '../pdf/types.ts';

export const CHAPTER_DONE_THRESHOLD = 0.98;

export type ChapterProgress = {
  blockIndex: number;
  progress: number; // 0..1
};

export type BookPrefs = Record<string, ChapterProgress>;

function getPrefsPath(bookId: string): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}prefs_${bookId}.json`;
}

export async function getBookPrefs(bookId: string): Promise<BookPrefs> {
  const path = getPrefsPath(bookId);
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(path);
    const raw = JSON.parse(content) as Record<string, number | ChapterProgress>;
    const prefs: BookPrefs = {};
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === 'number') {
        prefs[key] = { blockIndex: val, progress: 0 };
      } else if (val && typeof val === 'object') {
        prefs[key] = {
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
      const path = getPrefsPath(bookId);
      const prefs = await getBookPrefs(bookId);

      const clampedProgress = Math.min(1, Math.max(0, progress));
      const existing = prefs[chapterId];
      const existingProgress = existing?.progress ?? 0;
      const existingBlockIndex = existing?.blockIndex ?? 0;

      const finalProgress = Math.max(existingProgress, clampedProgress);
      const finalBlockIndex =
        existingProgress > clampedProgress
          ? existingBlockIndex
          : Math.max(existingBlockIndex, blockIndex);

      prefs[chapterId] = {
        blockIndex: finalBlockIndex,
        progress: finalProgress,
      };

      await FileSystem.writeAsStringAsync(path, JSON.stringify(prefs));
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

export function chapterState(progress: number): 'unread' | 'in_progress' | 'done' {
  if (progress <= 0) return 'unread';
  if (progress >= CHAPTER_DONE_THRESHOLD) return 'done';
  return 'in_progress';
}

export function computeBookProgress(book: Book, prefs: BookPrefs): number {
  if (!book.chapters || book.chapters.length === 0) return 0;

  let totalWords = 0;
  let weightedProgressSum = 0;

  for (const ch of book.chapters) {
    const wCount = ch.wordCount > 0 ? ch.wordCount : 1;
    const prog = prefs[ch.id]?.progress ?? 0;
    const clampedProg = Math.min(1, Math.max(0, prog));
    totalWords += wCount;
    weightedProgressSum += wCount * clampedProg;
  }

  if (totalWords <= 0) return 0;
  return Math.min(1, Math.max(0, weightedProgressSum / totalWords));
}

export function resumeChapterId(book: Book, prefs: BookPrefs): string {
  if (!book.chapters || book.chapters.length === 0) return '';

  // 1. First chapter in progress
  const firstInProgress = book.chapters.find(
    (ch) => chapterState(prefs[ch.id]?.progress ?? 0) === 'in_progress'
  );
  if (firstInProgress) return firstInProgress.id;

  // 2. Else first unread chapter
  const firstUnread = book.chapters.find(
    (ch) => chapterState(prefs[ch.id]?.progress ?? 0) === 'unread'
  );
  if (firstUnread) return firstUnread.id;

  // 3. Else last chapter
  return book.chapters[book.chapters.length - 1].id;
}
