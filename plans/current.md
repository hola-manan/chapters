# Icon, Skeleton, EmptyState, CollapsingHeader — against their real call sites

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

**The design decisions below were made by the human and are not open.** Implement them exactly.
Every component here has an existing call site currently served by a placeholder; none of this is
speculative library-building. `Button` and `Slider` stay `todo` — they still have no caller.

Decided:

- **`Icon` takes both vocabularies in one `size` prop**: type-variant names for icons beside text,
  named steps for standalone icons.
- **Loading shows what we already know.** Screens stop re-reading data the previous screen was
  holding. The real header renders instantly; only the body is pending, and it gets a skeleton
  **after a delay** so fast loads never flash.
- **The empty library talks about reading, not importing** — the import tile is already on screen
  and says how to import.
- **The Contents title moves into the nav bar on scroll**, iOS large-title style, with the read time
  fading out.

## 1. Tier 1 — `design/tokens/icon.ts`

```ts
// Ionicons are drawn to fill their square, so an icon set to the same point size as the text
// beside it reads as larger. These are the optically corrected sizes, not the type sizes.
export const iconSizes = {
  // Beside text — one per UI type variant that actually pairs with an icon.
  caption: 12,
  footnote: 14,
  subhead: 16,
  body: 18,
  title3: 20,
  // Standalone — no text to match.
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type IconSizeName = keyof typeof iconSizes;
```

Export from `design/index.ts`.

## 2. Tier 2 — `ui/primitives/Icon.tsx`

```ts
export type IconProps = {
  name: keyof typeof Ionicons.glyphMap;
  size?: IconSizeName;                                                  // default 'body'
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent';  // default 'primary'
  testID?: string;
};
```

- Resolves the pixel size from `iconSizes` and the colour from `theme.text[tone]` (or
  `theme.accent.base` for `accent`). **No numeric `size` and no `color` prop** — the same closed-prop
  discipline as `Text`, for the same reason.
- Replace all three existing raw `Ionicons` call sites: `features/library/ImportTile.tsx`
  (currently 20, accent), `features/reader/ReaderChrome.tsx` (currently 24 chevron and 22 for the
  `Aa`, both primary). Pick sizes from the scale rather than preserving today's three arbitrary
  numbers — that inconsistency is the bug being fixed.
- After this, `@expo/vector-icons` should be imported only by `ui/primitives/Icon.tsx` and the
  gallery. Do not leave a second import anywhere in `features/`.

## 3. Tier 2 — `ui/feedback/Skeleton.tsx`

```ts
export type SkeletonTextProps = {
  lines?: number;      // default 3
  delayMs?: number;    // default 200 — nothing renders before this elapses
  testID?: string;
};
```

- Renders `lines` rounded bars at `theme.surface.sunken`, reading-line height, with varied widths
  (100%, 92%, 76% cycling) so it reads as prose rather than a table. Vertical rhythm matches
  `ParagraphBlock`'s `space.paragraphGap`.
- **Renders nothing at all until `delayMs` has elapsed.** A skeleton that appears and vanishes
  inside 200ms reads as a flicker, and most books in this library load faster than that. Clear the
  timer on unmount.
- Animation is a **gentle opacity pulse** between two values via `withRepeat(withTiming(...))` — not
  a sweeping shimmer gradient. A shimmer needs a masked gradient and reads as a busy app; this one
  should read as a quiet page waiting. Static under `useReducedMotion()`.
- Export from `ui/feedback/index.ts` and `ui/index.ts`.

## 4. Tier 2 — `ui/feedback/EmptyState.tsx`

```ts
export type EmptyStateProps = {
  title?: string;
  message: string;
  children?: React.ReactNode;   // escape hatch; neither current call site uses it
  testID?: string;
};
```

Centred, generous vertical padding. `title` as `Text variant="body" weight="semibold"`, `message` as
`Text variant="subhead" tone="secondary" align="center"` with a constrained max width so the line
does not run the full screen. **No action slot** — do not design one before something needs it.

## 5. Tier 2 — `ui/motion/useScrollY.ts`

```ts
export function useScrollY(): {
  scrollY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
};
```

The plain sibling of `useAutoHide`: it only reports the offset. Export from `ui/motion/index.ts`.

## 6. Tier 2 — `ui/overlay/CollapsingHeader.tsx`

The compact bar only. The large title stays in the list's own header where it already lives; this
component is what appears above it.

```ts
export type CollapsingHeaderProps = {
  scrollY: SharedValue<number>;
  title: string;
  collapseDistance: number;   // px of scroll over which the handover completes
  onBack?: () => void;
  testID?: string;
};
```

- Absolutely positioned, safe-area aware, same construction as `ReaderChrome`: background
  `theme.surface.page`, hairline bottom border.
- The **back button is always visible and never animates** — it is navigation, not decoration.
- Background, hairline and compact title interpolate from `scrollY` across `[0, collapseDistance]`:
  invisible at the top, fully present once collapsed. The compact title also rises a few points as
  it fades in, so it arrives rather than materialises.
- All interpolation inside `useAnimatedStyle`. Nothing scroll-linked may run on the JS thread.
- Export from `ui/overlay/index.ts` and `ui/index.ts`.

## 7. Stop re-reading what the previous screen already had

This is the core of the pass. Both screens currently mount, show placeholder text, and read from
disk before they can render anything — despite the screen you just left holding the answer.

**Library → Contents.** Push with the book title as a route param alongside the id. In
`app/book/[id]/index.tsx` render `ContentsHeader` from that param **immediately**, before `getBook`
resolves. When the book arrives, render from it instead.

**Contents → Reader.** Push with the chapter's display title, its 1-based number and the chapter
count. In `app/book/[id]/[chapter].tsx` the full-screen "Loading chapter…" goes away entirely:
render `ReaderChrome` and a real `ChapterOpening` from the params at once, with `SkeletonText` below
it until the blocks arrive.

Three rules that keep this honest:

- **Params are used only while the loaded data is absent.** Once `book` is present everything
  derives from it. Paging between chapters makes the params stale immediately, so a component that
  keeps preferring them will show the wrong chapter title from the second chapter onward.
- **Both screens must still work with no params at all** — a cold deep link, or a reload while the
  reader is open. Fall back to rendering the skeleton until the data arrives.
- Do not pass objects through params. Title, number and count only, as strings.

## 8. Wire up the two remaining call sites

- **Empty library.** `features/library/LibraryFeed.tsx` currently renders one line of secondary
  text. Replace it with `EmptyState`, title `Nothing here yet.` and message
  `Chapters turns a PDF into a handful of short reads.` It must not mention importing — `ImportTile`
  sits directly above it and already says that.
- **Empty chapter.** The reader's "No text blocks found in this chapter." becomes an `EmptyState`.
  Keep both existing message strings exactly as they are, including the scanned-document variant.
- **Contents collapse.** `app/book/[id]/index.tsx` gets `headerShown: false` in `app/_layout.tsx`,
  like the reader, and renders `CollapsingHeader` itself. That is what buys UI-thread control of
  both ends of the handover; a native header title cannot be animated from a worklet. The native
  back **gesture** is unaffected — that is `gestureEnabled`, not `headerShown`. Drive it with
  `useScrollY` on the chapter `FlatList`. Measure `collapseDistance` from the large title's own
  height via `onLayout` rather than guessing. The read time fades with the large header, not the
  bar. Remove the now-stale comment in `ContentsHeader` about deferring collapse until #15 exists.

## 9. Gallery — `app/_dev/gallery.tsx`

`Icon` across every size and tone; `SkeletonText` at 1, 3 and 6 lines with `delayMs={0}` so it is
visible without waiting; `EmptyState` in both of its real configurations. `CollapsingHeader` is not
gallery material — it means nothing without a live scroll view.

## 10. Do not change

The reader's reading surface, chrome behaviour, paging, commit timing, settings sheet, import flow
and progress recording are all settled.

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
