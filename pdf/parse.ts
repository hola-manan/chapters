// Deliberate use of expo-file-system/legacy API for chunked file reading and file ops
import * as FileSystem from 'expo-file-system/legacy';
import { detectChapters, resolveBookTitle } from './chapters.ts';
import type { Book, BookStatus, OutlineEntry, TextRun } from './types.ts';

export type ProgressCallback = (stage: string, pct: number) => void;

export type PendingParseRequest = {
  id: string;
  uri: string;
  bookTitle: string;
  accumulatedRuns: TextRun[];
  onProgress?: ProgressCallback;
  resolve: (book: Book) => void;
  reject: (err: Error) => void;
};

const pendingRequests = new Map<string, PendingParseRequest>();
const queuedCommands: unknown[] = [];
let isWebviewReady = false;
let parserWebviewRef: { postCommand: (cmd: unknown) => void } | null = null;

export function registerPdfParserRef(ref: { postCommand: (cmd: unknown) => void } | null) {
  parserWebviewRef = ref;
  if (ref && isWebviewReady) {
    flushQueuedCommands();
  }
}

function flushQueuedCommands() {
  while (queuedCommands.length > 0 && parserWebviewRef) {
    const cmd = queuedCommands.shift();
    parserWebviewRef.postCommand(cmd);
  }
}



export function handleParserMessage(msg: {
  id?: string;
  type: string;
  stage?: string;
  pct?: number;
  status?: BookStatus;
  numPages?: number;
  runs?: TextRun[];
  outline?: OutlineEntry[];
  metadataTitle?: string;
  error?: string;
  uri?: string;
}) {
  if (msg.type === 'ready') {
    isWebviewReady = true;
    flushQueuedCommands();
    return;
  }

  if (!msg.id) return;
  const req = pendingRequests.get(msg.id);
  if (!req) return;

  if (msg.type === 'progress' && msg.stage && typeof msg.pct === 'number') {
    req.onProgress?.(msg.stage, msg.pct);
  } else if (msg.type === 'runs_chunk' && Array.isArray(msg.runs)) {
    req.accumulatedRuns.push(...msg.runs);
  } else if (msg.type === 'result' && msg.numPages) {
    pendingRequests.delete(msg.id);
    req.onProgress?.('detecting', 95);

    try {
      const status: BookStatus = msg.status || 'ready';
      const numPages = msg.numPages || 1;
      const runs = req.accumulatedRuns;
      const outline = msg.outline || [];

      const resolvedTitle = resolveBookTitle(msg.metadataTitle, req.bookTitle);

      const { chapters, chapterSource } = detectChapters(
        runs,
        outline,
        numPages,
        resolvedTitle
      );

      const book: Book = {
        id: req.id,
        title: resolvedTitle,
        addedAt: Date.now(),
        pageCount: numPages,
        status,
        error: msg.error,
        chapterSource,
        chapters,
        sourceUri: req.uri,
      };

      req.onProgress?.('done', 100);
      req.resolve(book);
    } catch (err) {
      req.reject(err instanceof Error ? err : new Error(String(err)));
    }
  } else if (msg.type === 'error') {
    pendingRequests.delete(msg.id);
    req.reject(new Error(msg.error || 'Failed to parse PDF'));
  }
}

export async function handleFileRequest(id: string, uri: string) {
  const req = pendingRequests.get(id);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    const totalSize = info.exists && info.size ? info.size : 0;

    // Use ~3MB raw chunk size (~4MB Base64)
    const CHUNK_SIZE = 3 * 1024 * 1024;

    if (totalSize <= 0) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      parserWebviewRef?.postCommand({
        command: 'file_chunk',
        id,
        index: 0,
        totalChunks: 1,
        chunkBase64: base64,
      });
      return;
    }

    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    for (let index = 0; index < totalChunks; index++) {
      const position = index * CHUNK_SIZE;
      const length = Math.min(CHUNK_SIZE, totalSize - position);

      const chunkBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        position,
        length,
      });

      req?.onProgress?.('reading', Math.round(((index + 1) / totalChunks) * 100));

      parserWebviewRef?.postCommand({
        command: 'file_chunk',
        id,
        index,
        totalChunks,
        chunkBase64,
      });
    }
  } catch (e) {
    parserWebviewRef?.postCommand({
      command: 'file_error',
      id,
      error: e instanceof Error ? e.message : 'Read error',
    });
  }
}

export async function parsePdf(
  uri: string,
  onProgress?: ProgressCallback
): Promise<Book> {
  const id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Extract candidate title from filename
  let fileName = uri.split('/').pop() || 'Untitled Book';
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    // Keep raw filename on decode error
  }
  const bookTitle = fileName.replace(/\.pdf$/i, '').trim() || 'Untitled Book';

  return new Promise<Book>((resolve, reject) => {
    const req: PendingParseRequest = {
      id,
      uri,
      bookTitle,
      accumulatedRuns: [],
      onProgress,
      resolve,
      reject,
    };
    pendingRequests.set(id, req);

    const cmd = { command: 'parse', id, uri };
    if (isWebviewReady && parserWebviewRef) {
      parserWebviewRef.postCommand(cmd);
    } else {
      queuedCommands.push(cmd);
    }

    // Genuine 30s timeout guard for webview readiness
    setTimeout(() => {
      if (!isWebviewReady && pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('PDF Parser WebView timed out initialization after 30 seconds.'));
      }
    }, 30000);
  });
}
