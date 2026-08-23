import type * as PdfjsLib from 'pdfjs-dist';
import { detectChapters, resolveBookTitle } from './chapters.ts';
import { PDF_JS_SOURCE } from './pdfJsSource.ts';
import { PDF_WORKER_JS_SOURCE } from './pdfWorkerSource.ts';
import type { Book, OutlineEntry, TextRun } from './types.ts';

export type ProgressCallback = (stage: string, pct: number) => void;

// WebKit does not implement async iteration on ReadableStream, and pdf.js v6's
// PDFPageProxy.getTextContent() does 'for await (const value of readableStream)'.
// Without this shim every getTextContent() call throws "undefined is not a function".
const streamProto = typeof ReadableStream !== 'undefined' ? (ReadableStream.prototype as any) : null;
if (streamProto && !streamProto[Symbol.asyncIterator]) {
  streamProto[Symbol.asyncIterator] = function (options?: { preventCancel?: boolean }) {
    const preventCancel = !!(options && options.preventCancel);
    const reader = this.getReader();
    return {
      next() {
        return reader.read().then(function (result: { done: boolean; value: unknown }) {
          if (result.done) {
            reader.releaseLock();
            return { done: true, value: undefined };
          }
          return { done: false, value: result.value };
        });
      },
      return(value?: unknown) {
        if (!preventCancel) {
          void reader.cancel(value);
        }
        reader.releaseLock();
        return Promise.resolve({ done: true, value });
      },
      throw(err?: unknown) {
        void reader.cancel(err);
        reader.releaseLock();
        return Promise.reject(err);
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
  streamProto.values = streamProto[Symbol.asyncIterator];
}

// pdf.js is loaded exactly the way the native WebView loads it: the source is held as a *string*
// and evaluated at runtime from a Blob URL. That is not incidental — it is the only arrangement
// that works here, and each of the alternatives fails in its own way.
//
// Importing `pdfjs-dist` as a module — statically or via require() — puts its code through Metro
// and into the main bundle, which the page loads as a classic script. pdf.js contains
// `createRequire(import.meta.url)` in two Node-only branches, and `import.meta` is a *parse-time*
// error in a classic script, so the entire bundle fails before a line of it runs. That is a white
// screen with no clue in it beyond one SyntaxError.
//
// A lazy import() instead emits an async Metro chunk, and requiring a module out of that chunk
// failed at runtime on the deployed sub-path ("unknown module 1041").
//
// Held as a string, the source never reaches Metro's parser. Evaluating it through the browser's
// own dynamic import gives it a module context, where those `import.meta` branches are legal —
// and being Node-only, they never execute anyway.
declare const Function: FunctionConstructor;

// Metro rewrites a literal `import()` into its own async-require, which cannot load a Blob URL.
// This indirection keeps the call opaque to the bundler so the browser's native dynamic import is
// what actually runs.
const nativeDynamicImport = new Function('u', 'return import(u)') as (
  url: string
) => Promise<unknown>;

let pdfjsPromise: Promise<typeof PdfjsLib> | null = null;

function loadPdfjs(): Promise<typeof PdfjsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mainUrl = URL.createObjectURL(
        new Blob([PDF_JS_SOURCE], { type: 'application/javascript' })
      );
      const lib = (await nativeDynamicImport(mainUrl)) as typeof PdfjsLib;

      const workerUrl = URL.createObjectURL(
        new Blob([PDF_WORKER_JS_SOURCE], { type: 'application/javascript' })
      );
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      return lib;
    })();
  }
  return pdfjsPromise;
}

async function processOutline(
  doc: PdfjsLib.PDFDocumentProxy,
  outlineItems: any[]
): Promise<OutlineEntry[]> {
  const result: OutlineEntry[] = [];
  for (const item of outlineItems) {
    let pageNum = 1;
    try {
      if (typeof item.dest === 'string') {
        const dest = await doc.getDestination(item.dest);
        if (dest && dest[0]) {
          const pageIdx = await doc.getPageIndex(dest[0]);
          pageNum = pageIdx + 1;
        }
      } else if (Array.isArray(item.dest) && item.dest[0]) {
        const pageIdx = await doc.getPageIndex(item.dest[0]);
        pageNum = pageIdx + 1;
      }
    } catch {
      // Keep pageNum = 1 if destination cannot be resolved
    }

    const children =
      item.items && item.items.length > 0
        ? await processOutline(doc, item.items)
        : undefined;

    result.push({
      title: item.title || 'Untitled',
      page: pageNum,
      children,
    });
  }
  return result;
}

export async function parsePdf(
  uri: string,
  onProgress?: ProgressCallback
): Promise<Book> {
  const id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  onProgress?.('reading', 0);
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  const pdfData = new Uint8Array(buf);
  onProgress?.('reading', 100);

  const pdfjsLib = await loadPdfjs();
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  onProgress?.('parsing', 10);

  // 1. Detect no-text-layer early: sample ~10 pages across document
  const sampleIndices: number[] = [];
  const sampleCount = Math.min(10, numPages);
  for (let i = 0; i < sampleCount; i++) {
    const pageNum = Math.floor(1 + (i * (numPages - 1)) / Math.max(1, sampleCount - 1));
    sampleIndices.push(pageNum);
  }

  let totalSampleChars = 0;
  let sampleErrorCount = 0;
  let firstSampleError: string | null = null;

  for (const pNum of sampleIndices) {
    try {
      const page = await doc.getPage(pNum);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ('str' in item && typeof item.str === 'string') {
          totalSampleChars += item.str.trim().length;
        }
      }
      page.cleanup();
    } catch (e) {
      sampleErrorCount++;
      if (!firstSampleError) {
        firstSampleError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  let rawOutline: OutlineEntry[] = [];
  try {
    const outlineData = await doc.getOutline();
    if (outlineData) {
      rawOutline = await processOutline(doc, outlineData);
    }
  } catch {
    // Ignore outline error
  }

  let metadataTitle = '';
  try {
    const meta = await doc.getMetadata();
    if (meta && meta.info && typeof (meta.info as Record<string, unknown>).Title === 'string') {
      metadataTitle = (meta.info as Record<string, unknown>).Title as string;
    }
  } catch {
    // Ignore metadata error
  }

  // Extract candidate title from filename / URI
  let fileName = uri.split('/').pop() || 'Untitled Book';
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // Keep raw fileName
  }
  const candidateTitle = fileName.replace(/\.pdf$/i, '').trim() || 'Untitled Book';
  const resolvedTitle = resolveBookTitle(metadataTitle, candidateTitle);

  if (sampleErrorCount === sampleIndices.length) {
    await loadingTask.destroy();
    return {
      id,
      title: resolvedTitle,
      addedAt: Date.now(),
      pageCount: numPages,
      status: 'failed',
      error: firstSampleError || 'Failed to read text from sampled pages',
      chapterSource: 'fallback',
      chapters: [],
      sourceUri: uri,
    };
  }

  if (totalSampleChars < 200) {
    await loadingTask.destroy();
    return {
      id,
      title: resolvedTitle,
      addedAt: Date.now(),
      pageCount: numPages,
      status: 'no-text-layer',
      chapterSource: 'fallback',
      chapters: [],
      sourceUri: uri,
    };
  }

  // 2. Full text extraction across all pages
  const runs: TextRun[] = [];
  for (let pNum = 1; pNum <= numPages; pNum++) {
    const page = await doc.getPage(pNum);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str || !item.transform) continue;
      const tr = item.transform;
      const x = tr[4];
      const y = tr[5];
      const size = Math.hypot(tr[1], tr[3]) || Math.abs(tr[0]) || 10;

      runs.push({
        str: item.str,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        size: Math.round(size * 10) / 10,
        fontName: item.fontName || '',
        page: pNum,
      });
    }

    page.cleanup();

    if (pNum % 25 === 0 || pNum === numPages) {
      const pct = Math.round(10 + (pNum / numPages) * 80);
      onProgress?.('parsing', pct);
    }
  }

  onProgress?.('detecting', 95);
  await loadingTask.destroy();

  const { chapters, chapterSource } = detectChapters(
    runs,
    rawOutline,
    numPages,
    resolvedTitle
  );

  const book: Book = {
    id,
    title: resolvedTitle,
    addedAt: Date.now(),
    pageCount: numPages,
    status: 'ready',
    chapterSource,
    chapters,
    sourceUri: uri,
  };

  onProgress?.('done', 100);
  return book;
}
