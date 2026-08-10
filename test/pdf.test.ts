import assert from 'node:assert';
import { test } from 'node:test';
import { runsToBlocks } from '../pdf/blocks.ts';
import { bodyFontSize, detectChapters } from '../pdf/chapters.ts';
import type { OutlineEntry, TextRun } from '../pdf/types.ts';

test('bodyFontSize quantizes sizes and picks modal bucket by character count', () => {
  // Mathematics and Humor scenario: 10.0-10.4 sizes
  const runs: TextRun[] = [
    { str: 'A'.repeat(5247), x: 10, y: 500, size: 10.0, fontName: 'Times', page: 1 },
    { str: 'B'.repeat(4208), x: 10, y: 480, size: 10.1, fontName: 'Times', page: 1 },
    { str: 'C'.repeat(4004), x: 10, y: 460, size: 10.2, fontName: 'Times', page: 1 },
    { str: 'D'.repeat(1994), x: 10, y: 440, size: 10.3, fontName: 'Times', page: 1 },
    { str: 'E'.repeat(1857), x: 10, y: 420, size: 10.4, fontName: 'Times', page: 1 },
  ];

  const modalSize = bodyFontSize(runs);
  assert.strictEqual(modalSize, 10.0);
});

test('runsToBlocks strips running headers repeating at same y across pages', () => {
  const runs: TextRun[] = [];

  // Create 10 pages with recurring header at y=750
  for (let p = 1; p <= 10; p++) {
    // Header
    runs.push({
      str: 'The Royal Road to Card Magic',
      x: 100,
      y: 750,
      size: 14,
      fontName: 'Helvetica',
      page: p,
    });
    // Body
    runs.push({
      str: `This is page ${p} body text content.`,
      x: 50,
      y: 500 - p,
      size: 10,
      fontName: 'Helvetica',
      page: p,
    });
  }

  const blocks = runsToBlocks(runs);
  const headerBlocks = blocks.filter(
    (b) => b.type === 'paragraph' && b.text.includes('The Royal Road')
  );

  assert.strictEqual(headerBlocks.length, 0, 'Header text should be stripped');
});

test('runsToBlocks de-hyphenates lower-case continuation and keeps hyphens otherwise', () => {
  const runs: TextRun[] = [
    // Line 1 ending in hyphen, line 2 starting with lowercase
    { str: 'inter-', x: 50, y: 600, size: 10, fontName: 'Times', page: 1 },
    { str: 'esting idea', x: 50, y: 580, size: 10, fontName: 'Times', page: 1 },

    // Line gap break
    { str: 'Another paragraph starts here with inter-', x: 50, y: 500, size: 10, fontName: 'Times', page: 1 },
    { str: 'State commerce.', x: 50, y: 480, size: 10, fontName: 'Times', page: 1 },
  ];

  const blocks = runsToBlocks(runs);
  const paraBlocks = blocks.filter((b) => b.type === 'paragraph');

  assert.strictEqual(paraBlocks.length, 2);
  assert.strictEqual(paraBlocks[0].text, 'interesting idea');
  assert.strictEqual(paraBlocks[1].text, 'Another paragraph starts here with inter- State commerce.');
});

test('detectChapters prefers outline, falls back to heuristic, then fallback, never empty', () => {
  const runs: TextRun[] = [
    { str: 'Chapter 1: Beginnings', x: 50, y: 700, size: 16, fontName: 'Helvetica-Bold', page: 1 },
    { str: 'Body paragraph on page 1.', x: 50, y: 650, size: 10, fontName: 'Helvetica', page: 1 },
    { str: 'Chapter 2: Middle', x: 50, y: 700, size: 16, fontName: 'Helvetica-Bold', page: 5 },
    { str: 'Body paragraph on page 5.', x: 50, y: 650, size: 10, fontName: 'Helvetica', page: 5 },
  ];

  const outline: OutlineEntry[] = [
    { title: 'Intro', page: 1 },
    { title: 'Conclusion', page: 5 },
  ];

  // 1. With outline
  const res1 = detectChapters(runs, outline, 10, 'Test Book');
  assert.strictEqual(res1.chapterSource, 'outline');
  assert.strictEqual(res1.chapters.length, 2);

  // 2. Without outline -> Heuristics
  const res2 = detectChapters(runs, [], 10, 'Test Book');
  assert.strictEqual(res2.chapterSource, 'heuristic');
  assert.strictEqual(res2.chapters.length, 2);

  // 3. Without outline or runs -> Fallback
  const res3 = detectChapters([], [], 10, 'Test Book');
  assert.strictEqual(res3.chapterSource, 'fallback');
  assert.strictEqual(res3.chapters.length, 1);
  assert.strictEqual(res3.chapters[0].title, 'Test Book');
});

test('accumulates runs_chunk batches before chapter detection', () => {
  const accumulatedRuns: TextRun[] = [];

  const chunk1: TextRun[] = [
    { str: 'Chapter 1: Beginnings', x: 50, y: 700, size: 16, fontName: 'Helvetica-Bold', page: 1 },
    { str: 'Page 1 paragraph content.', x: 50, y: 650, size: 10, fontName: 'Helvetica', page: 1 },
  ];
  const chunk2: TextRun[] = [
    { str: 'Chapter 2: Middle', x: 50, y: 700, size: 16, fontName: 'Helvetica-Bold', page: 25 },
    { str: 'Page 25 paragraph content.', x: 50, y: 650, size: 10, fontName: 'Helvetica', page: 25 },
  ];

  // Simulating incoming runs_chunk messages by appending chunks
  accumulatedRuns.push(...chunk1);
  accumulatedRuns.push(...chunk2);

  assert.strictEqual(accumulatedRuns.length, 4);

  const { chapters, chapterSource } = detectChapters(accumulatedRuns, [], 30, 'Chunked Book');
  assert.strictEqual(chapterSource, 'heuristic');
  assert.strictEqual(chapters.length, 2);
  assert.strictEqual(chapters[0].title, 'Chapter 1: Beginnings');
  assert.strictEqual(chapters[1].title, 'Chapter 2: Middle');
});
