# Make consecutive swipes possible — stop rebuilding everything on commit

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

## The problem, reported from device

The drag itself is now perfect. But immediately after committing a swipe, the reader is busy and a
second swipe cannot be started until it settles.

**The cause: one `setCurrentIndex` invalidates all three layers at once.** On commit, the live
`FlatList` is remounted (it carries `key={chapter.id}`) with a whole chapter of blocks, *and* both
neighbour previews re-render because their props changed. Three subtrees are built on the same frame
that the commit spring is landing on, and the JS thread has nothing left for a new gesture.

Almost none of that work is necessary. Moving from chapter N to N+1: the outgoing live chapter
becomes the previous preview, the next preview becomes the live chapter, and **only chapter N+2 is
genuinely new**. The current code rebuilds all of it.

Three fixes, in order of how much they matter.

## 1. Stop remounting the FlatList — `app/book/[id]/[chapter].tsx`

`key={chapter.id}` on the `Animated.FlatList` forces a full unmount, remount and re-virtualisation
on every chapter change. It is there only to get the new chapter scrolled to the top.

- **Remove the `key` prop.** Change `data` instead and let the list persist.
- Scroll to the top imperatively when the chapter changes: in a `useLayoutEffect` keyed on
  `chapter.id`, call `flatListRef.current?.scrollToOffset({ offset: 0, animated: false })`.
- `initialScrollIndex` now only applies on mount, which is exactly right: resume-on-entry still
  works because the screen mounts once, and swiped-to chapters start at the top as decided.

## 2. Let the previews update at a lower priority

The live chapter must be correct on the commit frame. The two previews must not — they are one
screen-width off-stage and nobody can see them until the *next* gesture starts.

- Drive the previews from `useDeferredValue(currentIndex)` rather than `currentIndex` directly.
  React 19 will render the live chapter urgently and re-render the previews in a following,
  interruptible pass, so preview work no longer competes with the commit or with the start of a
  second swipe.
- Compute `prevPreview`/`nextPreview` from that deferred index. The live chapter, the transition's
  `chapterKey`, `hasPrev`/`hasNext` and everything in the progress logic keep using the real
  `currentIndex` — do not confuse the two, or the wrong chapter will be paged or recorded.
- Because the deferred value lags by a render, a preview may briefly show the neighbour of the
  previous index. That is invisible off-stage and is the entire point; do not "fix" it with a
  synchronous fallback.

## 3. Make preview re-renders cheap — `features/reader/ChapterPreview.tsx`

- Wrap the component in `React.memo`. Combined with the deferred index, an unchanged neighbour then
  costs nothing.
- Keep the twelve-block slice and the pixel-identical layout. Both are load-bearing — the slice
  overfills a screen and the layout is what makes the commit swap invisible.

## 4. Trim the list's mount cost

On the `Animated.FlatList`, add `initialNumToRender={8}`, `maxToRenderPerBatch={8}` and
`windowSize={5}`. Chapters can run to hundreds of blocks and the default window renders far more
than a screen's worth on arrival.

## 5. Do not change

The reading surface, the chapter opening, `ReaderChrome`, `useAutoHide`, the end card and the
gesture configuration in `ChapterTransition` are all settled. Progress recording across a chapter
change was fixed last pass and must keep working exactly as it does — including the flush of the
outgoing chapter and the reset of all six measurement refs.

## 6. Gates

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** List any out-of-repo need at the end of
  your response instead of acting on it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency. SDK 54 is a hard constraint.
