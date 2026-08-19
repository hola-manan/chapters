# Chapters as a PWA — port to web via react-native-web

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

**The decisions below were made by the human and are not open.**

- **Port, not rebuild.** One codebase serving iOS and web through `react-native-web`, which is
  already installed. Do not rewrite any component in HTML.
- **The PWA is for the iPhone home screen**, as a free alternative to a signed native build. Phone
  layout throughout; a desktop-specific layout is **not** in scope.
- **Parsed text only.** The web build never stores the source PDF — only the parsed book. Safari's
  per-origin quota is finite and a 300MB PDF has no business in it.
- **Native must keep working exactly as it does.** Every change here is additive or behind a
  platform split.

## The shape of the job

Three seams, and nothing else should need touching:

1. Storage — `expo-file-system` does not exist on web.
2. PDF parsing — the hidden WebView does not exist on web, and does not need to: pdf.js runs
   natively there.
3. PWA plumbing — manifest, icons, service worker, HTML shell.

Metro resolves `foo.web.ts` in preference to `foo.ts` when bundling for web. That is the mechanism
for every split below.

## 1. The storage seam — `storage/kv.ts` + `storage/kv.web.ts`

Every `expo-file-system` call in `storage/` reduces to six operations. Introduce one module for them
and put the four existing storage files on top of it.

```ts
// storage/kv.ts — the contract, implemented twice
export async function readText(key: string): Promise<string | null>;
export async function writeText(key: string, value: string): Promise<void>;
export async function exists(key: string): Promise<boolean>;
export async function remove(key: string): Promise<void>;
export async function removePrefix(prefix: string): Promise<void>;
export async function copyInto(key: string, sourceUri: string): Promise<string | null>;
```

- **`storage/kv.ts` (native)** wraps `expo-file-system/legacy` exactly as the current code does:
  keys are paths relative to `documentDirectory`, `writeText` creates intermediate directories,
  `copyInto` copies a file in and returns its new URI.
- **`storage/kv.web.ts`** is IndexedDB — one database, one object store, the key string used
  verbatim. Write it against the raw IndexedDB API; **do not add a dependency**. `removePrefix`
  iterates keys with `IDBKeyRange.bound(prefix, prefix + '￿')`. **`copyInto` returns `null`** —
  the web build stores no source PDFs, and that is the decision, not a limitation to work around.
- Rewrite `storage/files.ts`, `library.ts`, `prefs.ts` and `settings.ts` to use `kv` and **import
  `expo-file-system` nowhere**. Keep every exported function signature and all existing behaviour —
  including `saveReadingPosition`'s promise-chain serialisation and its monotonic `Math.max`.
- `saveBookSource` returns whatever `copyInto` gives, so on web `book.sourceUri` ends up empty.
  **Grep for every read of `sourceUri` and confirm nothing depends on it** before assuming that is
  safe; report anything that does.

## 2. The parsing seam — `pdf/parse.web.ts`

`pdf/parse.ts` orchestrates the WebView bridge. Rather than surgery on it, add a whole-module web
replacement exporting the same public surface, so `import { parsePdf } from '../pdf'` is unchanged
at every call site.

`pdf/parse.web.ts` must:

- Import `pdfjs-dist` directly — it is already a dependency. Set `GlobalWorkerOptions.workerSrc`
  to the bundled worker. **If the worker cannot be wired up under Metro, stop and say so** rather
  than silently falling back to pdf.js's main-thread fake worker: parsing a large book on the main
  thread freezes the very progress UI that is meant to be reassuring.
- Read the picked file as an `ArrayBuffer` (`fetch(uri).then(r => r.arrayBuffer())` works for the
  blob URIs the web document picker returns) and hand it straight to `getDocument`.
- Walk pages, collect `TextRun`s in the same shape the native path produces — including font size
  from the transform matrix as `sqrt(b² + d²)`, not any `fontSize` field.
- Report progress with the **same stage names** the UI already switches on: `reading`, `parsing`,
  `detecting`. `ImportProgressCard` picks bar-versus-spinner from those strings.
- Reuse `runsToBlocks`, `detectChapters`, `resolveBookTitle` and `computeWordCount` **unchanged**.
  They are pure, already Node-tested, and are the majority of the logic — this is exactly the reuse
  the file layout was designed for.
- Produce the same `BookStatus` outcomes, `no-text-layer` and `failed` included, using the same
  sampling rule as native.
- Destroy via the loading task (`task.destroy()`), not the document proxy.

Also add **`pdf/PdfParserView.web.tsx` returning `null`**, so the root layout's `<PdfParserView />`
mounts nothing on web and `react-native-webview` is never imported there.

## 3. PWA plumbing

**`app/+html.tsx`** — expo-router's HTML shell for static web export. It needs:

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` —
  `viewport-fit=cover` is what makes safe-area insets available at all in standalone mode.
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="apple-mobile-web-app-capable" content="yes">` and
  `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
- Two `<meta name="theme-color">` tags with `media="(prefers-color-scheme: light)"` `#F7F8FA` and
  `dark` `#0C1412`, matching the splash colours already in `app.json`.
- A `<style>` block setting `html, body, #root { height: 100%; }` and
  `body { overscroll-behavior: none; }` — without the latter, the whole page rubber-bands under the
  reader and the immersive feel is gone.
- Service worker registration, guarded on `'serviceWorker' in navigator`.

**`public/manifest.webmanifest`** — Expo copies `public/` to the export root.

```json
{
  "name": "Chapters", "short_name": "Chapters",
  "start_url": "/", "scope": "/", "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F8FA", "theme_color": "#142621",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**`public/sw.js`** — deliberately simple, and write a comment saying why. The static export
fingerprints filenames, so a build-time precache list would need generating and would go stale.
Instead: cache-first for same-origin GETs with runtime population, and a navigation fallback to the
cached shell so a cold launch works offline after the first visit. Bump a `CACHE_VERSION` constant
and delete other caches on `activate`.

**Icons** — extend `scripts/generate-icons.mjs` with the web outputs. Same mark, same geometry, no
new decisions:

| File | Size | Ground | Notes |
|---|---|---|---|
| `public/icons/icon-192.png` | 192 | `#142621` | |
| `public/icons/icon-512.png` | 512 | `#142621` | |
| `public/icons/icon-512-maskable.png` | 512 | `#142621` | mark inset to ~72% for the maskable safe zone |
| `public/icons/apple-touch-icon.png` | 180 | `#142621` | **never transparent** — iOS composites it on black |

## 4. Platform gaps to close

- **Haptics reject rather than throw.** Call sites use `try { void Haptics.selectionAsync(); }
  catch {}`, which does **not** catch an async rejection — on web that becomes an unhandled promise
  rejection. Add `.catch(() => {})` at every `Haptics.*` call site in `ui/` and `features/`. This is
  a real fix on native too, wherever haptics are unavailable.
- **`expo-blur`** — confirm `BlurView` renders on web. If it degrades badly, give `Sheet` a plain
  `theme.surface.floating` backdrop on web via a platform check; do not redesign the sheet.
- **Safe-area insets** — verify `useSafeAreaInsets()` returns real values in an iOS standalone PWA.
  If it returns zeros, the reader's chrome and the settings sheet will sit under the notch and the
  home indicator. Report what you find rather than guessing at a fix.
- **`expo-document-picker`** on web returns a blob URI and a name; confirm `ImportProvider` handles
  that shape.
- **`expo-splash-screen`** is a no-op on web; the manifest colours cover it. Make sure the
  `preventAutoHideAsync`/`hideAsync` pair does not throw there.

## 5. Do not change

Any component in `ui/` or `features/`, any screen in `app/` beyond adding `+html.tsx`, or any
existing native behaviour. If a component genuinely cannot render on web without modification, stop
and report it instead of redesigning it.

## Gates

- `npx expo export --platform web` — **must complete**, and this is the real gate for this pass.
  Report any module-resolution failure in full.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run icons` then `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts test/icons.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** **No package installs** — `pdfjs-dist`,
  `react-dom` and `react-native-web` are all present. If you believe something else is genuinely
  required, stop and list it at the end of your response instead of installing it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency.
