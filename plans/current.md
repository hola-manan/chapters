# Make chapter swiping continuous — the reader becomes a pager

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

## The problem, reported from device

Swiping to the next chapter currently: registers the swipe, fires a haptic, animates the content
off-screen, then shows a blank screen, then loads the next chapter. Three separate beats where
there should be one continuous movement.

**The cause is architectural, not a tuning problem.** `ChapterTransition` animates out and calls
`router.replace`, which tears down the reader screen and mounts it again. The new instance starts
with `book === null`, renders "Loading chapter…", and re-reads `book.json` from disk before it can
show anything. Nothing about the incoming chapter exists on screen while the outgoing one is
leaving, so there is nothing to see but blank.

**The fix: the reader stops routing between chapters and becomes a pager.** Every chapter of the
book is already in memory — `book.chapters` holds all of them, loaded once — so moving between them
needs no navigation, no re-fetch and no remount. The route parameter becomes the *initial* chapter
only.

Required end result: **from the first pixel of the drag, the incoming chapter's content is visible
and moves with the finger.** In both directions.

## 1. `features/reader/ChapterTransition.tsx` — a three-up filmstrip

```ts
export type ChapterTransitionProps = {
  chapterKey: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTap: () => void;
  prevPreview?: React.ReactNode;   // NEW — rendered one screen-width to the left
  nextPreview?: React.ReactNode;   // NEW — rendered one screen-width to the right
  children: React.ReactNode;
};
```

- Inside the animated container, render three absolutely positioned layers, each one screen wide and
  full height: `prevPreview` at `left: -screenWidth`, `children` at `0`, `nextPreview` at
  `left: screenWidth`. Only `children` is the live scrollable chapter; the previews are static.
- The drag already moves `translateX`; with the neighbours mounted, the incoming chapter is now
  visible from the first pixel of movement. Keep the existing 24pt left-edge dead zone, the
  `activeOffsetX`/`failOffsetY` configuration, the 25%-of-width commit threshold, the boundary
  resistance and both haptics exactly as they are.
- **The commit sequence, which is the delicate part.** On commit, animate `translateX` to
  `∓screenWidth` so the preview lands exactly filling the screen, and only then call
  `onNext`/`onPrev`. Do **not** reset `translateX` in that callback — resetting it before React has
  rendered the new chapter would flash the outgoing chapter back into the centre for a frame.
- Replace the existing `useEffect` reset with **`useLayoutEffect`** keyed on `chapterKey`. It runs
  after the new chapter has been rendered but before the frame is presented, which is what makes the
  swap invisible: the preview is replaced by the identical real content at the same position, and
  the transform returns to zero in the same commit.
- Add an imperative advance for callers that are not the gesture — the end card's "next chapter"
  button should travel the same way rather than jumping. Expose it with `useImperativeHandle` on a
  forwarded ref: `{ advance(direction: 'prev' | 'next'): void }`, running the same animate-then-call
  sequence with the same haptic.

## 2. `features/reader/ChapterPreview.tsx` — new

The static stand-in for a neighbouring chapter.

```ts
export type ChapterPreviewProps = {
  chapter: Chapter;
  chapterNumber: number;
  chapterCount: number;
  testID?: string;
};
```

- Renders exactly what the top of a real chapter renders: `ChapterOpening`, then the chapter's first
  paragraph and heading blocks, in document order, using the same `ParagraphBlock` and
  `HeadingBlock` components.
- **It must be pixel-identical to the real chapter at scroll offset 0**, because the swap at the end
  of a commit relies on that. Same horizontal padding (`space.xxl`), same top padding
  (`insets.top + space.xxxl`), same header margin. Take enough blocks to overfill a screen — 12 is
  ample — and clip the rest with `overflow: 'hidden'`. Do not use a `FlatList`; it is a static
  preview and virtualising three of them is exactly the cost this design avoids.

## 3. `app/book/[id]/[chapter].tsx` — hold the current chapter in state

- Add `const [currentIndex, setCurrentIndex] = useState<number | null>(null)`, initialised **once**
  from the route parameter when the book loads. The route parameter is the entry point, not the
  live source of truth — do not re-derive `currentIndex` from it on every render, or paging will
  fight the URL.
- `chapter` becomes `book.chapters[currentIndex]`. Neighbours come from the same array.
- Pass `prevPreview` / `nextPreview` to `ChapterTransition`, built from the neighbouring chapters via
  `ChapterPreview`. Pass `undefined` at the first and last chapter, so the boundary resistance has
  nothing to reveal.
- `onPrev`/`onNext` now call `setCurrentIndex`. **No `router.replace` for chapter changes.** The
  back button keeps its existing `router.replace` to Contents.
- `ChapterEndCard`'s next-chapter press calls the transition's `advance('next')` through the ref, so
  it animates the same way as a swipe instead of jumping.
- Give the `Animated.FlatList` a `key={chapter.id}` so it remounts per chapter and the new chapter
  starts at the top rather than inheriting the previous chapter's scroll offset.

### Progress recording across a chapter change — do not get this wrong

Progress is currently saved on scroll-end and on focus loss. Focus loss no longer fires between
chapters, because the screen is never unmounted, so a chapter change must do that work itself.

- In an effect keyed on `currentIndex`, **before** switching to the new chapter, flush the outgoing
  chapter's progress using the existing monotonic logic — including the rule that a chapter which
  never needed to scroll counts as complete, guarded by `hasMeasuredRef`.
- Then reset `maxProgressRef`, `maxBlockIndexRef`, `contentHeightRef`, `layoutHeightRef`,
  `isScrollableRef` and `hasMeasuredRef` for the incoming chapter. A stale `hasMeasuredRef` would
  mark an unread chapter complete; a stale `maxProgressRef` would carry one chapter's progress onto
  the next. Both are silent data corruption, so be careful here.
- Keep the focus-loss save for leaving the reader entirely.
- **Resume applies only on entry.** A chapter arrived at by swiping or from the end card starts at
  the top; `getReadingPosition` is consulted for the initial chapter only. Deliberately moving to
  the next chapter and landing halfway down it would be disorienting.

## 4. Do not change

The reading surface, the chapter opening, `ReaderChrome`, `useAutoHide` and the end card's design
are all settled. This pass changes how chapters move past one another and nothing else.

## 5. Gates

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** List any out-of-repo need at the end of
  your response instead of acting on it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency. SDK 54 is a hard constraint.
