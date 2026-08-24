# Fix the running-header filter, which is deleting a third of some books

Read `GEMINI.md` first.

## Context — measured, not suspected

`runsToBlocks` in `pdf/blocks.ts` deletes 35% of `Laugh Tactics`:

```
non-space chars in PDF                        136,623
after the running-header filter                88,071  (64.5%)   ← 48,552 lost
after ALL of runsToBlocks                      88,068  (64.5%)
lost by everything downstream of the filter:        3
```

Three characters lost everywhere else. The filter is the entire problem. What it deletes is
ordinary body prose, mid-sentence:

```
p10 y=585.1 "around us. Many of us use humor as our primary form of validation."
p10 y=502.2 "minus fart jokes."
```

**Root cause.** The rule was specified as "strip running headers by finding *text* recurring at the
same y-position on more than half the pages". The implementation kept the y-position test and
dropped the text comparison — `pdf/blocks.ts:15-34` never reads `r.str`. Since a well-typeset book
sets body lines on a fixed baseline grid, positional regularity is *what body text is*, so the
filter cannot distinguish a running header from the third line of a paragraph.

**It fails in the other direction too.** Royal Road's genuine running headers sit on 48% of pages —
206 of 431, because headers alternate recto/verso — and the `> totalPages * 0.5` threshold misses
them entirely. So the filter deletes a third of one book and catches nothing in another.

An alternative (swapping the whole pipeline for `@opendocsg/pdf2md`) was evaluated and rejected:
it loses nothing but never removes running headers either, and it promotes them to H1/H2 headings —
631 headings in Royal Road, mostly two lines repeating.

## The replacement rule

Already prototyped against the corpus; these exact conditions produced the numbers below. Implement
them as specified.

Replace the y-position filter at `pdf/blocks.ts:15-34` with a rule requiring **all three**:

1. **Normalised text match.** Key on `str.trim().replace(/\s+/g, ' ').replace(/\d+/g, '#')`.
   Digit-normalisation is what makes page numbers ("Page 12", "Page 13") collapse to one key — the
   literature calls this the *incremental* case and it is why exact matching is not enough.

2. **At a page extreme.** The run's `y` must be within 30pt of the topmost or bottommost text run
   **on its own page**. Compute the extremes per page from the runs themselves.
   **Do not use a fixed percentage of page height** — body prose sits inside the top 12% on Royal
   Road pages, so a fixed band re-creates the bug being fixed.

3. **Majority within its page-parity class.** Count the pages a normalised key appears on, and
   compare against the number of pages of the *same parity* (odd vs even), not against all pages.
   Running headers alternate recto/verso; a threshold over all pages halves every count and is why
   Royal Road's 48% slipped under the existing 50% bar.

Then apply a **circuit-breaker**: if the rule would remove more than 5% of the document's non-space
characters, remove nothing at all and keep every run. This does not make a wrong rule right — it
bounds the blast radius of a rule whose failure mode is silent deletion, which is exactly the
property that let this bug live. Comment it as such.

Keep the existing `totalPages <= 2` early-out.

## Expected results — assert these

Prototyped on the real corpus. The implementation must reproduce them:

| Book | Before | After | Removes |
|---|---|---|---|
| Laugh Tactics | 64.5% | **100%** | nothing |
| Royal Road | 100% | 98.7% | `"The Royal Road to Card Magic"`, `"Jean Hugard and Frederick Braue"` |
| The Serious Guide | 100% | 100% | nothing |

Royal Road's `"Next | Previous | Chapter Contents | Contents"` line is **not** removed and that is
accepted for now — it is not at a page extreme. Do not widen the rule to catch it.

## Tests — `test/pdf.test.ts`

`runsToBlocks` imports only types, so it is already tested there. Add hand-built `TextRun[]`
fixtures — do **not** depend on `pdfs/`, which is gitignored and personal:

- **A baseline-grid book with no headers.** 10 pages, 20 lines each, every page using the identical
  set of y values, different text on each. Assert **every** run survives. This is the regression
  test for the reported bug; under the old rule almost all of it disappears.
- **A recto/verso running header.** 10 pages; odd pages carry `"Book Title"` at the top y, even
  pages carry `"Author Name"`. Assert both are removed and all body text survives. Under a
  count-all-pages threshold each appears on only 50% and neither is caught.
- **Page numbers.** A footer reading `"Page 1"`, `"Page 2"`, … at the bottom extreme of every page.
  Assert it is removed — this is what digit-normalisation buys.
- **The circuit-breaker.** A fixture the rule would over-strip; assert nothing is removed.

## Gates

- `npx tsc --noEmit`
- `npm run lint`
- `npm test` — report the count
- `npx expo export --platform web` then `npm run check:web`

## Constraints

- **Do not touch anything outside this project directory.** Do not run `git`, do not commit.
- **No package installs.** In particular do not add `@opendocsg/pdf2md`; it was evaluated and
  rejected.
- **`pdfs/` is read-only.** Do not read from it in tests or add fixtures derived from it.
- Change only the filter block in `pdf/blocks.ts` and add tests. Do not touch line grouping,
  paragraph joining, de-hyphenation, `detectChapters`, or `sliceBlocksForPages` — they lose 3
  characters across an entire book and are not the problem.
- If an out-of-repo need appears, list it at the end of your response rather than acting on it.
