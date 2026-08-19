# Chapters

A single-user iOS reading app. You import a PDF, the app detects its chapters, and each chapter
becomes a reading page with text re-typeset in the app's own type system rather than shown as
PDF page images. There are exactly two user actions: **import a PDF** and **read a PDF**. No
auth, no accounts, no sync, no highlighting, no annotations, no search. The product exists as a
vehicle for learning UI/UX craft — the logic is deliberately trivial so that all the effort goes
into interface quality and into building reusable components. When in doubt, prefer less
functionality and more polish. Do not add features that were not asked for.

## Standing rules

- **Implement the plan in `plans/current.md` exactly.** Do not deviate, do not improvise extra
  features, do not "improve" the scope.
- **Never touch anything outside this project directory.** No global installs, no system config,
  no env vars, no sibling folders. If you discover something is needed outside the project, do
  not do it — list it at the end of your response and stop.
- **Do not commit.** Leave all work in the working tree. The human reviews the diff.
- **Do not run `git` commands that change state** (no commit, checkout, reset, stash, clean).
- **Do not modify `pdfs/`.** That directory holds the human's personal test corpus, is
  gitignored, and is read-only for you.
- Expo has changed a lot. Read the versioned docs for **SDK 54** at
  <https://docs.expo.dev/versions/v54.0.0/> before writing code against any Expo API.

## Platform constraints — these are hard

- The developer is on **Windows with no Mac**. The app is previewed on a physical iPhone through
  the **Expo Go** app.
- **Expo SDK 54 is pinned and must not be upgraded.** Expo Go for SDK 54 is the only build on
  the iOS App Store; SDK 55 is stuck in Apple review and SDK 56+ is not distributed there at all.
  Upgrading the SDK breaks the developer's only way to run the app. Do not run `expo upgrade`,
  do not bump `expo` or any `expo-*` package major version.
- **Only libraries that work inside Expo Go may be used.** No custom native modules, no config
  plugins requiring a native rebuild, no `expo prebuild`. If a task seems to need one, stop and
  report it instead.

## Architecture: the three-tier rule

This is the most important structural constraint in the codebase. It exists so components can be
lifted into unrelated future projects.

| Tier | Directory | May import from | Reusable in |
|---|---|---|---|
| 1 | `design/` | **nothing** | any project, any framework, web or native |
| 2 | `ui/` | `design/` only | any React Native app |
| 3 | `features/` | `design/`, `ui/`, app types | this app only |

- **No file under `design/` may import `react`, `react-native`, or any `expo*` package.** Tokens
  are plain TypeScript values: a colour is `'#F7F3EC'`, a motion token is
  `{ duration: 250, easing: [0.2, 0, 0, 1] }`. Never a `StyleSheet`, never an `Animated` value.
- **No file under `ui/` may hardcode a colour, dimension, radius, or duration.** Every such value
  comes from `design/`. If a card needs 16px padding it reads the space token, not `16`.
- `features/` may know about books, chapters, and blocks. `ui/` may not.

## Layout

```
app/                    expo-router routes
  _layout.tsx           root layout
  index.tsx             Library
  book/[id]/index.tsx   Contents (chapter list)
  book/[id]/[chapter].tsx  Reader
  _dev/gallery.tsx      component gallery — the design workbench
design/                 TIER 1 — portable tokens, zero imports
ui/                     TIER 2 — reusable RN components
features/               TIER 3 — library/ contents/ reader/ import/
pdf/                    PDF parsing
  parse.ts              the ONLY public entry point: parsePdf(uri) -> Book
  PdfParserView.tsx     hidden WebView host; pdf.js runs inside it
  pdfJsSource.ts        generated: pdf.js + worker inlined as strings (~1.9MB)
  chapters.ts           chapter detection (pure, testable in Node)
  blocks.ts             text items -> Block[] (pure, testable in Node)
  types.ts              Book, Chapter, Block
  index.ts              barrel
storage/                library.ts, files.ts, prefs.ts
test/pdf.test.ts        Node-side tests for the pure pdf/ functions
docs/
  components.md         component inventory + design decisions as they land
  corpus-findings.md    measured facts about the real test PDFs — READ THIS
  library.md            API reference for design/ and ui/ — how to call them, and the traps
pdfs/                   personal test corpus, gitignored, read-only
plans/current.md        the task you are implementing
```

## Key facts about PDF parsing

Read `docs/corpus-findings.md` before touching anything in `pdf/`. It records measurements from
the real corpus. The load-bearing points:

- pdf.js is a browser library and cannot run in React Native directly — it runs inside a hidden
  `react-native-webview` hosted by `PdfParserView`, mounted once in the root layout. All of it
  stays behind `parsePdf(uri)` in `pdf/parse.ts`; nothing else in the app imports `pdfjs-dist`.
- The bridge is chunked in **both** directions and must stay that way: the PDF bytes go in as
  ~3MB slices (a 300MB book would otherwise crash the app as a single base64 string), and text
  runs come back streamed every ~25 pages (a 436-page book is otherwise tens of MB of JSON in
  one `postMessage`). Do not "simplify" either into a single message.
- The WebView announces `{ type: 'ready' }` once pdf.js has loaded; parse commands issued before
  that are queued. Do not replace this with a timeout guess.
- **Half the real corpus is not the happy path.** Two of six books are scanned images with no
  text layer at all and cannot be reflowed; one has no outline and needs heuristics. Chapter
  structure and text availability are independent — a book can have a perfect outline and zero
  text.
- Font size comes from a text item's transform matrix as `sqrt(b² + d²)`; there is no `fontSize`
  field. Quantize sizes to ~0.5pt buckets weighted by character count before taking the mode, or
  the body size comes out wrong.
- `chapters.ts` and `blocks.ts` must stay **pure functions** over already-extracted pdf.js data,
  with no pdf.js or React Native imports, so they can be tested in Node without a phone.

## Conventions

- TypeScript throughout, `strict` on. No `any` without a written reason.
- Function components, hooks. No class components.
- Animation via `react-native-reanimated` v4 worklets — never `Animated` from `react-native`.
- File naming: components `PascalCase.tsx`, everything else `camelCase.ts`.
- Each directory that is part of the public surface gets an `index.ts` barrel.
- Prefer explicit props over spreading. Prefer composition over configuration flags.

## Commands

```bash
npm start           # expo start — developer scans the QR with Expo Go
npm run lint        # expo lint
npx tsc --noEmit    # typecheck — must pass before you report done
node --test         # Node-side tests for pdf/ pure functions
```

Typecheck and lint must both pass before you report a task complete.
