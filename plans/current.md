# Phase 1 — The ugly skeleton

## Goal

Build the app end-to-end, **deliberately undesigned**. Import a real PDF, parse it, detect
chapters, store it, list books, list chapters, read chapter text. It must genuinely work on a
physical iPhone through Expo Go.

**Nothing you write in the UI layer is meant to survive.** The visual design is decided later,
by the human, component by component. This phase exists so that those later decisions are made
against real book text, real chapter titles, and real title lengths instead of placeholder
content. Resist every urge to make it look good.

Read `GEMINI.md` and `docs/corpus-findings.md` first. `corpus-findings.md` records measured
facts about the actual test PDFs and directly determines what the parser must handle.

## Explicit non-goals

Do **not** build any of these. They are later phases and building them now actively harms the
project:

- No design tokens, no theme system, no `design/` or `ui/` directories. Those are Phase 2+.
- No colours beyond React Native defaults. No custom fonts. No shadows, gradients, or radii.
- No animations, no transitions, no gestures, no haptics.
- No skeletons, spinners beyond a bare `ActivityIndicator`, no empty-state design.
- No figure/image extraction from PDFs.
- No highlighting, search, bookmarks, sharing, settings, or reading preferences.
- Do not style anything beyond the minimum needed to see the content and tap the targets.

Use plain `View`, `Text`, `Pressable`, `FlatList`, and default styling. Ugly is correct here.

---

## 1. Types — `pdf/types.ts`

```ts
export type Block =
  | { type: 'heading'; level: 1 | 2; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'pagebreak'; page: number }
  | { type: 'figure'; source: string; caption?: string }; // reserved, never emitted in Phase 1

export type Chapter = {
  id: string;
  title: string;
  startPage: number;   // 1-based, inclusive
  endPage: number;     // 1-based, inclusive
  blocks: Block[];
};

export type BookStatus = 'ready' | 'no-text-layer';

export type Book = {
  id: string;
  title: string;
  addedAt: number;
  pageCount: number;
  status: BookStatus;
  chapterSource: 'outline' | 'heuristic' | 'fallback';
  chapters: Chapter[];
  sourceUri: string;   // the copied PDF inside the app's document directory
};
```

`status: 'no-text-layer'` is a **first-class outcome, not an error**. Two of the six real test
books are scanned page images with no extractable text. When this is detected, still produce a
valid `Book` with its chapters (they may come from the outline — chapter structure and text
availability are independent) and with empty `blocks`.

## 2. Pure parsing logic — `pdf/blocks.ts` and `pdf/chapters.ts`

These two files must be **pure TypeScript over plain data**, with **no imports** from
`pdfjs-dist`, `react`, `react-native`, or `expo*`. This is what makes them testable in Node
without a phone. Define your own minimal input type, e.g.:

```ts
export type TextRun = {
  str: string;
  x: number; y: number;      // from the transform matrix: e[4], f[5]
  size: number;              // sqrt(b² + d²) from the transform matrix
  fontName: string;
  page: number;              // 1-based
};
```

### `blocks.ts` — `runsToBlocks(runs: TextRun[]): Block[]`

In order:

1. **Strip running headers/footers.** Group runs by rounded y-position; any text that recurs at
   the same y on more than ~50% of pages is chrome (book title, chapter title, page number).
   Remove it. This is required, not polish — in `The Royal Road to Card Magic` the largest text
   runs in the document are the repeating title and author lines.
2. **Group runs into lines** by y-proximity within a page.
3. **Join lines into paragraphs.** Break on a vertical gap noticeably larger than the modal line
   gap, or on a first-line indent change.
4. **De-hyphenate** words split across a line end (`inter-` + `esting` → `interesting`) — only
   when the next line starts lowercase.
5. Emit a `pagebreak` block at each page boundary.

### `chapters.ts`

- `bodyFontSize(runs: TextRun[]): number` — quantize sizes into ~0.5pt buckets, weight each
  bucket by **character count** (not run count), return the modal bucket. `Mathematics and
  Humor` fragments its body text across 10.0/10.1/10.2/10.3/10.4; a naive mode gets this wrong.
- `detectChapters(...)` — three strategies, in confidence order, never failing:
  1. **Outline.** If the document has one, use it. Map each entry to a start page and derive
     `endPage` from the next entry's start. Flatten to top-level entries only. Set
     `chapterSource: 'outline'`.
  2. **Heuristic.** Score candidate headings on: size > 1.25× body size, run length < ~80 chars,
     vertical whitespace above and below, position near top of page, starts a page, bold-ish
     `fontName`, and title pattern `/^(chapter|part|section|[IVXLC]+\.?|\d+\.?)\b/i`. Note that
     **size alone is not sufficient** — two corpus books have cleanly structured chapters with
     no size difference at all. Set `chapterSource: 'heuristic'`.
  3. **Fallback.** One chapter spanning the whole document, titled after the book. Set
     `chapterSource: 'fallback'`.

## 3. pdf.js integration — `pdf/PdfParser.dom.tsx` and `pdf/parse.ts`

`pdf/parse.ts` exposes exactly one function:

```ts
export async function parsePdf(
  uri: string,
  onProgress?: (stage: string, pct: number) => void
): Promise<Book>;
```

**Nothing else in the app may import `pdfjs-dist`.** All of it lives behind this function, so the
engine underneath can be swapped without touching the app.

Run pdf.js inside a WebView via an Expo DOM component (`'use dom'`), because pdf.js needs a DOM
that React Native does not have. Implementation notes, all of which were verified against the
real corpus:

- Use the **legacy** build: `pdfjs-dist/legacy/build/pdf.mjs`.
- Set `GlobalWorkerOptions.workerSrc` to the bundled worker asset. If that cannot be resolved
  inside the WebView, disable the worker instead and parse on the WebView's main thread — the
  WebView is invisible, so there is no visible jank. Do not leave it unset; pdf.js throws.
- Pass `standardFontDataUrl` pointing at `pdfjs-dist/standard_fonts/`, or some documents fail to
  extract text correctly.
- Destroy through the **loading task** (`task.destroy()`), not the document proxy — `doc.destroy`
  does not exist in pdf.js v6.
- **Do not base64 an entire PDF into the WebView.** `Card College 1` is ~300MB. Pass the file URI
  and fetch it inside the WebView, or stream it. A naive base64 round-trip will crash the app.
- Detect the no-text-layer case early: sample ~10 pages spread across the document, sum the
  extracted characters, and if it is under ~200 return `status: 'no-text-layer'` without
  attempting full extraction.
- Report progress through `onProgress` with stages: `reading`, `parsing`, `detecting`, `done`.

**If `'use dom'` proves unreliable in Expo Go**, fall back to a plain `react-native-webview`
loading a bundled HTML asset with pdf.js, communicating over `postMessage`. Both approaches stay
entirely inside `pdf/`. `react-native-webview` is already installed.

## 4. Storage — `storage/`

- `files.ts` — copy the picked PDF to `${documentDirectory}books/<id>/source.pdf`; write the
  parsed result to `book.json` beside it. Use the SDK 54 `expo-file-system` API.
- `library.ts` — a `library.json` index of book summaries; `listBooks()`, `getBook(id)`,
  `addBook(book)`, `removeBook(id)`.
- `prefs.ts` — reading position per chapter: `{ chapterId, blockIndex }`. Save and restore only;
  no UI for it yet.

## 5. Screens — all deliberately plain

- `app/index.tsx` — Library. A `FlatList` of book titles, each tappable. One "Import a PDF"
  button using `expo-document-picker` (`type: 'application/pdf'`). While parsing, show the book
  title with a bare `ActivityIndicator` and the current progress stage as plain text. Show the
  book's `chapterSource` and `status` as plain text — this is diagnostic information the human
  needs while evaluating detection quality.
- `app/book/[id]/index.tsx` — Contents. A `FlatList` of chapter titles with page ranges, each
  tappable. If `status === 'no-text-layer'`, say so in plain text at the top.
- `app/book/[id]/[chapter].tsx` — Reader. A `FlatList` over `Chapter.blocks` rendering headings
  and paragraphs as plain `Text`, ignoring `pagebreak`. Plain "Previous" / "Next" buttons at the
  bottom to move between chapters. Persist and restore scroll position via `prefs.ts`.
- `app/_dev/gallery.tsx` — create the route with a placeholder screen. It is the workbench for
  later phases. Leave it essentially empty; link to it from the Library screen so it is reachable.

## 6. Tests — Node-side, no phone required

Using the built-in Node test runner (`node --test`), against `pdf/blocks.ts` and
`pdf/chapters.ts` only. Node 24 runs TypeScript directly via type stripping; if that proves
awkward, keep the test files plain `.mjs` importing compiled output — do **not** add a test
framework dependency.

Cover:
- `bodyFontSize` picks the right bucket when sizes fragment across 10.0–10.4.
- Running headers repeating at the same y across pages are stripped.
- De-hyphenation joins across line ends and does not join across a sentence end.
- `detectChapters` prefers the outline, falls back to heuristics, then to a single chapter, and
  never returns an empty chapter list.

Write the fixtures as small hand-built `TextRun[]` arrays inside the test files. Do not commit
PDF-derived fixture files and do not read from `pdfs/`.

## 7. Done means

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `node --test` passes.
- The three screens exist and are navigable.

## Reminders

- Do not commit. Leave everything in the working tree.
- Do not touch anything outside this project directory. If you find something is needed outside
  it, list it at the end of your response instead of doing it.
- Do not modify or read from `pdfs/`.
- Do not upgrade Expo or any `expo-*` package.

---

# Fixes — round 1

Phase 1 is structurally correct: the screens, storage, pure parsing functions, and Node tests are
all in the right shape, typecheck and lint pass, all four tests pass, and Metro bundles the app.
Fix the following defects. **Do not restyle anything, do not add features, do not touch the UI
beyond what a fix requires.** Ugly is still correct.

## 1. The PDF is never copied to permanent storage — books will break

`storage/files.ts` exports `saveBookSource`, but **nothing ever calls it**. `pdf/parse.ts` sets
`sourceUri: req.uri`, which is the `expo-document-picker` cache copy. iOS purges the cache
directory, so every imported book's `sourceUri` becomes a dangling path.

Fix: after a successful parse, copy the PDF into the book's directory via `saveBookSource(id, uri)`
and set `sourceUri` to the permanent path it returns, before `saveBookData` writes `book.json`.
Do this where the book is persisted, not inside the WebView message handler.

## 2. A 300MB PDF will crash the app — the base64 fallback is live

The plan said not to base64 an entire PDF across the bridge. `pdf/parse.ts:82` does exactly that
via `readAsStringAsync(..., Base64)`, and it is not dead code: it is the fallback when the
WebView's `fetch(uri)` fails, which is the *likely* path for a `file://` URI in WKWebView.
`Card College 1` is ~300MB, which becomes a ~400MB base64 string in JS memory and then a single
`postMessage` payload. This will hard-crash.

Fix: keep the `fetch(uri)` fast path, but replace the fallback with a **chunked** transfer. Read
the file in slices using the `position` and `length` options of
`FileSystem.readAsStringAsync` (legacy API supports both), post each chunk as its own message
with a sequence number, and reassemble into a single `Uint8Array` inside the WebView before
calling `getDocument`. Use a chunk size around 4MB of base64. Report `reading` progress as
chunks arrive, so the existing progress UI shows movement on large files.

## 3. The extracted runs are returned in one giant message

`parsePdfDocument` accumulates every text run for the whole document and posts them in a single
`result` message. `The Royal Road to Card Magic` is 436 pages; that payload is tens of megabytes
of JSON serialized through `ReactNativeWebView.postMessage`.

Fix: stream the runs. Post a `runs_chunk` message every ~25 pages carrying only that batch, and
accumulate them in `pdf/parse.ts` against the pending request. The final `result` message should
carry `numPages`, `status`, and `outline` only — not `runs`. Chapter detection still happens in
`parse.ts` once all chunks have arrived.

## 4. The pdf.js worker is not actually configured

`PdfParserView.tsx:24` sets `GlobalWorkerOptions.workerSrc = ''`. An empty string is not a way to
disable the worker; pdf.js will fall through to its fake-worker path or attempt to resolve a
default worker URL, depending on build.

Fix: use the same blob-URL technique already used for the main library. Add the contents of
`pdfjs-dist/legacy/build/pdf.worker.mjs` as a second exported string alongside `PDF_JS_SOURCE`,
build a `Blob` + `URL.createObjectURL` from it, and assign that to
`GlobalWorkerOptions.workerSrc` before any `getDocument` call. It must never attempt a network
request — the app has to parse offline.

## 5. A parse can fire before pdf.js has finished loading

The WebView posts `{ type: 'ready' }` after pdf.js loads, but nothing consumes it —
`handleParserMessage` drops it because it has no `id`. Instead `parsePdf` guesses with a 500ms
`setTimeout`. On a cold start or a slow device, `parsePdfDocument` runs while `window.pdfjsLib`
is still undefined.

Fix: track readiness in `pdf/parse.ts` from the `ready` message. Queue any parse commands
received before ready and flush them once it arrives. Remove the 500ms timeout guess. Keep a
real timeout only as a genuine failure path (e.g. 30s without `ready` rejects with a clear error).

## Not in scope for this round

- `expo-file-system/legacy` is acceptable for now; the chunked read in fix 2 depends on it.
  Leave it, but add a one-line comment noting it is deliberate.
- Do not change the `.ts` import extensions — Metro resolves them and the app bundles.

## Done means

`npx tsc --noEmit`, `npm run lint`, and `node --test` all pass, and the app still bundles with
`npx expo export --platform ios`. Add a Node test covering the runs-chunk accumulation if it can
be done without importing React Native.
