# Contents pass — ContentsHeader, ChapterRow, progress model

## Goal

Make the Contents screen real, and add the reading-progress model both it and the library need.

Read `GEMINI.md` first. Tier-3 components live in `features/contents/`; they may import from
`design/` and `ui/` and app types, and must never hardcode a colour, size, radius or duration.

## Decisions already made by the human — transcribe, do not reinterpret

1. **Chapter row carries: read time + where the reader is** (unread / in progress / resume point).
2. **Book level carries only: progress (bar or percentage) + total read time.** This replaces the
   chapter-count and page-count metadata currently on `BookCard`.
3. **Titles show the meaningful part only.** "Chapter 2: Getting Started" renders as
   "Getting Started". "Contents" renders as "Contents". Non-chapter outline entries such as
   Contents, References and Index are kept, not filtered.
4. **Serial numbers are undecided** — build them behind a toggle so they can be judged on device.
5. **Dividers are undecided** — build the list with a toggle for rules on/off, judged on device.
   This settles the owed `Divider` question.

## 1. Real book titles — `pdf/`

Book titles currently come from the filename, so the library shows things like
`"Laugh Tactics_ ... ( PDFDrive )"`. The PDFs carry proper titles in their metadata.

- In the WebView parser, read `doc.getMetadata()` and return `info.Title` alongside the existing
  result fields.
- In `parse.ts`, prefer the metadata title when it is present and non-trivial; fall back to the
  cleaned filename otherwise.
- Clean both paths: strip a trailing `- PDFDrive.com`, `( PDFDrive )` and similar source cruft,
  convert underscores to spaces, and collapse repeated whitespace.
- This is metadata, not text extraction — do not touch chapter detection or block building.

## 2. Chapter display titles — `pdf/chapters.ts`

Add a pure function, e.g. `displayTitle(raw: string): string`:

- Strip a leading `Chapter|Part|Section` followed by a number (arabic or roman) and an optional
  separator (`:`, `.`, `-`, en/em dash).
- Also strip a bare leading `12.` or `12)` ordinal.
- **If the remainder is empty or trivially short, return the original title unchanged.** A chapter
  genuinely titled "Chapter One" must not render as an empty row.
- Leave everything else alone. Do not attempt cleverness beyond this.

Add Node tests covering: prefixed-with-name, prefix-only, roman numerals, bare ordinal, and a
non-chapter entry like "Index" which must pass through untouched.

## 3. Word counts and read time

- Add `wordCount: number` to `Chapter` in `pdf/types.ts`, computed at parse time by counting words
  across the chapter's paragraph and heading blocks.
- Add a pure helper in `features/` (not `design/`): `readMinutes(wordCount)` using **230 wpm**,
  rounded, with a floor of 1. Export the constant so it is easy to retune.

## 4. Progress model — `storage/prefs.ts`

Replace the current position-only model with a fraction:

- Per chapter, store `progress: number` in `0..1` alongside the existing resume position
  (`blockIndex`).
- Chapter state derives from it: `0` → unread, `0 < p < 0.98` → in progress, `>= 0.98` → done.
  Put the 0.98 threshold in one named constant.
- Book progress is **word-weighted**: `sum(chapter.wordCount * progress) / sum(chapter.wordCount)`.
  A simple mean over chapters would let a one-page preface count as much as a long chapter.
- Expose `resumeChapterId(book)`: the first chapter in progress, else the first unread, else the
  last chapter.
- Update the existing ugly reader screen to write `progress` on scroll (clamped, throttled). Do
  **not** restyle the reader — it stays ugly until its own pass. Only its persistence changes.

## 5. `features/contents/ChapterRow.tsx`

- A `PressableRow` containing an `HStack`.
- Title: `displayTitle(chapter.title)`, `Text variant="body"`, `numberOfLines={2}`, `flex` so it
  truncates rather than displacing the metadata.
- Metadata: read time as `Text variant="footnote" tone="secondary"` — `secondary`, never
  `tertiary`.
- Read state, shown quietly:
  - **unread** — nothing, the default.
  - **in progress** — a small accent indicator plus the resume affordance.
  - **done** — a subdued marker; do not use a loud checkmark.
  The resume chapter is the one place on this screen the accent colour may appear.
- Optional serial number in a leading column, controlled by the toggle in section 7.
- The row owns its own vertical padding via `Surface`; spacing between rows comes from the list.

## 6. `features/contents/ContentsHeader.tsx`

- Book title in `Text variant="title1" weight="semibold"`, wrapping freely — no truncation on this
  screen, it is the subject of the page.
- Beneath it: overall progress and total read time, from section 3 and 4.
- Progress as a thin bar in the accent colour on a `sunken` track, plus a percentage. Keep it
  restrained; this is not a dashboard.
- **Static for now.** Do not implement scroll collapse — that needs `CollapsingHeader` (#15),
  which is not built. Leave a comment noting the intent.

## 7. Temporary dev toggles

Two undecided questions must be judged on device. Add a small, deliberately utilitarian control
strip to the Contents screen — plain chips, clearly scaffolding, not designed:

- **Dividers**: none / hairline with leading inset.
- **Serial numbers**: off / on.

When the human decides, both toggles and the losing branch get deleted. Add a comment saying so.

For the hairline option, give the existing provisional `Divider` an
`inset?: 'none' | 'content'` prop, where `content` insets the leading edge to match the row's
horizontal padding and runs to the trailing screen edge.

## 8. Update `BookCard`

Replace the chapter-count and page-count metadata with **book progress and total read time**, per
decision 2. Keep everything else about the card as it is.

## 9. Rewrite `app/book/[id]/index.tsx`

Use `ContentsHeader` and a `FlatList` of `ChapterRow`. Remove the skeleton's plain text and the
no-text-layer message — unreadable books can no longer enter the library.

## Explicitly not in this phase

- Do not restyle the reader screen beyond its progress persistence.
- No `CollapsingHeader`, `Progress`, `Skeleton` or `EmptyState` components.
- Do not change chapter detection or block building.
- Do not change any decided token value.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including new `displayTitle` tests.
The Contents screen shows real titles with read times, the library shows real book titles and
progress, and both toggles work.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.
