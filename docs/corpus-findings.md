# Corpus findings

Measured with pdf.js 6.2 against the real test corpus in `pdfs/` (gitignored) on 2026-08-10.
These are the facts the parser must actually cope with — not hypotheticals.

## The corpus

| Book | Pages | Outline | Text layer | Path |
|---|---|---|---|---|
| The Serious Guide to Joke Writing | 178 | 14 items | yes | outline |
| Mathematics and Humor | 126 | 9 items | yes | outline |
| Laugh Tactics | 114 | 18 items | yes | outline |
| 13 Steps to Mentalism | 211 | 13 items | **none** | outline for chapters, **no reflowable text** |
| Card College 1 | 244 | none | **none** | **nothing to work with** |
| The Royal Road to Card Magic | 436 | none | yes | heuristics |

Half the corpus is *not* the happy path. Build accordingly.

## Consequences for the parser

**1. Scanned PDFs are a first-class state, not an error.**
Two of six books have zero text layer — they are page images. They cannot be reflowed at all,
by any amount of cleverness short of OCR. The pipeline must detect this early (sample ~10 pages,
sum extracted characters, treat < ~200 as "no text layer") and surface it as a distinct,
designed outcome rather than an empty reader or a crash.

Note that `13 Steps to Mentalism` has a **perfect 13-chapter outline and no text**. Chapter
structure and text availability are independent — do not infer one from the other.

**2. Font sizes fragment; quantize before taking the mode.**
`Mathematics and Humor` reports body sizes of 10.0 / 10.1 / 10.2 / 10.3 / 10.4 as separate
buckets (5247 / 4208 / 4004 / 1994 / 1857 chars). Taking a naive mode picks 10.3 and treats
the rest of the body text as "not body". Quantize to ~0.5pt buckets, and weight by character
count rather than run count, before computing the body size.

Size comes from the text item's transform matrix as `sqrt(b² + d²)` — there is no `fontSize`
field.

**3. Size alone does not find headings.**
In `Mathematics and Humor` and `Laugh Tactics` the size heuristic found **no** heading
candidates in the sample, despite both being cleanly structured books — their headings are
distinguished by weight/case, not size. Both have outlines, so it does not bite here, but it
means the heuristic path cannot lean on size alone. `fontName` (bold variants) and case
patterns need to be part of the score.

**4. Running headers pollute heading detection.**
In `The Royal Road to Card Magic` the largest text runs are the title and authors repeating on
section-opening pages. Any size-based heading pass will surface these first. The
recurring-text-at-same-y filter is not polish — it is required for the one book in this corpus
that actually needs the heuristic path.

**5. Embedded metadata titles are often junk.**
The PDF `Info` dictionary's `Title` is authored by whatever produced the file, and in this corpus
it comes back as `Main Contents` (the title of the first bookmark, not the book) and
`Microsoft Word - <something>`. A metadata title is therefore only *preferred* over the filename
when it survives a generic-title check (`isNonTrivialTitle`): exact matches against a denylist
(`contents`, `document1`, `untitled`, …), anything prefixed `Microsoft Word - `, and anything with
no alphanumerics. Filename is the fallback, `Untitled Book` the last resort. **The resolved title
is baked into `book.json` at import time**, so changing this logic does not retitle books already
in the library — they must be re-imported.

## Consequences for pdf.js integration

- `getDocument({ useWorkerFetch: false, isEvalSupported: false })` works in Node.
- Some documents warn `Ensure that the standardFontDataUrl API parameter is provided` — pass
  `standardFontDataUrl` pointing at the bundled `pdfjs-dist/standard_fonts/` to silence it and
  to get correct text extraction on documents using the standard 14 fonts.
- Destroy via the **loading task** (`task.destroy()`), not the document proxy — `doc.destroy`
  does not exist in v6.
- Large files matter: `Card College 1` is ~300MB. Read and transfer as bytes carefully; do not
  base64 a 300MB file into a WebView. Stream from a file URI where possible.

## Reproducing

The probe script lives in the scratchpad, not the repo. Its logic belongs in
`pdf/chapters.ts` and `pdf/blocks.ts` and is exercised by the Node-side tests.
