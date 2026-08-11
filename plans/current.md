# The reading surface — ParagraphBlock, HeadingBlock, ChapterOpening

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/` or `features/` —
there are tests enforcing it, and this plan extends that enforcement to `app/`.

This is the pass the whole project has been in service of. **Design decisions below were made by the
human on device and are not open** — implement them exactly, do not substitute your own taste.

Decided:

- **Margins: 32pt each side** (`space.xxl`). Roughly 34 characters per line at the 19pt reading size.
- **Paragraphs: space between, no first-line indent.** Article convention, not book convention.
- **Alignment: ragged right** (`textAlign: 'left'`). Justified is off the table — React Native has no
  hyphenation engine, so justification at this measure opens visible rivers.
- **Source pagination: never shown.** `pagebreak` blocks are filtered out and no marker replaces
  them. Component #26 `PageBreakMarker` is cut.
- **Chapter opening: all four treatments get built**, because the human wants to compare them on
  device against real text before choosing.

## 1. New tier-1 tokens — `design/tokens/type.ts`

Add to the reading scale. Zero external imports in this file, as always.

```ts
// Multiples of the reading base size, for opening treatments.
export const readingAccentType = {
  initialScale: 3.2,     // raised initial: 19 * 3.2 ≈ 61pt
  leadScale: 0.82,       // small-caps lead words, before uppercasing
  leadTracking: 0.8,     // letterspacing for uppercased lead words
} as const;
```

Also add a `paragraphGap` token to `design/tokens/space.ts` as a **semantic alias only** — reuse an
existing step, do not invent a new number:

```ts
paragraphGap: 16,   // space between paragraphs in the reading surface
```

## 2. New tier-2 primitives — `ui/primitives/`

Two small typographic primitives. Both are genuinely reusable in any React Native app, which is why
they are tier 2 and not tier 3. Both read every number from `design/`, none inline.

### `ReadingInitial.tsx`

A single large glyph intended to be nested inside a `ReadingText` as its first child, so the
paragraph flows around it on the opening line.

```ts
export type ReadingInitialProps = {
  children: string;      // one character
  testID?: string;
};
```

- Font size `readingConfig.baseSize * readingAccentType.initialScale`, family
  `readingFontFamily.semibold`, colour `theme.text.primary`.
- `allowFontScaling={false}`, matching `ReadingText`.
- **Known limitation, state it in a code comment:** React Native has no `float`, so text cannot wrap
  around a true drop cap. What this produces is a **raised initial** — the glyph sits on the first
  line, text continues beside it, and subsequent lines run full width beneath it rather than
  indenting around the cap. Do not attempt to fake a true drop cap with absolute positioning or
  padded spaces; the raised initial is the honest result and the human is evaluating it as such.

### `ReadingLead.tsx`

The first few words of a paragraph set as small caps.

```ts
export type ReadingLeadProps = {
  children: string;
  testID?: string;
};
```

- Uppercases its text, sets font size `baseSize * leadScale`, `letterSpacing: leadTracking`, family
  `readingFontFamily.semibold`, colour `theme.text.primary`.
- **Comment that these are faux small caps**: Source Serif 4's small-caps variant is not loaded, so
  this is uppercase at reduced size. True small caps would need an SC font file.
- Also intended for nesting inside `ReadingText`.

Export both from `ui/primitives/index.ts` and `ui/index.ts`.

## 3. Tier-3 reader components — `features/reader/`

New directory. Export everything through `features/reader/index.ts` and re-export from
`features/index.ts`.

### `ParagraphBlock.tsx`

```ts
export type ParagraphBlockProps = {
  text: string;
  testID?: string;
};
```

Just a `ReadingText` in a `View` with `marginBottom: space.paragraphGap`. No indent. That is the
whole component — the decisions it embodies (measure, leading, gap, ragged right) live in tokens and
in the screen's padding, which is exactly where they belong. Do not add props for variations nobody
asked for.

### `HeadingBlock.tsx`

For headings that occur **inside** a chapter's block list — subheadings, not the chapter title.

```ts
export type HeadingBlockProps = {
  text: string;
  level: 1 | 2;
  testID?: string;
};
```

- Level 1 uses `Text variant="title3" weight="semibold"`, level 2 uses `variant="body"
  weight="semibold"`. **UI type, not reading type** — a subheading is a signpost, not prose, and the
  contrast between the sans signpost and the serif prose is the point.
- Space above must exceed space below (a heading belongs to what follows it): `space.xl` above,
  `space.sm` below.

### `ChapterOpening.tsx`

The chapter title block at the top of the reading surface, with four treatments to compare.

```ts
export type OpeningTreatment = 'eyebrow' | 'plain' | 'initial' | 'smallcaps';

export type ChapterOpeningProps = {
  title: string;              // already passed through displayTitle()
  chapterNumber: number;      // 1-based
  chapterCount: number;
  treatment: OpeningTreatment;
  firstParagraph?: string;    // needed by 'initial' and 'smallcaps'
  testID?: string;
};
```

All four share: title set in **reading type at title scale** — use `Text variant="title1"
weight="semibold"` for the title so it stays in the UI face, *except* where noted below. Bottom
margin `space.xxl` before the body begins.

- **`eyebrow`** — above the title, `Text variant="caption" weight="semibold" tone="accent"` reading
  `CHAPTER 3 OF 12`, uppercased, with `letterSpacing` from the caption token. This is the one place
  the accent is allowed to appear in the reader. Below the title, a hairline rule at
  `theme.border.subtle`, full measure, with `space.lg` above and below it.
- **`plain`** — title only. No eyebrow, no rule, no accent. `space.xxl` beneath.
- **`initial`** — title, then the first paragraph rendered with `ReadingInitial` wrapping its first
  character. When `treatment === 'initial'`, `ChapterOpening` renders the first paragraph itself and
  the screen must not render it again.
- **`smallcaps`** — title, then the first paragraph with its **first four words** wrapped in
  `ReadingLead` and the remainder in normal reading text. Same rule: the opening owns the first
  paragraph, the screen must not repeat it. Split on whitespace; if the paragraph has four words or
  fewer, fall back to no lead treatment rather than rendering an empty remainder.

### `OpeningPicker.tsx` — **temporary, will be deleted**

A row of four chips at the very top of the reader letting the human switch treatment live. Head the
file with a comment: `// TEMPORARY. Delete once the opening treatment is chosen — see
docs/components.md #25.` Use `PressableCard radius="pill"` chips, matching the gallery's existing
theme-override chip pattern. Local `useState` in the reader screen; no persistence.

## 4. Wire up the reader — `app/book/[id]/[chapter].tsx`

**Only the reading surface changes.** The chrome — the prev/next footer — is component #27 and is
not being designed now; make it stop fighting the page (themed colours, no more `#f0f0f0`) and leave
its layout alone. **Do not touch the progress-recording logic**; it was just fixed and works.

- Page background `theme.surface.page`. Every remaining hex literal in this file goes.
- `contentContainerStyle` gets `paddingHorizontal: space.xxl` — this is the 32pt measure decision,
  and it is the single most important line in the pass.
- `ListHeaderComponent` renders `OpeningPicker` above `ChapterOpening`.
- `renderItem` switches on `block.type`: `paragraph` → `ParagraphBlock`, `heading` → `HeadingBlock`,
  anything else → `null`.
- When the treatment is `initial` or `smallcaps`, drop the first paragraph block from the list data
  so it is not rendered twice.
- The empty state ("No extractable text…") keeps its current copy but uses `Text tone="secondary"`.

## 5. Gallery — `app/_dev/gallery.tsx`

Add one section, "Reading Surface", after the library section:

- All four `ChapterOpening` treatments stacked, each labelled, each followed by two real paragraphs,
  at the real 32pt measure. Use the gallery's existing real-book paragraph loader; fall back to the
  existing `FALLBACK` strings.
- A paragraph-rhythm specimen: four consecutive `ParagraphBlock`s and a `HeadingBlock` between the
  second and third, so the heading's asymmetric spacing is visible.

## 6. Extend the hex guard to `app/` — `test/design.test.ts`

The existing test scans `ui/` and `features/`. The reader screen has been carrying `#fff`, `#666`,
`#222`, `#eee` and `#f0f0f0` this whole time precisely because `app/` was unwatched. After step 4
there should be no hex literals left in `app/`, so extend the same test to cover it. If the test
then fails on a file this plan did not touch, fix that file to use theme tokens rather than
weakening the test.

## 7. Gates

All must pass before you report done:

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** If you discover an out-of-repo need
  (a package install, a font file, an env var), do not act on it — list it at the end of your
  response and stop.
- **Do not commit.** Leave the working tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native, or any pinned dependency. SDK 54 is a hard constraint.
