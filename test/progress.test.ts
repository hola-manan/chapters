import assert from 'node:assert';
import { test } from 'node:test';
import type { Book, Chapter } from '../pdf/types.ts';
import {
  CHAPTER_DONE_THRESHOLD,
  chapterState,
  computeBookProgress,
  mergeChapterProgress,
  resumeChapterId,
  type BookPrefs,
  type ChapterProgress,
} from '../storage/progress.ts';

function createMockBook(chapterSpecs: Array<{ id: string; wordCount?: number }>): Book {
  const chapters: Chapter[] = chapterSpecs.map((spec, index) => ({
    id: spec.id,
    title: `Chapter ${index + 1}`,
    startPage: index + 1,
    endPage: index + 1,
    wordCount: spec.wordCount ?? 100,
    blocks: [],
  }));

  return {
    id: 'test-book',
    title: 'Test Book',
    addedAt: Date.now(),
    pageCount: chapters.length,
    status: 'ready',
    chapterSource: 'outline',
    chapters,
    sourceUri: 'file:///mock.pdf',
  };
}

test('resumeChapterId: lastChapterId unfinished wins over earlier in-progress chapter (regression)', () => {
  // Fixture: chapter 1 sits at 0.94 and pointer names chapter 2
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 10, progress: 0.94 }, // under threshold, in_progress
    ch2: { blockIndex: 2, progress: 0.3 },   // in_progress
    ch3: { blockIndex: 0, progress: 0 },
  };

  const result = resumeChapterId(book, prefs, 'ch2');
  assert.strictEqual(result, 'ch2', 'Chapter 2 pointer must win over earlier in-progress chapter 1');
});

test('resumeChapterId: lastChapterId unread wins over earlier in-progress chapter', () => {
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 10, progress: 0.94 },
    ch2: { blockIndex: 0, progress: 0 },
    ch3: { blockIndex: 0, progress: 0 },
  };

  const result = resumeChapterId(book, prefs, 'ch2');
  assert.strictEqual(result, 'ch2');
});

test('resumeChapterId: lastChapterId finished advances to first not-done chapter after it', () => {
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }, { id: 'ch4' }]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 10, progress: 1.0 }, // done
    ch2: { blockIndex: 10, progress: 0.99 }, // done
    ch3: { blockIndex: 2, progress: 0.4 },  // in_progress
    ch4: { blockIndex: 0, progress: 0 },    // unread
  };

  const result = resumeChapterId(book, prefs, 'ch1');
  assert.strictEqual(result, 'ch3', 'Should advance past done ch1 and done ch2 to ch3');
});

test('resumeChapterId: lastChapterId finished and everything after it finished falls through to fallback rules', () => {
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 2, progress: 0.5 },  // in_progress
    ch2: { blockIndex: 10, progress: 1.0 }, // done
    ch3: { blockIndex: 10, progress: 1.0 }, // done
  };

  // Pointer at ch2 (done). All after it (ch3) are done.
  // Falls through to fallback rule: first in_progress is ch1.
  const result = resumeChapterId(book, prefs, 'ch2');
  assert.strictEqual(result, 'ch1');
});

test('resumeChapterId: lastChapterId is last chapter and finished falls through to fallback rules', () => {
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 10, progress: 1.0 }, // done
    ch2: { blockIndex: 10, progress: 1.0 }, // done
    ch3: { blockIndex: 10, progress: 1.0 }, // done
  };

  // Pointer at ch3 (done). No chapters after it.
  // Falls through to fallback rules: no in_progress, no unread -> last chapter (ch3).
  const result = resumeChapterId(book, prefs, 'ch3');
  assert.strictEqual(result, 'ch3');
});

test('resumeChapterId: lastChapterId absent or naming unknown chapter falls through to fallback rules', () => {
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 10, progress: 1.0 }, // done
    ch2: { blockIndex: 5, progress: 0.5 },  // in_progress
    ch3: { blockIndex: 0, progress: 0 },    // unread
  };

  assert.strictEqual(resumeChapterId(book, prefs), 'ch2', 'Absent pointer should find first in-progress');
  assert.strictEqual(resumeChapterId(book, prefs, 'unknown-id'), 'ch2', 'Unknown pointer should find first in-progress');
});

test('resumeChapterId: fallback rules in isolation (first in_progress, then first unread, then last chapter)', () => {
  const book = createMockBook([{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }]);

  // 1. First in_progress
  const prefs1: BookPrefs = {
    ch1: { blockIndex: 10, progress: 1.0 },
    ch2: { blockIndex: 5, progress: 0.3 },
    ch3: { blockIndex: 0, progress: 0 },
  };
  assert.strictEqual(resumeChapterId(book, prefs1), 'ch2');

  // 2. First unread when none in_progress
  const prefs2: BookPrefs = {
    ch1: { blockIndex: 10, progress: 1.0 },
    ch2: { blockIndex: 0, progress: 0 },
    ch3: { blockIndex: 0, progress: 0 },
  };
  assert.strictEqual(resumeChapterId(book, prefs2), 'ch2');

  // 3. Last chapter when all done
  const prefs3: BookPrefs = {
    ch1: { blockIndex: 10, progress: 1.0 },
    ch2: { blockIndex: 10, progress: 1.0 },
    ch3: { blockIndex: 10, progress: 1.0 },
  };
  assert.strictEqual(resumeChapterId(book, prefs3), 'ch3');
});

test('resumeChapterId: book with no chapters returns empty string and does not throw', () => {
  const emptyBook = createMockBook([]);
  assert.strictEqual(resumeChapterId(emptyBook, {}), '');
  assert.strictEqual(resumeChapterId(emptyBook, {}, 'ch1'), '');

  const nullChaptersBook: Book = {
    id: 'null-book',
    title: 'Null Book',
    addedAt: Date.now(),
    pageCount: 0,
    status: 'ready',
    chapterSource: 'outline',
    chapters: [] as Chapter[],
    sourceUri: 'file:///mock.pdf',
  };
  assert.strictEqual(resumeChapterId(nullChaptersBook, {}), '');
});

test('chapterState: boundaries at exactly 0, just under 0.98, exactly 0.98, and 1', () => {
  assert.strictEqual(chapterState(0), 'unread');
  assert.strictEqual(chapterState(-0.5), 'unread');
  assert.strictEqual(chapterState(0.001), 'in_progress');
  assert.strictEqual(chapterState(0.9799), 'in_progress');
  assert.strictEqual(chapterState(CHAPTER_DONE_THRESHOLD), 'done'); // 0.98
  assert.strictEqual(chapterState(0.98), 'done');
  assert.strictEqual(chapterState(0.99), 'done');
  assert.strictEqual(chapterState(1), 'done');
  assert.strictEqual(chapterState(1.2), 'done');
});

test('computeBookProgress: weights by word count, not chapter count, and treats 0 word count as 1', () => {
  const book = createMockBook([
    { id: 'ch1', wordCount: 100 },
    { id: 'ch2', wordCount: 300 },
  ]);
  const prefs: BookPrefs = {
    ch1: { blockIndex: 0, progress: 1.0 }, // 100 * 1.0 = 100
    ch2: { blockIndex: 0, progress: 0.0 }, // 300 * 0.0 = 0
  };
  // Total words = 400. Progress = 100 / 400 = 0.25 (unweighted would be 0.5)
  const progress = computeBookProgress(book, prefs);
  assert.strictEqual(progress, 0.25);

  // Zero word count handling: treated as 1 rather than dividing by zero
  const bookZero = createMockBook([
    { id: 'ch1', wordCount: 0 },
    { id: 'ch2', wordCount: 0 },
  ]);
  const prefsZero: BookPrefs = {
    ch1: { blockIndex: 0, progress: 1.0 }, // 1 * 1.0 = 1
    ch2: { blockIndex: 0, progress: 0.5 }, // 1 * 0.5 = 0.5
  };
  // totalWords = 1 + 1 = 2. Progress = 1.5 / 2 = 0.75
  const progressZero = computeBookProgress(bookZero, prefsZero);
  assert.strictEqual(progressZero, 0.75);

  // Empty book returns 0 without division by zero
  const emptyBook = createMockBook([]);
  assert.strictEqual(computeBookProgress(emptyBook, {}), 0);
});

test('mergeChapterProgress: no existing entry takes incoming as-is', () => {
  const result = mergeChapterProgress(undefined, { blockIndex: 5, progress: 0.4 });
  assert.deepStrictEqual(result, { blockIndex: 5, progress: 0.4 });
});

test('mergeChapterProgress: higher incoming progress wins; lower incoming progress does not lower stored value', () => {
  // Higher incoming progress wins
  const higher = mergeChapterProgress(
    { blockIndex: 1, progress: 0.2 },
    { blockIndex: 4, progress: 0.6 }
  );
  assert.strictEqual(higher.progress, 0.6);

  // Lower incoming progress does not lower stored value
  const lower = mergeChapterProgress(
    { blockIndex: 4, progress: 0.6 },
    { blockIndex: 2, progress: 0.3 }
  );
  assert.strictEqual(lower.progress, 0.6);
});

test('mergeChapterProgress: lower incoming blockIndex does replace higher stored one (pointer vs watermark regression)', () => {
  const existing: ChapterProgress = { blockIndex: 12, progress: 0.8 };
  const incoming: ChapterProgress = { blockIndex: 3, progress: 0.4 };
  const merged = mergeChapterProgress(existing, incoming);

  // Pointer moves backwards to where the reader actually is, while progress ratchet is preserved
  assert.strictEqual(merged.blockIndex, 3, 'Lower incoming blockIndex must replace higher stored blockIndex');
  assert.strictEqual(merged.progress, 0.8, 'Progress high-water mark must remain intact');
});

test('mergeChapterProgress: progress clamps into 0..1 from out-of-range input on both sides', () => {
  assert.deepStrictEqual(
    mergeChapterProgress(undefined, { blockIndex: 0, progress: -0.5 }),
    { blockIndex: 0, progress: 0 }
  );
  assert.deepStrictEqual(
    mergeChapterProgress(undefined, { blockIndex: 0, progress: 1.5 }),
    { blockIndex: 0, progress: 1 }
  );
  assert.deepStrictEqual(
    mergeChapterProgress({ blockIndex: 0, progress: 0.5 }, { blockIndex: 0, progress: -0.2 }),
    { blockIndex: 0, progress: 0.5 }
  );
  assert.deepStrictEqual(
    mergeChapterProgress({ blockIndex: 0, progress: 0.5 }, { blockIndex: 0, progress: 2.0 }),
    { blockIndex: 0, progress: 1 }
  );
});

test('mergeChapterProgress: negative blockIndex clamps to 0', () => {
  assert.deepStrictEqual(
    mergeChapterProgress(undefined, { blockIndex: -10, progress: 0.5 }),
    { blockIndex: 0, progress: 0.5 }
  );
  assert.deepStrictEqual(
    mergeChapterProgress({ blockIndex: 5, progress: 0.5 }, { blockIndex: -3, progress: 0.5 }),
    { blockIndex: 0, progress: 0.5 }
  );
});

