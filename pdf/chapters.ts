import { runsToBlocks } from './blocks.ts';
import type { Block, Book, Chapter, OutlineEntry, TextRun } from './types.ts';

export function cleanBookTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\.pdf$/gi, '')
    .replace(/\s*[-_]?\s*\(?\s*pdfdrive(?:\.com)?\s*\)?\s*$/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Existing books cannot be retitled without re-importing, since the title is resolved at parse time and stored.
export function isNonTrivialTitle(title: string): boolean {
  if (!title) return false;
  const trimmed = title.trim().toLowerCase();
  if (!trimmed) return false;
  if (!/[a-z0-9]/i.test(trimmed)) return false;

  const genericTitles = [
    'contents',
    'main contents',
    'table of contents',
    'document',
    'document1',
    'new document',
    'untitled',
    'untitled document',
    'untitled book',
    'pdf',
  ];
  if (genericTitles.includes(trimmed)) return false;

  if (/^(microsoft word|ms word)\s*-\s*/i.test(trimmed)) return false;

  return true;
}

// Existing books cannot be retitled without re-importing, since the title is resolved at parse time and stored.
export function resolveBookTitle(metadataTitle?: string, filenameTitle?: string): string {
  const cleanedMeta = cleanBookTitle(metadataTitle || '');
  const cleanedFile = cleanBookTitle(filenameTitle || '');

  if (isNonTrivialTitle(cleanedMeta)) {
    return cleanedMeta;
  }
  if (isNonTrivialTitle(cleanedFile)) {
    return cleanedFile;
  }
  return 'Untitled Book';
}

export function displayTitle(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Strip a leading Chapter|Part|Section followed by a number and an optional separator.
  // Numbers appear as arabic (1), roman (IV) or spelled out (One) — the last is common in
  // trade books, e.g. "Chapter One (PRACTICAL) Redefinitions & Puns".
  const WORD_NUMERALS =
    'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|' +
    'fifteen|sixteen|seventeen|eighteen|nineteen|twenty';
  const prefixRegex = new RegExp(
    `^(?:chapter|part|section)\\s+(?:\\d+(?:\\.\\d+)*|[ivxlcdm]+|${WORD_NUMERALS})\\s*[:.\\-–—]?\\s*`,
    'i'
  );
  // Also strip a bare leading 12. or 12) ordinal
  const ordinalRegex = /^\d+\s*[.)]\s*/;

  let remainder = trimmed.replace(prefixRegex, '');
  if (remainder === trimmed) {
    remainder = trimmed.replace(ordinalRegex, '');
  }

  remainder = remainder.trim();
  if (remainder.length <= 1) {
    return trimmed;
  }
  return remainder;
}

export function computeWordCount(blocks: Block[]): number {
  let count = 0;
  for (const b of blocks) {
    if (b.type === 'heading' || b.type === 'paragraph') {
      const words = b.text.trim().split(/\s+/).filter(Boolean);
      count += words.length;
    }
  }
  return count;
}

export function bodyFontSize(runs: TextRun[]): number {
  if (!runs || runs.length === 0) {
    return 10;
  }

  const counts = new Map<number, number>();
  for (const r of runs) {
    const text = r.str.trim();
    if (text) {
      const bucket = Math.round(r.size * 2) / 2; // ~0.5pt buckets
      counts.set(bucket, (counts.get(bucket) || 0) + text.length);
    }
  }

  let maxChars = 0;
  let modalBucket = 10;
  for (const [bucket, charCount] of counts.entries()) {
    if (charCount > maxChars) {
      maxChars = charCount;
      modalBucket = bucket;
    }
  }

  return modalBucket;
}

export function detectChapters(
  runs: TextRun[],
  outline?: OutlineEntry[],
  pageCount: number = 1,
  bookTitle: string = 'Book'
): { chapters: Chapter[]; chapterSource: Book['chapterSource'] } {
  const effectivePageCount = Math.max(1, pageCount);
  const allBlocks = runsToBlocks(runs);
  const bSize = bodyFontSize(runs);

  // Strategy 1: Outline
  if (outline && outline.length > 0) {
    const flattened = flattenOutline(outline);
    const validEntries = flattened.filter(
      (e) => e.page >= 1 && e.page <= effectivePageCount && e.title.trim()
    );

    if (validEntries.length > 0) {
      // Sort outline entries by start page
      validEntries.sort((a, b) => a.page - b.page);

      const chapters: Chapter[] = validEntries.map((entry, idx) => {
        const startPage = Math.max(1, entry.page);
        const nextStart =
          idx + 1 < validEntries.length ? validEntries[idx + 1].page : effectivePageCount + 1;
        const endPage = Math.min(effectivePageCount, Math.max(startPage, nextStart - 1));

        const blocks = sliceBlocksForPages(allBlocks, startPage, endPage);

        return {
          id: `chap_${idx + 1}`,
          title: entry.title.trim(),
          startPage,
          endPage,
          wordCount: computeWordCount(blocks),
          blocks,
        };
      });

      return { chapters, chapterSource: 'outline' };
    }
  }

  // Strategy 2: Heuristic Heading Detection
  if (runs && runs.length > 0) {
    const candidateHeadings: { title: string; page: number; score: number }[] = [];

    // Group runs by page to evaluate candidates
    const pageMap = new Map<number, TextRun[]>();
    for (const r of runs) {
      let list = pageMap.get(r.page);
      if (!list) {
        list = [];
        pageMap.set(r.page, list);
      }
      list.push(r);
    }

    for (const [pageNum, pRuns] of pageMap.entries()) {
      pRuns.sort((a, b) => b.y - a.y);
      const topRuns = pRuns.slice(0, 10);

      for (const r of topRuns) {
        const text = r.str.trim();
        if (!text || text.length > 80) continue;

        let score = 0;
        if (r.size > 1.25 * bSize) score += 3;
        if (/bold|heavy|black|700/i.test(r.fontName || '')) score += 2;
        if (/^(chapter|part|section|[IVXLC]+\.?|\d+\.?)\b/i.test(text)) score += 4;
        if (r.y > 500) score += 2; // Near top of page

        if (score >= 5) {
          candidateHeadings.push({ title: text, page: pageNum, score });
        }
      }
    }

    if (candidateHeadings.length > 0) {
      // Deduplicate headings by page
      candidateHeadings.sort((a, b) => a.page - b.page);
      const uniqueHeadings: typeof candidateHeadings = [];
      for (const h of candidateHeadings) {
        const last = uniqueHeadings[uniqueHeadings.length - 1];
        if (!last || h.page > last.page + 1) {
          uniqueHeadings.push(h);
        }
      }

      const chapters: Chapter[] = uniqueHeadings.map((h, idx) => {
        const startPage = h.page;
        const nextStart =
          idx + 1 < uniqueHeadings.length ? uniqueHeadings[idx + 1].page : effectivePageCount + 1;
        const endPage = Math.min(effectivePageCount, Math.max(startPage, nextStart - 1));

        const blocks = sliceBlocksForPages(allBlocks, startPage, endPage);

        return {
          id: `chap_${idx + 1}`,
          title: h.title,
          startPage,
          endPage,
          wordCount: computeWordCount(blocks),
          blocks,
        };
      });

      return { chapters, chapterSource: 'heuristic' };
    }
  }

  // Strategy 3: Fallback (Single chapter)
  const singleChapter: Chapter = {
    id: 'chap_1',
    title: bookTitle || 'Full Book',
    startPage: 1,
    endPage: effectivePageCount,
    wordCount: computeWordCount(allBlocks),
    blocks: allBlocks,
  };

  return { chapters: [singleChapter], chapterSource: 'fallback' };
}

function flattenOutline(entries: OutlineEntry[]): OutlineEntry[] {
  const result: OutlineEntry[] = [];
  for (const entry of entries) {
    result.push({ title: entry.title, page: entry.page });
    if (entry.children && entry.children.length > 0) {
      // Keep flattening if sub-entries exist
      result.push(...flattenOutline(entry.children));
    }
  }
  return result;
}

function sliceBlocksForPages(blocks: Block[], startPage: number, endPage: number): Block[] {
  const result: Block[] = [];
  let currentPage = 1;

  for (const block of blocks) {
    if (block.type === 'pagebreak') {
      currentPage = block.page + 1;
      continue;
    }
    if (currentPage >= startPage && currentPage <= endPage) {
      result.push(block);
    }
  }

  return result;
}
