# Fix resume: remember where the reader actually was

Read `GEMINI.md` first.

## Context — the bug, precisely

Reopening a book, and the highlighted row on Contents, both come from `resumeChapterId`
(`storage/prefs.ts`). It returns **the first chapter whose progress is above 0 but below the 0.98
done threshold** — the earliest chapter left unfinished, not the last one read.

Pressing "Next chapter" on `ChapterEndCard` does not record that the chapter is finished. It only
saves whatever high-water mark the scroll handler last happened to write. The Next button is
reachable well before the true bottom of the scroll (the card's own height plus roughly 66pt of
list padding sit below it), so the chapter is typically left at 0.90–0.97 — under the threshold,
permanently `in_progress`, and because the rule is *first* in-progress it shadows every chapter
after it. The reader is dragged back to it on every visit, forever, since progress only ratchets up.

It is intermittent, which is why it was hard to pin: overscroll to the real bottom before tapping
and progress reaches exactly 1, the chapter goes `done`, and resume moves on correctly.

**The human chose to fix both halves:** track the chapter that was actually open, *and* treat
pressing Next as an explicit completion.

Note this is a different bug from the `Math.floor(yOffset / 40)` block-index estimate in the
reader, which is also wrong but governs scroll position *within* a chapter. **Do not touch that in
this pass.**

## 1. `storage/progress.ts` — new, pure

Move `CHAPTER_DONE_THRESHOLD`, `ChapterProgress`, `BookPrefs`, `chapterState`,
`computeBookProgress` and `resumeChapterId` out of `prefs.ts` into a new `storage/progress.ts`.

**It must have no runtime imports** — `import type { Book }` only, which erases. That is the whole
reason for the split: `prefs.ts` imports `./kv`, which reaches `expo-file-system`, so none of this
logic can currently be tested in Node. It is the only real logic in the app besides the parser and
it should be testable without a phone.

`prefs.ts` re-exports everything it moved, and `storage/index.ts` also exports `./progress`, so no
consumer import changes anywhere.

## 2. `resumeChapterId` — new signature and rule

```ts
export function resumeChapterId(book: Book, prefs: BookPrefs, lastChapterId?: string): string
```

In order:

1. If `lastChapterId` names a chapter that exists in this book:
   - not `done` → return it.
   - `done` → return the first chapter **after** it that is not `done`. If every chapter after it
     is done, fall through to the rules below rather than returning something already finished.
2. First `in_progress` chapter.
3. First `unread` chapter.
4. The last chapter.

Steps 2–4 are the existing behaviour and must stay as the fallback, so a book read before this
change still resolves sensibly with no stored pointer.

## 3. Last-read pointer — `storage/prefs.ts`

```ts
export async function getLastChapter(bookId: string): Promise<string | undefined>
export function saveLastChapter(bookId: string, chapterId: string): Promise<void>
```

Store under its own kv key, `lastread_<bookId>.json`, holding `{ "chapterId": "..." }`.

Deliberately a separate key rather than a field inside the prefs file: `BookPrefs` is
`Record<chapterId, ChapterProgress>` and several consumers index it directly, so adding a non-chapter
key to that object would need a migration and would make every lookup unsafe. A separate key costs
one extra read and needs no migration at all.

Tolerate a missing or malformed file by returning `undefined`. Route the write through the same
`saveChain` promise chain the existing `saveReadingPosition` uses, so writes cannot interleave.

## 4. Reader — `app/book/[id]/[chapter].tsx`

**Record the open chapter.** In the existing effect keyed on `[currentIndex, book, id]`, after the
`prevIndexRef` bookkeeping, call `saveLastChapter(id, book.chapters[currentIndex].id)`
unconditionally. This runs on entry and on every swipe, so the pointer survives the app being
killed.

**Make Next mean finished.** The `ChapterEndCard`'s `onNext` currently calls
`transitionRef.current?.advance('next')`. Set `maxProgressRef.current = 1` immediately before that
call, so the chapter-change effect persists a completed chapter rather than a 0.9-something one.

Comment it: pressing Next is the reader stating they are done, and inferring completion from scroll
position instead is what left chapters stuck below the threshold.

**Only that button.** Do not mark done on swipe, and do not mark done on "back to contents" — both
are ambiguous, and a swipe out of a chapter you are halfway through must stay halfway through.

## 5. Contents — `app/book/[id]/index.tsx`

`loadData` also fetches `getLastChapter(id)` into state; pass it as the third argument to
`resumeChapterId`. `loadData` already re-runs on focus, so the marker refreshes on return from the
reader with no other change.

## 6. `test/progress.test.ts` — new

Node tests over the pure module, now that it imports nothing at runtime. Cover at minimum:

- `lastChapterId` names an unfinished chapter → that chapter wins over an earlier in-progress one.
  **This is the regression test for the reported bug** — build the fixture so chapter 1 sits at 0.94
  and the pointer names chapter 2, and assert chapter 2 is returned.
- `lastChapterId` names a finished chapter → the first not-done chapter after it.
- `lastChapterId` finished and everything after it finished → falls through to the old rules.
- `lastChapterId` absent, or naming a chapter not in this book → falls through to the old rules.
- The old rules in isolation: first in-progress, then first unread, then the last chapter.
- A book with no chapters returns `''` and does not throw.
- `chapterState` at exactly 0, just under 0.98, exactly 0.98 and 1.
- `computeBookProgress` weights by word count, not by chapter count, and treats a zero word count
  as 1 rather than dividing by zero.

Add a `test` script to `package.json` running all four test files, so the suite stops being a
command that has to be remembered:

```json
"test": "node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts test/icons.test.ts test/progress.test.ts"
```

## 7. Docs

- `docs/components.md` — a short note under the reader entries recording why resume was wrong:
  "first unfinished chapter" is a sticky rule, and completion was being inferred from scroll depth
  rather than taken from the reader's explicit action.
- `docs/library.md` — nothing to add. This is all tier 3 and `storage/`, not the reusable library.

## Gates

- `npx tsc --noEmit`
- `npm run lint`
- `npm test` (the new script — all four files, and report the count)
- `npx expo export --platform web` then `npm run check:web`

## Constraints

- **Do not touch anything outside this project directory.** Do not run `git`, do not commit.
- No package installs.
- Do not change `Math.floor(yOffset / 40)` or anything about scroll restoration within a chapter.
- Do not change the 0.98 threshold, the high-water-mark behaviour of `saveReadingPosition`, or the
  word-weighted `computeBookProgress` formula.
- Do not change `EdgeFade`, `ReaderChrome`, or any typography — the previous pass is settled.
- If an out-of-repo need appears, list it at the end of your response rather than acting on it.
