# Swap the chapter first, animate second

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

## The problem, diagnosed from device

The drag tracks the finger perfectly. **After release there is a pause before the next chapter is
usable.** A previous attempt to fix this by reducing render work made things worse and has been
reverted; render cost was never the bottleneck.

**The cause: the swap waits for a spring to finish.** `ChapterTransition` commits like this —

```
translateX.value = withSpring(-screenWidth, springs.default, (finished) => {
  if (finished) runOnJS(onNext)();   // ← only fires once the spring has SETTLED
});
```

`withSpring`'s callback fires when the animation settles inside Reanimated's rest thresholds, not
when the movement looks finished. `springs.default` is `{ damping: 20, stiffness: 220, mass: 1 }`,
a damping ratio of ~0.67, which settles in roughly 460ms. The eye sees the movement complete in
about 150ms; the remaining ~300ms is an invisible tail in which the chapter has not been swapped and
a new gesture has nothing to act on.

**The fix: stop treating the commit as "animate away, then replace". Swap the chapter immediately
on release and let the spring carry the already-correct content home.** This is how a pager works,
and it removes the wait entirely rather than shortening it.

## The pager maths — get this exactly right

Layers sit at `left: -screenWidth` (prev), `0` (current), `+screenWidth` (next), inside a container
translated by `translateX`.

Mid-drag toward the next chapter, `translateX` is `tx` (negative). On screen: the current chapter is
at `tx`, and the next chapter is at `screenWidth + tx`.

When the swap happens, the incoming chapter becomes the *current* layer, which sits at `0`. For the
screen not to jump, `translateX` must simultaneously become `tx + screenWidth`. It then springs to
`0`, which is the movement the user already expects to see — but the content is correct from the
first frame of it, so a second gesture can start immediately.

For a previous-chapter commit the offset is `tx - screenWidth`.

## Implementation — `features/reader/ChapterTransition.tsx`

- Add a `pendingOffset` shared value.
- In `onEnd`, when a commit threshold is crossed and the target chapter exists: fire the existing
  selection haptic, set `pendingOffset.value` to `tx + screenWidth` (next) or `tx - screenWidth`
  (prev), and call `runOnJS(onNext)()` / `runOnJS(onPrev)()` **immediately**. Do not animate
  `translateX` here and do not pass a completion callback.
- Replace the body of the existing `useLayoutEffect` keyed on `chapterKey` with:

  ```
  translateX.value = pendingOffset.value;              // jump to the equivalent offset
  translateX.value = withSpring(0, springs.default);   // then travel home
  pendingOffset.value = 0;
  ```

  `useLayoutEffect` runs after the new chapter has rendered but before the frame is presented, so
  the jump is never visible. When `pendingOffset` is `0` — entering the screen, or any chapter
  change that did not come from a gesture — this collapses to "sit at zero", which is correct.
- **Interruptible settling.** Because the spring now runs *after* the swap, the user can grab the
  surface while it is still travelling. Add a `startX` shared value: set `startX.value =
  translateX.value` in `onBegin`, and use `translateX.value = startX.value + event.translationX` in
  `onUpdate`. Without this, a second gesture snaps the content from wherever the spring had reached
  back to near zero. Keep the commit threshold measured against `event.translationX` — the gesture's
  own movement — not against the absolute offset.
- Apply the same treatment to the imperative `advance()` used by the end card: set `pendingOffset`
  to `∓screenWidth` and call `onNext`/`onPrev` immediately, with no animation and no callback.
- Everything else in the gesture stays exactly as it is: the 24pt left-edge dead zone, the
  `activeOffsetX`/`failOffsetY` configuration, the 25%-of-width commit threshold, the boundary
  resistance at `×0.25`, and both haptics.

## Do not change

`app/book/[id]/[chapter].tsx` should need no changes at all — it already swaps on `setCurrentIndex`
and `chapterKey` already changes with the chapter. Do not re-add virtualisation tuning, do not
remove `key={chapter.id}` from the list, and do not introduce `useDeferredValue`. Those were the
reverted attempt and they addressed a bottleneck that does not exist. Progress recording across a
chapter change must keep working exactly as it does.

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
