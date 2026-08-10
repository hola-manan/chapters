export type Block =
  | { type: 'heading'; level: 1 | 2; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'pagebreak'; page: number }
  | { type: 'figure'; source: string; caption?: string }; // reserved, never emitted in Phase 1

export type Chapter = {
  id: string;
  title: string;
  startPage: number; // 1-based, inclusive
  endPage: number; // 1-based, inclusive
  blocks: Block[];
};

export type BookStatus = 'ready' | 'no-text-layer' | 'failed';

export type Book = {
  id: string;
  title: string;
  addedAt: number;
  pageCount: number;
  status: BookStatus;
  error?: string;
  chapterSource: 'outline' | 'heuristic' | 'fallback';
  chapters: Chapter[];
  sourceUri: string; // the copied PDF inside the app's document directory
};

export type TextRun = {
  str: string;
  x: number;
  y: number; // from the transform matrix
  size: number; // font height size from transform matrix: sqrt(b² + d²)
  fontName: string;
  page: number; // 1-based
};

export type OutlineEntry = {
  title: string;
  page: number; // 1-based start page
  children?: OutlineEntry[];
};
