# Fixes — progress recording, serial numbers, contents header, generic titles

Five changes from on-device review. Read `GEMINI.md` first. No hardcoded colours, sizes, radii or
durations in `ui/` or `features/` — there are tests enforcing it.

## 1. Reading does not record progress — fix it

The reader saves progress only from a throttled `onScroll`, which is unreliable and misses several
real cases. Progress is therefore always 0, which is also why the card's progress bar never appears.

Fix in `app/book/[id]/[chapter].tsx`. **Do not restyle the reader** — it stays ugly until its own
design pass. Only its progress behaviour changes.

- Keep the throttled `onScroll`, but also save on **`onScrollEndDrag`** and
  **`onMomentumScrollEnd`**, so a save is guaranteed whenever scrolling stops rather than depending
  on where the throttle happened to land.
- Save once more when the screen loses focus (`useFocusEffect` cleanup), so a partial read persists
  even if no scroll-end event fired.
- **Handle chapters that do not scroll.** If `contentSize.height <= layoutMeasurement.height` the
  whole chapter is already on screen and no scroll event will ever fire, so progress can never move
  off 0. In that case record progress as complete when the screen loses focus. Track
  "is scrollable" from `onContentSizeChange` / `onLayout`.
- Progress must be monotonic within a session: never write a value **lower** than what is already
  stored for that chapter. Scrolling back up to re-read a passage must not undo progress.
- `saveReadingPosition` does a read-modify-write of one JSON file. Serialise the writes (a simple
  in-flight promise chain) so rapid scroll events cannot interleave and clobber each other.

## 2. Serial numbers stay — remove the toggle

**Decided by the human.** Serial numbers on chapter rows are better.

- `ChapterRow` always shows the serial number; drop the `showSerialNumber` prop.
- Delete `features/contents/DevToggles.tsx` entirely and its use in the Contents screen. Both
  questions it existed to answer are now settled (dividers resolved by rows becoming cards, serial
  numbers resolved here).

## 3. Remove the progress bar from `ContentsHeader`

**Decided by the human.** Progress lives on the card art only.

- Remove the bar and the percentage from `ContentsHeader`. Keep the book title and the total read
  time.
- Per-chapter state on the rows continues to carry the detail.

## 4. Card progress bar stays absent at 0%

**Decided by the human.** No change needed — confirm the current behaviour is that the bar renders
only when progress is above 0, and that it appears once progress is recorded.

## 5. Metadata titles are not automatically better than filenames

`The Royal Road to Card Magic.pdf` reports a metadata title of `"Main Contents"` — the PDF's title
field is simply wrong, and the filename is far better.

In `pdf/chapters.ts`, extend the title resolution:

- Add a check for generic or placeholder metadata titles — `"Main Contents"`, `"Contents"`,
  `"Untitled"`, `"Document"`, `"PDF"`, `"Microsoft Word - ..."` and similar — case-insensitive.
- When the metadata title is generic, fall back to the cleaned filename instead.
- Add Node tests covering: a good metadata title wins; a generic one loses to the filename; both
  bad falls back to `"Untitled Book"`.

Note in a comment that existing books cannot be retitled without re-importing, since the title is
resolved at parse time and stored.

## Explicitly not in this phase

- Do not restyle the reader beyond its progress behaviour.
- Do not change the cover generator.
- Do not change any token value.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass. Scrolling a chapter and returning to
Contents shows real progress; a short chapter that does not scroll still completes; `DevToggles` is
gone; the Contents header has no progress bar; and a book whose metadata title is generic uses its
filename.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.
