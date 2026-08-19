# The import moment — Progress, Toast, and an import that survives navigation

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

**The design decisions below were made by the human and are not open.** Implement them exactly.

Decided:

- **One import at a time.** A second import attempt while one is running is ignored, and the import
  tile is disabled for the duration.
- **The import is visible as a card in the book's place** — top of the library feed, becoming the
  real book card when parsing finishes.
- **Progress is honest per stage.** A determinate bar for the stages that genuinely know their
  position; an indeterminate circle for the stage that does not. **Stage words accompany both,
  always.**
- **You can leave and keep using the app.** The import continues and tells you when it is done.
- **Completion shows a toast anywhere in the app, including while reading, and the toast is
  tappable** — tapping opens the finished book.
- **A rejected PDF becomes an error card inline, in the same slot**, and stays until dismissed.

Which stage gets which indicator — this mapping is the whole point, so get it right:

| Stage (from `parsePdf`) | Words | Indicator |
|---|---|---|
| `reading` | "Reading file…" | **Bar.** Genuinely 0–100 across a known chunk count. |
| `parsing` | "Extracting text…" | **Bar.** Genuinely 0–100 across a known page count. |
| `detecting` | "Finding chapters…" | **Circle.** Reports a single 95 and cannot be measured. |

Each bar shows **that stage's own progress**, restarting per stage. Do not stitch the three into one
global bar — a global bar is exactly the dishonest thing this design avoids.

## 1. Tier 2 — `ui/feedback/Progress.tsx`

New directory `ui/feedback/`. Two components, both driven from `design/` tokens.

```ts
export type ProgressBarProps = { value: number; testID?: string };   // 0..1, clamped
export type SpinnerProps = { size?: 'sm' | 'md'; testID?: string };
```

- `ProgressBar`: a full-width track at `theme.surface.sunken`, a fill at `theme.accent.base`,
  hairline-thin, pill radius. The fill width animates with `withSpring(springs.default)` so a jump
  between chunk reports reads as movement rather than teleporting.
- `Spinner`: a rotating arc — a circle with a transparent border on three sides and
  `theme.accent.base` on one, rotated by a looping `withRepeat(withTiming(360, …), -1)`. Sizes come
  from `space` tokens, border width from a hairline-derived value.
- Under `useReducedMotion()` the spinner keeps rotating — it is essential feedback, not decoration —
  but the bar's fill jumps rather than springs.
- Export from `ui/feedback/index.ts` and `ui/index.ts`.

## 2. Tier 2 — `ui/feedback/Toast.tsx`

A provider plus a hook, mounted once above the navigator so a toast can appear over any screen.

```ts
export type ToastOptions = {
  message: string;
  onPress?: () => void;   // makes the toast tappable
  durationMs?: number;    // default 4000
};

export function ToastProvider(props: { children: React.ReactNode }): JSX.Element;
export function useToast(): { show: (options: ToastOptions) => void };
```

- Renders at the bottom, above `useSafeAreaInsets().bottom`, as a `Surface elevation={2}` with a
  pill radius and horizontal margins — floating, not full-bleed.
- Enters and leaves by translating up from below plus opacity, `springs.default`. Auto-dismisses
  after `durationMs`.
- Tapping a toast with an `onPress` runs it and dismisses. Tapping one without just dismisses.
- **One at a time.** A second `show` while one is visible replaces the current toast and restarts
  its timer; do not build a stack, nothing in this app produces two.
- The dismiss timer must be cleared on unmount and on replacement, or a stale timer will dismiss the
  new toast early.
- Export from `ui/feedback/index.ts` and `ui/index.ts`.

## 3. Tier 3 — `features/import/ImportProvider.tsx`

The import currently lives in `app/index.tsx`, so navigating away loses it. Move it above the
navigator.

```ts
export type ImportState =
  | { status: 'idle' }
  | { status: 'importing'; fileName: string; stage: string; pct: number }
  | { status: 'error'; fileName: string; message: string };

export function ImportProvider(props: { children: React.ReactNode }): JSX.Element;
export function useImport(): {
  state: ImportState;
  startImport: () => Promise<void>;   // picks a document and runs the parse
  dismissError: () => void;
};
```

- `startImport` returns immediately if `state.status === 'importing'`.
- It owns everything `handlePickDocument` does today: the document picker, `parsePdf` with its
  progress callback, the `no-text-layer` and `failed` rejections, and `addBook`. Move that logic;
  do not leave a copy behind.
- Keep the existing rejection copy verbatim — it was written deliberately.
- On success it calls `useToast().show` with `` `“${book.title}” is ready` `` and an `onPress` that
  routes to `/book/${book.id}`. Use `router` from `expo-router` — the provider sits inside the
  navigator for this reason.
- The library screen must refresh when an import finishes. It already reloads on focus; add a
  `lastCompletedAt` timestamp to the context so a screen that is already focused can react.

## 4. Tier 3 — `features/library/ImportProgressCard.tsx`

Occupies a book card's slot at the top of the feed. Match `BookCard`'s outer shape exactly —
same radius, same border, same width — so the swap to a real card at the end is not a jolt.

- **Importing:** where the generated cover would be, a plain `theme.surface.sunken` block at the same
  16:9 ratio. Below it the **file name** (we know it immediately; the real title only exists after
  parsing), then a row with the stage words as `Text variant="footnote" tone="secondary"` and either
  a `ProgressBar` or a `Spinner` per the table above.
- **Error:** the same card shape, no progress. The file name, the rejection message as
  `Text variant="footnote" tone="secondary"`, and a `TextLink` reading `Dismiss` calling
  `dismissError`. It persists until dismissed — that is the point of putting it here rather than in
  a toast.
- Not pressable in either state.

## 5. Wiring

- `app/_layout.tsx`: wrap the tree in `ToastProvider` and `ImportProvider`, both **inside** the
  navigator so the toast can route. Order matters — `ImportProvider` must be able to call
  `useToast`.
- `app/index.tsx`: delete the local import state and `handlePickDocument`; read `useImport()`
  instead. Render `ImportProgressCard` at the top of the feed when the status is `importing` or
  `error`. `ImportTile` gets `disabled` while importing.
- Accepted limitation, worth a comment rather than a fix: a toast cannot draw over the settings
  `Sheet`, because that is a native `Modal`. Finishing an import while the sheet is open means the
  toast is missed; the card in the library is the durable record.

## 6. Gallery — `app/_dev/gallery.tsx`

Add `ProgressBar` at several values, both `Spinner` sizes, a button that fires a toast (one plain,
one tappable), and `ImportProgressCard` in both its importing and error states.

## 7. Do not change

The reader in any respect. The reading surface, chrome, paging, commit timing, settings sheet and
progress recording are all settled.

## Gates

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** List any out-of-repo need at the end of
  your response instead of acting on it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency. SDK 54 is a hard constraint.
