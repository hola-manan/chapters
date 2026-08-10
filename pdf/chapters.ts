import { runsToBlocks } from './blocks.ts';
import type { Block, Book, Chapter, OutlineEntry, TextRun } from './types.ts';

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
