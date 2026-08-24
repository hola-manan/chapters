import assert from 'node:assert';
import { test } from 'node:test';
import { runsToBlocks } from '../pdf/blocks.ts';
import { bodyFontSize, cleanBookTitle, computeWordCount, detectChapters, displayTitle, resolveBookTitle } from '../pdf/chapters.ts';
import type { Block, OutlineEntry, TextRun } from '../pdf/types.ts';

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

const SAMPLE_WORDS = [
  'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
  'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
  'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
  'yankee', 'zulu', 'autumn', 'breeze', 'cloud', 'dawn', 'ember', 'frost',
  'glade', 'haven', 'island', 'jungle', 'knoll', 'lagoon', 'meadow', 'nexus',
  'oasis', 'prairie', 'quarry', 'ridge', 'stream', 'timber', 'upland', 'valley',
];

function makeUniqueProse(p: number, i: number): string {
  const w1 = SAMPLE_WORDS[(p * 7 + i * 3) % SAMPLE_WORDS.length];
  const w2 = SAMPLE_WORDS[(p * 11 + i * 5 + 1) % SAMPLE_WORDS.length];
  const w3 = SAMPLE_WORDS[(p * 13 + i * 7 + 2) % SAMPLE_WORDS.length];
  const w4 = SAMPLE_WORDS[(p * 17 + i * 11 + 3) % SAMPLE_WORDS.length];
  return `The ${w1} ${w2} was observed near the ${w3} and ${w4} during the expedition.`;
}

test('runsToBlocks: baseline-grid book with no headers keeps every run', () => {
  const runs: TextRun[] = [];

  // 10 pages, 20 lines each, identical set of y values across pages, distinct text on each
  for (let p = 1; p <= 10; p++) {
    for (let i = 0; i < 20; i++) {
      runs.push({
        str: makeUniqueProse(p, i),
        x: 50,
        y: 700 - i * 25,
        size: 10,
        fontName: 'Helvetica',
        page: p,
      });
    }
  }

  const blocks = runsToBlocks(runs);
  const paraBlocks = blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph');
  const allText = paraBlocks.map((b) => b.text).join(' ');

  for (let p = 1; p <= 10; p++) {
    for (let i = 0; i < 20; i++) {
      assert.ok(
        allText.includes(makeUniqueProse(p, i)),
        `Page ${p} line ${i} must survive`
      );
    }
  }
});

test('runsToBlocks: recto/verso running header is stripped and all body text survives', () => {
  const runs: TextRun[] = [];

  // 10 pages: odd pages have "Book Title", even pages have "Author Name" at top y
  for (let p = 1; p <= 10; p++) {
    const isOdd = p % 2 !== 0;
    runs.push({
      str: isOdd ? 'Book Title' : 'Author Name',
      x: 100,
      y: 750,
      size: 12,
      fontName: 'Helvetica',
      page: p,
    });

    for (let i = 0; i < 20; i++) {
      runs.push({
        str: makeUniqueProse(p, i),
        x: 50,
        y: 700 - i * 25,
        size: 10,
        fontName: 'Helvetica',
        page: p,
      });
    }
  }

  const blocks = runsToBlocks(runs);
  const paraBlocks = blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph');
  const allText = paraBlocks.map((b) => b.text).join(' ');

  assert.ok(!allText.includes('Book Title'), 'Odd page header "Book Title" should be stripped');
  assert.ok(!allText.includes('Author Name'), 'Even page header "Author Name" should be stripped');

  for (let p = 1; p <= 10; p++) {
    for (let i = 0; i < 20; i++) {
      assert.ok(
        allText.includes(makeUniqueProse(p, i)),
        `Page ${p} line ${i} body text must survive`
      );
    }
  }
});

test('runsToBlocks: page numbers in footer are stripped and body text survives', () => {
  const runs: TextRun[] = [];

  // 10 pages: footer "Page 1", "Page 2", ... at bottom extreme
  for (let p = 1; p <= 10; p++) {
    for (let i = 0; i < 20; i++) {
      runs.push({
        str: makeUniqueProse(p, i),
        x: 50,
        y: 700 - i * 25,
        size: 10,
        fontName: 'Helvetica',
        page: p,
      });
    }

    runs.push({
      str: `Page ${p}`,
      x: 200,
      y: 100,
      size: 9,
      fontName: 'Helvetica',
      page: p,
    });
  }

  const blocks = runsToBlocks(runs);
  const paraBlocks = blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph');
  const allText = paraBlocks.map((b) => b.text).join(' ');

  for (let p = 1; p <= 10; p++) {
    // Assert page number footer is stripped
    assert.ok(!allText.includes(`Page ${p}`), `Footer "Page ${p}" should be stripped`);
    // Assert body lines survived
    for (let i = 0; i < 20; i++) {
      assert.ok(
        allText.includes(makeUniqueProse(p, i)),
        `Page ${p} line ${i} body text must survive`
      );
    }
  }
});

test('runsToBlocks: circuit-breaker keeps every run when filter would remove >5% of characters', () => {
  const runs: TextRun[] = [];

  // 10 pages: header with 41 chars, small body with 7 chars (~85% would be removed)
  for (let p = 1; p <= 10; p++) {
    runs.push({
      str: 'Recurring Header That Takes Up Many Chars',
      x: 100,
      y: 750,
      size: 12,
      fontName: 'Helvetica',
      page: p,
    });
    runs.push({
      str: `Body ${p}.`,
      x: 50,
      y: 500,
      size: 10,
      fontName: 'Helvetica',
      page: p,
    });
  }

  const blocks = runsToBlocks(runs);
  const paraBlocks = blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph');
  const allText = paraBlocks.map((b) => b.text).join(' ');

  // Circuit breaker must have tripped and preserved the header
  assert.ok(
    allText.includes('Recurring Header That Takes Up Many Chars'),
    'Circuit breaker should keep all runs when removal threshold is exceeded'
  );
  assert.ok(allText.includes('Body 1.'), 'Body text should survive');
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

test('displayTitle strips prefixes and bare ordinals appropriately', () => {
  // prefixed-with-name
  assert.strictEqual(displayTitle('Chapter 2: Getting Started'), 'Getting Started');
  assert.strictEqual(displayTitle('Section 3.1 Overview'), 'Overview');
  assert.strictEqual(displayTitle('Part 1 - Introduction'), 'Introduction');

  // prefix-only
  assert.strictEqual(displayTitle('Chapter 2'), 'Chapter 2');
  assert.strictEqual(displayTitle('Chapter One'), 'Chapter One');

  // roman numerals
  assert.strictEqual(displayTitle('Chapter II - Getting Started'), 'Getting Started');
  assert.strictEqual(displayTitle('Part IV: Advanced Concepts'), 'Advanced Concepts');

  // spelled-out numerals — common in trade books, and the form used throughout
  // "The Serious Guide to Joke Writing" in the real test corpus
  assert.strictEqual(
    displayTitle('Chapter One (PRACTICAL) Redefinitions & Puns'),
    '(PRACTICAL) Redefinitions & Puns'
  );
  assert.strictEqual(
    displayTitle('Chapter Two (THEORY): How To Use Your Brain'),
    '(THEORY): How To Use Your Brain'
  );
  // ...but a spelled-out prefix with nothing after it still falls back
  assert.strictEqual(displayTitle('Part Two'), 'Part Two');

  // bare ordinal
  assert.strictEqual(displayTitle('12. Getting Started'), 'Getting Started');
  assert.strictEqual(displayTitle('12) Getting Started'), 'Getting Started');

  // non-chapter entry untouched
  assert.strictEqual(displayTitle('Index'), 'Index');
  assert.strictEqual(displayTitle('Contents'), 'Contents');
  assert.strictEqual(displayTitle('References'), 'References');
});

test('cleanBookTitle strips source cruft and cleans whitespace', () => {
  assert.strictEqual(cleanBookTitle('Laugh Tactics_ ... ( PDFDrive )'), 'Laugh Tactics ...');
  assert.strictEqual(cleanBookTitle('The_Serious_Guide_to_Joke_Writing'), 'The Serious Guide to Joke Writing');
  assert.strictEqual(cleanBookTitle('Card_College_1 - PDFDrive.com'), 'Card College 1');
});

test('computeWordCount counts words in paragraph and heading blocks', () => {
  const blocks: Block[] = [
    { type: 'heading', level: 1, text: 'Chapter One' },
    { type: 'paragraph', text: 'This is a test sentence with eight words.' },
  ];
  assert.strictEqual(computeWordCount(blocks), 10);
});

test('resolveBookTitle: good metadata title wins, generic metadata loses to filename, both bad falls back to Untitled Book', () => {
  assert.strictEqual(
    resolveBookTitle('The Art of Computer Programming', 'taocp.pdf'),
    'The Art of Computer Programming'
  );
  assert.strictEqual(
    resolveBookTitle('Main Contents', 'The Royal Road to Card Magic.pdf'),
    'The Royal Road to Card Magic'
  );
  assert.strictEqual(
    resolveBookTitle('Contents', 'Laugh_Tactics_..._(PDFDrive).pdf'),
    'Laugh Tactics ...'
  );
  assert.strictEqual(
    resolveBookTitle('Microsoft Word - Document1', 'My_Notes.pdf'),
    'My Notes'
  );
  assert.strictEqual(resolveBookTitle('Contents', 'Document1.pdf'), 'Untitled Book');
  assert.strictEqual(resolveBookTitle('Microsoft Word - 123', 'Untitled.pdf'), 'Untitled Book');
  assert.strictEqual(resolveBookTitle('', ''), 'Untitled Book');
});




