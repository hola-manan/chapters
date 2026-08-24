import type { Book } from '../pdf/types.ts';

export const CHAPTER_DONE_THRESHOLD = 0.98;

export type ChapterProgress = {
  blockIndex: number;
  progress: number; // 0..1
};

export type BookPrefs = Record<string, ChapterProgress>;

export function mergeChapterProgress(
  existing: ChapterProgress | undefined,
  incoming: ChapterProgress
): ChapterProgress {
  const existingProg = existing?.progress ?? 0;
  const maxProg = Math.max(existingProg, incoming.progress);
  const clampedProg = Math.min(1, Math.max(0, maxProg));
  const clampedBlockIndex = Math.max(0, incoming.blockIndex);

  return {
    progress: clampedProg,
    blockIndex: clampedBlockIndex,
  };
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

export function resumeChapterId(book: Book, prefs: BookPrefs, lastChapterId?: string): string {
  if (!book.chapters || book.chapters.length === 0) return '';

  // 1. If lastChapterId names a chapter that exists in this book:
  if (lastChapterId) {
    const idx = book.chapters.findIndex((ch) => ch.id === lastChapterId);
    if (idx !== -1) {
      const state = chapterState(prefs[lastChapterId]?.progress ?? 0);
      // not done -> return it
      if (state !== 'done') {
        return lastChapterId;
      }
      // done -> return the first chapter after it that is not done
      for (let i = idx + 1; i < book.chapters.length; i++) {
        const nextCh = book.chapters[i];
        if (chapterState(prefs[nextCh.id]?.progress ?? 0) !== 'done') {
          return nextCh.id;
        }
      }
      // If every chapter after it is done, fall through to the rules below
    }
  }

  // 2. First in_progress chapter
  const firstInProgress = book.chapters.find(
    (ch) => chapterState(prefs[ch.id]?.progress ?? 0) === 'in_progress'
  );
  if (firstInProgress) return firstInProgress.id;

  // 3. First unread chapter
  const firstUnread = book.chapters.find(
    (ch) => chapterState(prefs[ch.id]?.progress ?? 0) === 'unread'
  );
  if (firstUnread) return firstUnread.id;

  // 4. The last chapter
  return book.chapters[book.chapters.length - 1].id;
}
