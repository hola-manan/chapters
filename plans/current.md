# Component pass 2 — VStack, HStack (and a provisional Divider)

## Goal

Build the layout primitives that own spacing. `Text` and `ReadingText` deliberately refuse to set
their own margins, so these are what make correct layout possible at all.

Read `GEMINI.md` first. `ui/` may import from `design/` only, may never hardcode a colour, size,
radius or duration, and — following the precedent set by `Text` — **must not accept a `style` prop
or spread `...rest`**.

## Decisions already made by the human — transcribe, do not reinterpret

1. **Two components, `VStack` and `HStack`.** Not one component with a `direction` prop.
2. **Gap is a closed named vocabulary**, e.g. `gap="md"`. An arbitrary gap must be unrepresentable.
3. **`dividers` is a boolean prop** that inserts a separator between children and never after the
   last one.

## 0. First, widen the space vocabulary — `design/tokens/space.ts`

The semantic aliases currently stop at `xxl: 24` and then degrade to `step32`, `step40`, `step48`,
`step64`, so screen-level spacing has no real name. Replace the alias block with a scale that spans
the whole useful range:

```
xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48
```

Keep the numeric keys (`space[16]`) exactly as they are — only the alias block changes. Drop the
`step*` aliases. Update the one or two existing usages if any break.

## 1. Provisional `ui/primitives/Divider.tsx`

`Stack`'s `dividers` prop needs something to insert, but `Divider`'s real design — inset, weight,
how it governs list rhythm — is a later pass and is **not** being decided here.

Build the simplest honest version: a full-bleed hairline using `StyleSheet.hairlineWidth` and
`theme.border.subtle`, with no inset and no props beyond `testID`. Add a comment stating plainly
that this is provisional and that inset and weight are decided in its own pass. Do not invent an
inset API now.

## 2. `ui/primitives/VStack.tsx` and `ui/primitives/HStack.tsx`

Shared prop shape:

```ts
type StackGap = 'none' | 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

type CommonStackProps = {
  gap?: StackGap;              // default 'none'
  align?: ...;                 // cross-axis
  justify?: 'start' | 'center' | 'end' | 'between';  // main-axis
  dividers?: boolean;
  flex?: boolean;              // applies flex: 1
  children: React.ReactNode;
  testID?: string;
};
```

The two differ in their defaults and in their cross-axis vocabulary, which is the whole reason the
human chose two components rather than one:

- **`VStack`** — `flexDirection: 'column'`. `align?: 'stretch' | 'start' | 'center' | 'end'`,
  defaulting to **`'stretch'`** so children fill the width, which is what a vertical list of rows
  and paragraphs wants.
- **`HStack`** — `flexDirection: 'row'`. `align?: 'center' | 'start' | 'end' | 'baseline'`,
  defaulting to **`'center'`**, which is what a row of label-plus-metadata wants. `HStack` also
  takes `wrap?: boolean`.

Implementation notes:

- Use the real flexbox `gap` property (supported in React Native 0.81), **not** injected margins on
  children. Injected margins leave phantom space when a child renders `null`, which is a bug you do
  not want to design in.
- `gap` maps through `space` from `design/tokens/space`. Never inline a number.
- When `dividers` is true, map over `React.Children.toArray(children)`, filter out null/false
  entries **before** interleaving, and place a `<Divider />` between each surviving pair — never
  after the last. Filtering first is what stops a conditionally-hidden row leaving a stray
  separator behind.
- `align`/`justify` map short names onto flexbox values (`start` → `flex-start`, `between` →
  `space-between`). Do not expose raw flexbox strings; the short vocabulary is the API.
- Put the shared logic in one internal module both components use. Do not duplicate the gap and
  divider logic twice.

## 3. Export from `ui/index.ts`

Add `VStack`, `HStack`, `Divider` and their prop types to the barrel.

## 4. Extend the gallery

Add sections to `app/_dev/gallery.tsx` demonstrating:

- Every `gap` step in a `VStack`, labelled, so the rhythm of the scale is visible as a ladder.
- An `HStack` showing each `align` value, including `baseline` with two different text sizes —
  baseline alignment is the one people get wrong and the one that matters for label-plus-value rows.
- `justify="between"` in an `HStack`: a title on the left, metadata on the right, which is the
  chapter-row pattern.
- A `VStack` with `dividers`, containing at least one conditionally-hidden child, proving no stray
  separator appears.

Keep using `Text` for all labels. The gallery may use `View` for its own scaffolding only.

## Explicitly not in this phase

- No `Surface`, `Pressable`, `Button` or any other component.
- Do not decide `Divider`'s inset or weight — that is its own pass.
- Do not restyle `app/index.tsx`, the contents screen or the reader. They stay ugly.
- Do not change any colour, type or motion token.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including the existing `ui/` hex and
import guards. The three real screens are unchanged. The gallery shows the new sections.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.
