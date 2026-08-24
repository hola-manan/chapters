import type { Block, TextRun } from './types';

const REPEAT_THRESHOLD = 0.2;

export function runsToBlocks(runs: TextRun[], bodySize?: number): Block[] {
  if (!runs || runs.length === 0) {
    return [];
  }

  // Calculate distinct page count
  const pagesSet = new Set<number>();
  for (const r of runs) {
    pagesSet.add(r.page);
  }
  const totalPages = pagesSet.size;

  // 1. Strip running headers and footers
  // A run is stripped only if it meets all three conditions:
  //   1. Normalised text match: key = str.trim().replace(/\s+/g, ' ').replace(/\d+/g, '#')
  //   2. At a page extreme: within 30pt of the topmost or bottommost run on its own page
  //   3. Repeats within its page-parity class: key appears on >20% of pages of the same parity.
  //
  // 20%, not a majority. The separation between chrome and prose is enormous and measured: on this
  // corpus body text never repeats identically at a page extreme at all, while real running headers
  // sit on 45-50% of pages. A majority bar is a knife-edge in that gap — Royal Road's header lands
  // on 50.2% of odd pages and 45.4% of even ones, so a >50% rule stripped it from odd pages and left
  // every even one behind. Anything from 5% to 30% removes exactly the chrome and nothing else.
  // Circuit-breaker: if the rule would remove >5% of the document's non-space characters,
  // remove nothing at all to bound the blast radius of silent deletion.

  let filteredRuns = runs;

  if (totalPages > 2) {
    // Compute min and max Y per page from the runs themselves
    const pageExtremes = new Map<number, { min: number; max: number }>();
    let oddPagesCount = 0;
    let evenPagesCount = 0;
    for (const page of pagesSet) {
      if (page % 2 !== 0) {
        oddPagesCount++;
      } else {
        evenPagesCount++;
      }
    }

    for (const r of runs) {
      const ex = pageExtremes.get(r.page);
      if (!ex) {
        pageExtremes.set(r.page, { min: r.y, max: r.y });
      } else {
        if (r.y < ex.min) ex.min = r.y;
        if (r.y > ex.max) ex.max = r.y;
      }
    }

    // Count pages per normalized key at page extremes by parity
    const oddKeyPages = new Map<string, Set<number>>();
    const evenKeyPages = new Map<string, Set<number>>();

    for (const r of runs) {
      const key = r.str.trim().replace(/\s+/g, ' ').replace(/\d+/g, '#');
      if (!key) continue;

      const ex = pageExtremes.get(r.page);
      if (!ex) continue;
      const isExtreme = ex.max - r.y <= 30 || r.y - ex.min <= 30;
      if (!isExtreme) continue;

      if (r.page % 2 !== 0) {
        let set = oddKeyPages.get(key);
        if (!set) {
          set = new Set<number>();
          oddKeyPages.set(key, set);
        }
        set.add(r.page);
      } else {
        let set = evenKeyPages.get(key);
        if (!set) {
          set = new Set<number>();
          evenKeyPages.set(key, set);
        }
        set.add(r.page);
      }
    }

    const isHeaderRun = (r: TextRun): boolean => {
      const key = r.str.trim().replace(/\s+/g, ' ').replace(/\d+/g, '#');
      if (!key) return false;

      const ex = pageExtremes.get(r.page);
      if (!ex) return false;
      const isExtreme = ex.max - r.y <= 30 || r.y - ex.min <= 30;
      if (!isExtreme) return false;

      if (r.page % 2 !== 0) {
        const count = oddKeyPages.get(key)?.size ?? 0;
        return oddPagesCount > 0 && count > oddPagesCount * REPEAT_THRESHOLD;
      } else {
        const count = evenKeyPages.get(key)?.size ?? 0;
        return evenPagesCount > 0 && count > evenPagesCount * REPEAT_THRESHOLD;
      }
    };

    let totalNonSpaceChars = 0;
    let candidateRemovedChars = 0;
    for (const r of runs) {
      const nonSpace = r.str.replace(/\s/g, '').length;
      totalNonSpaceChars += nonSpace;
      if (isHeaderRun(r)) {
        candidateRemovedChars += nonSpace;
      }
    }

    // Circuit-breaker: if removing >5% of non-space chars, remove nothing at all and keep every run.
    // This bounds the blast radius of a rule whose failure mode is silent deletion.
    const circuitBreakerTripped =
      totalNonSpaceChars > 0 && candidateRemovedChars / totalNonSpaceChars > 0.05;

    if (!circuitBreakerTripped) {
      filteredRuns = runs.filter((r) => !isHeaderRun(r));
    }
  }

  if (filteredRuns.length === 0) {
    return [];
  }

  // Group runs by page
  const pageMap = new Map<number, TextRun[]>();
  for (const r of filteredRuns) {
    let pRuns = pageMap.get(r.page);
    if (!pRuns) {
      pRuns = [];
      pageMap.get(r.page) || pageMap.set(r.page, pRuns);
    }
    pRuns.push(r);
  }

  const sortedPageNumbers = Array.from(pageMap.keys()).sort((a, b) => a - b);
  const resultBlocks: Block[] = [];

  // Determine effective body size if not supplied
  let effectiveBodySize = bodySize;
  if (!effectiveBodySize) {
    const sizeCounts = new Map<number, number>();
    for (const r of filteredRuns) {
      if (r.str.trim()) {
        const bucket = Math.round(r.size * 2) / 2;
        sizeCounts.set(bucket, (sizeCounts.get(bucket) || 0) + r.str.length);
      }
    }
    let maxChars = 0;
    effectiveBodySize = 10;
    for (const [bucket, count] of sizeCounts.entries()) {
      if (count > maxChars) {
        maxChars = count;
        effectiveBodySize = bucket;
      }
    }
  }

  type Line = {
    text: string;
    x: number;
    y: number;
    size: number;
    fontName: string;
    hasHyphen: boolean;
  };

  for (const pageNum of sortedPageNumbers) {
    const pRuns = pageMap.get(pageNum) || [];
    // Sort runs top-to-bottom (Y descending in PDF coords), left-to-right (X ascending)
    pRuns.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 2) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    // 2. Group runs into lines
    const lines: Line[] = [];
    let currentLineRuns: TextRun[] = [];

    for (const r of pRuns) {
      if (currentLineRuns.length === 0) {
        currentLineRuns.push(r);
      } else {
        const prev = currentLineRuns[currentLineRuns.length - 1];
        if (Math.abs(r.y - prev.y) <= 3) {
          currentLineRuns.push(r);
        } else {
          lines.push(buildLineFromRuns(currentLineRuns));
          currentLineRuns = [r];
        }
      }
    }
    if (currentLineRuns.length > 0) {
      lines.push(buildLineFromRuns(currentLineRuns));
    }

    if (lines.length === 0) {
      resultBlocks.push({ type: 'pagebreak', page: pageNum });
      continue;
    }

    // Calculate line gaps on this page
    const gaps: number[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
      const gap = lines[i].y - lines[i + 1].y;
      if (gap > 0) {
        gaps.push(Math.round(gap));
      }
    }

    let modalGap = 14;
    if (gaps.length > 0) {
      const gapCounts = new Map<number, number>();
      for (const g of gaps) {
        gapCounts.set(g, (gapCounts.get(g) || 0) + 1);
      }
      let maxCount = 0;
      for (const [g, count] of gapCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          modalGap = g;
        }
      }
    }

    // 3. Join lines into paragraphs / headings
    let currentParaLines: Line[] = [];

    const flushPara = () => {
      if (currentParaLines.length === 0) return;

      // 4. De-hyphenate across lines
      let text = '';
      for (let i = 0; i < currentParaLines.length; i++) {
        const line = currentParaLines[i];
        if (i === 0) {
          text = line.text;
        } else {
          const prevLine = currentParaLines[i - 1];
          const nextStartsWithLower = /^[a-z]/.test(line.text.trim());

          if (prevLine.hasHyphen && nextStartsWithLower) {
            // Strip trailing hyphen from accumulated text
            if (text.endsWith('-')) {
              text = text.slice(0, -1);
            }
            text += line.text.trimStart();
          } else {
            // Standard space separation
            text += ' ' + line.text.trim();
          }
        }
      }

      if (text.trim()) {
        resultBlocks.push({ type: 'paragraph', text: text.trim() });
      }
      currentParaLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeading = line.size > 1.25 * effectiveBodySize;

      if (isHeading) {
        flushPara();
        const level: 1 | 2 = line.size > 1.4 * effectiveBodySize ? 1 : 2;
        resultBlocks.push({ type: 'heading', level, text: line.text.trim() });
        continue;
      }

      if (currentParaLines.length === 0) {
        currentParaLines.push(line);
      } else {
        const prevLine = currentParaLines[currentParaLines.length - 1];
        const gap = prevLine.y - line.y;
        const isLargeGap = gap > 1.4 * modalGap;
        const indentChange = Math.abs(line.x - prevLine.x) > 12;

        if (isLargeGap || indentChange) {
          flushPara();
        }
        currentParaLines.push(line);
      }
    }
    flushPara();

    // 5. Emit pagebreak at page boundary
    resultBlocks.push({ type: 'pagebreak', page: pageNum });
  }

  return resultBlocks;
}

function buildLineFromRuns(runs: TextRun[]) {
  runs.sort((a, b) => a.x - b.x);
  let text = '';
  let totalSize = 0;

  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    totalSize += r.size;
    if (i === 0) {
      text = r.str;
    } else {
      const prev = runs[i - 1];
      const needsSpace =
        !prev.str.endsWith(' ') &&
        !prev.str.endsWith('-') &&
        !r.str.startsWith(' ') &&
        !/^[.,;:!?')\]]/.test(r.str);

      if (needsSpace) {
        text += ' ' + r.str;
      } else {
        text += r.str;
      }
    }
  }

  const trimmedText = text.trim();
  const hasHyphen = trimmedText.endsWith('-');

  return {
    text: trimmedText,
    x: runs[0].x,
    y: runs[0].y,
    size: totalSize / runs.length,
    fontName: runs[0].fontName || '',
    hasHyphen,
  };
}
