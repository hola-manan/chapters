# Library pass — GeneratedCover, BookCard, LibraryFeed, ImportTile

## Goal

Make the Library screen real. This is the first screen to leave the ugly skeleton behind and the
first time the primitives compose into actual UI.

Read `GEMINI.md` first. These are **tier 3** components: they live in `features/library/`, may
import from `design/` and `ui/` and the app's own types, and must still never hardcode a colour,
size, radius or duration.

## Decisions already made by the human — transcribe, do not reinterpret

1. **Wide banner cards**, not portrait book covers. This app is a short-form content viewer
   (~5 minute reads), not a book reader; a 2:3 portrait cover would signal "book" and mislead.
2. **The title sits below the cover**, set in UI type (system font) — not inside the generated art.
   The generated art stays purely abstract.
3. **Delete is a long-press action**, invisible until wanted.
4. **Single column feed**, decided from geometry: at phone width, two wide cards per row leaves each
   about 160pt, too narrow for a banner to be worth generating.

## 1. `features/library/GeneratedCover.tsx`

A deterministic abstract banner derived from the book, used in place of cover art.

- Input: the book `id` or `title`. Same input must always produce the same cover — write a small
  stable string hash; do not use `Math.random`.
- Aspect ratio: wide. Start at **16:9** and expose it as a constant so it is easy to retune.
- **Constrain the palette.** Derive hue from the hash but restrict it to an arc around the app's
  own family — roughly teal through forest through slate — and vary lightness and saturation more
  than hue. Free-range hashing produces covers in colours unrelated to the design system, and a
  library of those reads as a bug rather than a feature. Build the ramp from the existing colour
  primitives where possible; if a generated colour is genuinely needed, compute it in
  `features/`, never in `design/`.
- Keep the composition quiet: a soft gradient, or a few large geometric shapes. No noise, no
  photographic texture. It sits under a title and must never compete with it.
- Must work in both themes. On the dark theme it should sit comfortably against the dark ground —
  test it, do not assume.
- Props: `seed: string`, `radius?`, `testID?`.

## 2. `features/library/BookCard.tsx`

- Composition: a `PressableCard` wrapping a `VStack` — `GeneratedCover` on top, then the title,
  then a metadata line.
- Title: `Text variant="body"` or `"title3"`, `weight="semibold"`, `numberOfLines={2}`.
  Real titles run past 80 characters (*"Laugh Tactics: Master Conversational Humor and Be Funny On
  Command"*), so two lines with truncation is the realistic case, not the edge case.
- Metadata: chapter count and page count, `Text variant="footnote" tone="secondary"`.
  **Use `secondary`, not `tertiary`** — tertiary is now reserved for disabled and decorative use
  only, because at roughly 2.8:1 on paper it is below the readable threshold.
- The card sets `radius` on the `PressableCard` itself, not on an inner `Surface` — whatever paints
  the press overlay owns the shape.
- `onPress` opens the book. `onLongPress` triggers delete (section 4).

## 3. `features/library/LibraryFeed.tsx`

- A `FlatList` of `BookCard`s, single column, with `contentContainerStyle` padding from space tokens.
- Vertical rhythm between cards comes from the list's gap/separator using space tokens — no margins
  on the cards themselves.
- `ImportTile` renders as the **first** item, above the books, so the primary action is in the
  content flow rather than floating over it.
- Empty state: for now a simple centred `Text` explaining the library is empty. `EmptyState` is its
  own later pass — do not design it here, and do not build a reusable component for it yet.

## 4. `features/library/ImportTile.tsx` and delete

**ImportTile** — a `PressableCard` in the same width as a book card but shorter, reading clearly as
an action rather than content. It has two states:

- Idle: an add affordance plus a short label.
- Importing: the current stage text and percentage from the existing `parsePdf` progress callback,
  as plain `Text`. Keep this minimal — `ImportProgressCard` (#20) designs the real progress
  experience later, including skeletons. Do not build shimmer or skeletons now.

**Delete** — on long-press of a `BookCard`, show a native `Alert.alert` with a `destructive`
"Delete" option and a "Cancel". This is deliberate: it is the platform's destructive-confirmation
pattern, needs no new component, and correctly requires confirmation for an irreversible action. A
custom context menu can replace it later if it is ever wanted. Fire `haptic` on the long-press —
deleting is a consequential action, which is exactly the policy for when haptics are allowed.

On confirm, call the existing `removeBook` from `storage/` and refresh the list.

## 5. Rewrite `app/index.tsx`

Replace the skeleton library screen with `LibraryFeed`. Remove the ugly Delete button, the
diagnostic `Status:` / `Source:` lines, and the plain import button — all superseded.

Keep the link to `/_dev/gallery`, but make it small and unobtrusive; it is a development affordance.

Keep the existing import flow logic exactly as it is, including the rejection of `no-text-layer`
and `failed` books with an error message. Only its presentation changes.

## 6. Extend the gallery

Add a Library section showing:

- Eight `GeneratedCover`s in a row or grid, seeded from the real book titles plus synthetic long and
  short ones, so the generator can be judged for variety and coherence across arbitrary input.
- A `BookCard` with a very long title and one with a short title, side by side, so truncation
  behaviour is visible.
- The `ImportTile` in both idle and importing states.

## Explicitly not in this phase

- No `EmptyState`, `Skeleton`, `Progress` or `Toast` components.
- Do not design the import progress experience beyond plain text.
- Do not touch the contents screen or the reader.
- Do not decide `Divider`'s inset or weight.
- Do not change any decided token value.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including the `ui/` guards. The
Library screen renders real cards with generated covers, importing still works, and long-press
deletes after confirmation.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.

---

# Fixes — round 1

The library screen is right. One real defect and one guard gap.

## 1. `GeneratedCover` infers the theme by comparing a hex literal

`features/library/GeneratedCover.tsx:38`:

```ts
const isDark = theme.surface.page !== '#F7F8FA';
```

Two problems. It hardcodes the light paper colour inside a component, so changing that token would
silently flip every cover to its dark treatment. And it infers theme identity rather than being
told, which is the pattern the `Surface` pass deliberately avoided.

Note this is **not** a case of "the token should carry the difference". `GeneratedCover` computes
colours procedurally from a hash, so it genuinely needs to know which scheme it is in — a lightness
band cannot be expressed as a single colour token. The fix is to make the theme state it explicitly.

- Add `scheme: 'light' | 'dark'` to the `Theme` type in `design/themes.ts`, set to `'light'` on
  `lightTheme` and `'dark'` on `darkTheme`. It is a plain string, so it does not violate the
  no-hex-literals rule.
- Replace the inference in `GeneratedCover` with `theme.scheme === 'dark'`.
- No other component may use `theme.scheme` to pick a colour — colours still come from semantic
  tokens. This exists solely for procedural generation. Add a short comment on the `scheme` field
  saying exactly that, so it is not treated as a general licence to branch.

## 2. The colour guard does not cover `features/`

The existing test asserts no hex literals under `ui/`, but `features/` is equally forbidden from
hardcoding colours and is where the violation above appeared.

- Extend the guard so it checks **both** `ui/` and `features/`.
- Keep allowing `transparent`; nothing else.
- Verify by reasoning that the test would have caught the `#F7F8FA` above.

## Not in scope

- Do not change the cover generator's hue arc, layouts or lightness ranges — those are for the
  human to judge on device.
- Do not change any other component.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, with the extended guard covering
`features/`. No hex literal exists anywhere under `ui/` or `features/`.
