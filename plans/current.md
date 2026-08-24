# Anchor the reading position to content instead of pixels

Read `GEMINI.md` first.

## Context

The reader stores where you were as a block index, but derives it from pixels
(`app/book/[id]/[chapter].tsx`, in `handleScroll`):

```ts
const blockIndex = Math.max(0, Math.floor(yOffset / 40));
```

That hardcodes every block at 40pt tall. A real paragraph at reading size is about 27pt per line,
so blocks run 80–150pt and the index comes out roughly 2–3× too high. It is then fed to
`initialScrollIndex` behind a bounds check, so there are two failure modes and no success mode:
short chapters (which is every chapter in this app) overflow the check, fall to `undefined`, and
silently reopen at the top; long chapters stay under it and scroll too far.

The deeper problem is that a pixel-derived position is **invalid the moment the reader changes
reading size**, and this app has pinch-to-resize. This is the exact reason Amazon invented Kindle
"locations" (128 bytes of source text) and the reason EPUB CFI is a structural path into the
document rather than a coordinate: point at the text, not at the screen.

`blockIndex` is already the right *model* — an index into `Chapter.blocks`, which is a stable
content array, effectively a poor-man's CFI. It is only the *derivation* that throws that away.
This pass makes the field be what its name claims.

## 1. Take the block index from the list, not from arithmetic

`FlatList` already knows which items are on screen. Use `onViewableItemsChanged` and record the
**smallest `index` among the viewable items** — the topmost block at least partially visible.

Partially visible is deliberate: landing a reader slightly earlier than where they stopped means
re-reading a line, while landing later means silently skipping one. So use
`viewabilityConfig = { itemVisiblePercentThreshold: 0 }`.

**Both the callback and the config must be stable references for the lifetime of the list.** React
Native throws `Changing onViewableItemsChanged on the fly is not supported` otherwise. Hold each in
a `useRef` created once, never inline and never in a `useMemo` with dependencies.

Because it must be stable, the callback must not close over `id`, `chapter` or any state — those
change on every swipe and the closure would go stale. Have it write **only to a ref**, and let the
existing save paths (`onScrollEndDrag`, `onMomentumScrollEnd`, the chapter-change effect, and the
`useFocusEffect` cleanup) persist it exactly as they do now. That keeps the whole change inside the
existing save machinery.

Delete the `Math.floor(yOffset / 40)` line. Nothing else should compute a block index.

## 2. Position is a pointer, not a watermark

Progress and position are two numbers with two different rules, and conflating them is what this
whole area keeps getting wrong.

- **Progress stays a high-water mark.** It only ratchets up. Do not change this.
- **Position must become last-known, free to move backwards.** Scroll back to re-read something,
  leave, and return — you should land where you actually were, not at the furthest point you ever
  reached.

Today `saveReadingPosition` maxes the block index:

```ts
const finalBlockIndex =
  existingProgress > clampedProgress ? existingBlockIndex : Math.max(existingBlockIndex, blockIndex);
```

Rename `maxBlockIndexRef` to `blockIndexRef` in the reader and have it track the current value
rather than the maximum (drop the `if (blockIndex > ...)` guard around it — the progress guard next
to it stays).

Extract the merge rule into `storage/progress.ts` as a pure function so it can be tested:

```ts
export function mergeChapterProgress(
  existing: ChapterProgress | undefined,
  incoming: ChapterProgress
): ChapterProgress
```

Rule: `progress` is `Math.max(existing.progress, incoming.progress)` clamped to 0..1; `blockIndex`
is `incoming.blockIndex` clamped to `>= 0`. `saveReadingPosition` calls it instead of computing
inline. This continues the split started last pass — `progress.ts` has no runtime imports and is
the only part of `storage/` that can be tested in Node.

## 3. Tighten the restore guard

`initialScrollIndex={initialIndex && initialIndex < displayBlocks.length ? initialIndex : undefined}`
uses a truthiness test, so index 0 falls through — harmless, since 0 is the top anyway, but it
reads as a bug. Make it an explicit `initialIndex !== null && initialIndex > 0 && initialIndex <
displayBlocks.length`.

Leave `onScrollToIndexFailed` alone. `initialScrollIndex` without `getItemLayout` legitimately fails
on a variable-height list, and its `info.averageItemLength * info.index` fallback is React Native's
own measured estimate — far better than the 40 this pass is deleting. Do **not** add
`getItemLayout`: block heights genuinely vary and any fixed estimate reintroduces the bug.

## 4. Do not touch

- The chapter progress fraction (`yOffset / maxScroll`). Making that content-weighted too is a real
  improvement and is deliberately **not** in this pass.
- The 0.98 done threshold, `computeBookProgress`, `resumeChapterId`, or the last-read pointer.
  Last pass settled those.
- `EdgeFade`, `ReaderChrome`, `ChapterTransition`, or any typography.

## 5. Tests — `test/progress.test.ts`

Add cases for `mergeChapterProgress`:

- No existing entry → incoming is taken as-is.
- Higher incoming progress wins; **lower incoming progress does not lower the stored value.**
- **A lower incoming `blockIndex` *does* replace a higher stored one** — this is the regression test
  for the pointer-vs-watermark distinction, and the behaviour that is changing.
- Progress clamps into 0..1 from out-of-range input on both sides.
- A negative `blockIndex` clamps to 0.

## Gates

- `npx tsc --noEmit`
- `npm run lint`
- `npm test` — report the count
- `npx expo export --platform web` then `npm run check:web`

Additionally, **grep the reader for `/ 40` and confirm it is gone**, and confirm
`onViewableItemsChanged` and `viewabilityConfig` are each passed a ref's `.current` created once.
State both explicitly in your report.

## Constraints

- **Do not touch anything outside this project directory.** Do not run `git`, do not commit.
- No package installs.
- If an out-of-repo need appears, list it at the end of your response rather than acting on it.
