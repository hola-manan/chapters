# Reader chrome — immersive reading, revealed chrome, swipe between chapters

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

**The design decisions below were made by the human on device and are not open.** Implement them
exactly; do not substitute your own taste, and do not add affordances nobody asked for.

Decided:

- **Immersive reading.** Nothing on screen but the text. The native stack header is turned off for
  the reader route and the ugly prev/next footer is deleted outright.
- **Chrome is revealed two ways: scroll up, and tap.** Scrolling down hides it, scrolling up brings
  it back, and a tap anywhere toggles it.
- **No progress indicator of any kind in the reader.** A five-minute chapter does not need one.
  Component #28 `ReaderProgressBar` is cut. **Progress *recording* stays exactly as it is** — it
  drives the library card and the resume point.
- **Horizontal swipe moves between chapters, in both directions**, with the **left screen edge
  reserved** so iOS's back gesture keeps working. Plus an end card at the bottom of every chapter.

Two calls I am making because they follow from the above rather than being separate decisions —
implement them as written:

- **The status bar stays visible.** Hiding it on a notched iPhone leaves a blank notch region rather
  than gaining space.
- **Chrome starts visible when a chapter opens** and hides on the first downward scroll. Entering an
  immersive screen with no visible way back is disorienting even when you know the gesture.

## 1. Tier 2 — `ui/motion/useAutoHide.ts`

New directory `ui/motion/`. This hook is the reusable half of the pass: scroll-linked auto-hide is
wanted by any app with a reading or feed surface, so it belongs in tier 2, not in the reader.

```ts
export type UseAutoHideOptions = {
  threshold?: number;        // px of movement before committing, default 10
  initiallyVisible?: boolean; // default true
};

export type AutoHide = {
  visibility: SharedValue<number>;  // 0 hidden, 1 visible — animated on the UI thread
  isVisible: boolean;               // JS mirror, for pointerEvents only
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  toggle: () => void;
};
```

- Use `useAnimatedScrollHandler` so direction detection runs on the UI thread. Track the previous
  offset in a shared value; only commit a change once movement in one direction exceeds `threshold`,
  so ordinary finger jitter does not toggle the bar.
- Animate `visibility` with `withSpring` using `springs.default` from `design/tokens/motion`.
- Never hide while the scroll offset is within `threshold` of the top — at the top of a chapter the
  chrome should be up.
- **The tap/scroll conflict, and the rule that resolves it:** if the user taps to *hide*, an upward
  scroll must not immediately undo that. Keep an internal `suppressReveal` shared value set by a
  hide-toggle and cleared the next time the user scrolls *down* past the threshold. Comment this —
  it is the non-obvious part of the hook.
- Mirror the animated value into React state via `runOnJS` **only** when it crosses, so
  `pointerEvents` can be set correctly. Do not drive layout from the JS mirror.
- Respect `useReducedMotion()` from Reanimated: when set, cross-fade opacity only and skip the
  translate.

Export from `ui/motion/index.ts` and `ui/index.ts`.

## 2. Tier 3 — `features/reader/ReaderChrome.tsx`

```ts
export type ReaderChromeProps = {
  visibility: SharedValue<number>;
  isVisible: boolean;
  bookTitle: string;
  onBack: () => void;
  testID?: string;
};
```

- An absolutely positioned top bar over the reading surface. Background `theme.surface.page` with a
  hairline bottom border at `theme.border.subtle`. Top padding from
  `useSafeAreaInsets().top` (`react-native-safe-area-context` is already a dependency).
- Contents, and nothing else: a back `IconButton` with a chevron from `@expo/vector-icons`, and the
  **book** title — not the chapter title, which is already the largest thing on the page — as
  `Text variant="footnote" tone="secondary" numberOfLines={1}`.
- Animated style from `visibility`: `translateY` interpolated from `-barHeight` to `0`, plus
  opacity. Measure the bar with `onLayout` rather than assuming a height.
- `pointerEvents={isVisible ? 'auto' : 'none'}` so hidden chrome cannot swallow taps.

## 3. Tier 3 — `features/reader/ChapterTransition.tsx`

```ts
export type ChapterTransitionProps = {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTap: () => void;
  children: React.ReactNode;
};
```

Wraps the whole reading surface in a `GestureDetector`.

- `Gesture.Pan()` with `.activeOffsetX([-24, 24])` and `.failOffsetY([-16, 16])`, so vertical
  scrolling always wins and the pan only claims genuinely horizontal movement.
- **Left-edge dead zone.** In `onBegin`, if `event.absoluteX` is less than a 24pt edge constant,
  flag the gesture as ignored and make `onUpdate`/`onEnd` no-ops. Comment that this is precisely
  what keeps iOS's interactive back gesture working, and that it is why the dead zone exists.
- Content follows the finger on `translateX`. Past a commit threshold of 25% of screen width,
  fire `Haptics.selectionAsync()`, animate the content out in that direction, and call
  `onNext`/`onPrev`. Under the threshold, spring back with `springs.default`.
- **At a boundary** (swiping toward a chapter that does not exist) apply resistance — multiply the
  translation by 0.25 — and fire `Haptics.impactAsync(Light)` **once per gesture**, the first time
  the finger passes the threshold. Then spring back. Never navigate.
- A `Gesture.Tap()` composed with the pan via `Gesture.Exclusive(pan, tap)`, calling `onTap`.

Haptics here are consistent with the standing policy — consequential actions only. A chapter change
is a navigation commit and a blocked swipe is a refused action; both qualify.

## 4. Tier 3 — `features/reader/ChapterEndCard.tsx`

```ts
export type ChapterEndCardProps = {
  nextTitle?: string;      // already through displayTitle(); absent on the last chapter
  nextWordCount?: number;
  bookTitle: string;
  onNext?: () => void;
  onBackToContents: () => void;
  testID?: string;
};
```

- `space.xxxl` of margin above it and a hairline rule, so it cannot be mistaken for body text.
- With a next chapter: a `NEXT` eyebrow as `Text variant="caption" weight="semibold"`
  **`tone="secondary"`, not accent** — the opening eyebrow is the reader's only accent and a second
  one would halve the value of the first. Then the next chapter's title as
  `Text variant="title3" weight="semibold"`, and its read time via the existing `readMinutes` helper
  as a `footnote`/`secondary` line. Wrap the whole block in a `PressableCard`.
- On the last chapter: no next block. A quiet `End of {bookTitle}` line, plus a `TextLink` back to
  Contents.
- Below either state, always a `TextLink` to Contents.

## 5. Wire up the reader — `app/book/[id]/[chapter].tsx`

- Delete the prev/next footer and its styles entirely.
- The `FlatList` becomes `Animated.FlatList` from Reanimated, with
  `onScroll={autoHide.scrollHandler}` and `scrollEventThrottle={16}`.
- **Progress recording must keep working, and this is the trap in this step.** The throttled JS
  `onScroll` handler is being replaced by the animated one, so the saves that used to ride on it are
  gone. `onScrollEndDrag`, `onMomentumScrollEnd` and the focus-loss save all remain and are enough —
  they were added for exactly this reason. Keep them, keep the monotonic `Math.max` behaviour, and
  keep the `hasMeasuredRef` guard before treating a non-scrolling chapter as complete. Do not
  simplify any of it.
- `contentContainerStyle` top padding becomes `useSafeAreaInsets().top + space.xxxl`, since there is
  no longer a header holding the content down. Bottom padding gains the bottom inset.
- `ListFooterComponent` renders `ChapterEndCard`.
- Wrap the list in `ChapterTransition`; render `ReaderChrome` as a sibling above it.
- `onTap` calls `autoHide.toggle()`.

In `app/_layout.tsx`, add a `Stack.Screen` for `book/[id]/[chapter]` with `headerShown: false`.
Leave `gestureEnabled` at its default — the edge dead zone in step 3 is what protects it.

## 6. Gallery — `app/_dev/gallery.tsx`

Extend the "Reading Surface" section with `ChapterEndCard` in both of its states: with a next
chapter, and as the last chapter of a book. `ReaderChrome` and `ChapterTransition` are not gallery
material — they only mean anything over a live scroll view.

## 7. Gates

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** If you hit an out-of-repo need, list it
  at the end of your response instead of acting on it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency. SDK 54 is a hard constraint.
- Do not redesign the reading surface — measure, paragraph rhythm and the chapter opening are
  settled. This pass adds only what is listed above.
