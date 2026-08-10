import type { Block, TextRun } from './types';

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
  // Count distinct pages where each rounded Y position appears
  const yPageMap = new Map<number, Set<number>>();
  for (const r of runs) {
    const roundedY = Math.round(r.y * 2) / 2; // 0.5pt rounding
    let set = yPageMap.get(roundedY);
    if (!set) {
      set = new Set<number>();
      yPageMap.set(roundedY, set);
    }
    set.add(r.page);
  }

  // Filter out runs that occur at Y coordinates present on >50% of pages (when totalPages > 2)
  const chromeYThreshold = Math.max(2, totalPages * 0.5);
  const filteredRuns = runs.filter((r) => {
    const roundedY = Math.round(r.y * 2) / 2;
    const pageCountAtY = yPageMap.get(roundedY)?.size ?? 0;
    return totalPages <= 2 || pageCountAtY <= chromeYThreshold;
  });

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
