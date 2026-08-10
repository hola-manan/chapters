# Component pass 1 — Text and ReadingText

## Goal

Build the first tier-2 components: the two typographic primitives, plus the theme plumbing they
need. Every later component renders text through these, so the API shape here propagates
everywhere.

Read `GEMINI.md` first. The three-tier rule is binding: `ui/` may import from `design/` only, and
may never hardcode a colour, size, radius or duration.

## Decisions already made by the human — transcribe, do not reinterpret

1. **Two separate components**, not one with a variant prop. `Text` for UI, `ReadingText` for body
   copy. The difference must be visible at the call site.
2. **Colour is a closed `tone` prop.** No arbitrary colours. An arbitrary colour must be
   impossible to express.
3. **Split text-scaling policy.** `Text` honours OS Dynamic Type but capped. `ReadingText` ignores
   OS scaling entirely and will defer to an in-app size control, so the two never multiply.
4. **No `style` prop on either component.** Spacing belongs to the parent. The only layout escape
   valves are `align`, `numberOfLines` and `flex`, committed up front.

## 1. Theme plumbing — `ui/theme/`

Pure infrastructure, no design decisions.

- `ThemeProvider.tsx` — React context holding a `Theme` from `design/themes`. Reads the OS colour
  scheme via `useColorScheme()` and selects `lightTheme` or `darkTheme`, with an optional override
  prop so the gallery can force a theme.
- `useTheme.ts` — returns the current `Theme`. Must throw a clear error if used outside the
  provider; a silent fallback hides real bugs.
- Mount the provider in `app/_layout.tsx`, wrapping the existing stack. Do not restyle any screen.

## 2. `ui/primitives/Text.tsx`

UI typography, system font.

```ts
type TextProps = {
  variant?: 'caption' | 'footnote' | 'subhead' | 'body' | 'title3' | 'title2' | 'title1';
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent';
  weight?: 'regular' | 'medium' | 'semibold';
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  flex?: boolean;
  children: React.ReactNode;
  accessibilityRole?: 'header' | 'text' | 'link';
  accessibilityLabel?: string;
  testID?: string;
};
```

- Defaults: `variant='body'`, `tone='primary'`, `weight='regular'`, `align='left'`.
- Sizes, line heights and letter-spacings come from `uiType` in `design/tokens/type`. Never inline
  a number.
- `tone` maps to `theme.text.*`. There must be **no** way to pass a raw colour.
- `weight` maps to fontWeight 400 / 500 / 600. Font family comes from `uiFontFamily` — which is
  `undefined`, meaning the system font. Do not substitute a string.
- `allowFontScaling` stays true (the default); set `maxFontSizeMultiplier={1.35}` so accessibility
  sizes are honoured without destroying fixed layouts.
- `flex` applies `flex: 1` — this exists for the list-row case where a title must truncate rather
  than push its sibling metadata off screen.
- **No `style` prop.** Do not spread `...rest` onto React Native's `Text`. The listed props are the
  entire public API.

## 3. `ui/primitives/ReadingText.tsx`

Body copy in the reading scale.

```ts
type ReadingTextProps = {
  tone?: 'primary' | 'secondary';
  align?: 'left' | 'center';
  numberOfLines?: number;
  children: React.ReactNode;
  testID?: string;
};
```

- Size and line height come from `getReadingStyle()` in `design/tokens/type`. Line height must stay
  **derived**, never hardcoded.
- Font family is `readingFontFamily.regular` (Source Serif 4).
- `allowFontScaling={false}`. This is deliberate: an in-app reader size control is coming, and
  honouring OS scaling as well would multiply the two. Add a comment saying exactly that, or a
  future reader will "fix" it.
- Scope: body paragraphs only. Do **not** add heading variants — reader headings are a separate
  component pass and their design is not yet decided.

## 4. Load the reading font

Source Serif 4 must be loaded app-wide, not inside the gallery. Move the `useFonts` call for
`SourceSerif4_400Regular` and `SourceSerif4_600SemiBold` into `app/_layout.tsx`, and hold rendering
(or the splash screen) until fonts are ready so text does not flash in a fallback face. Remove the
Literata and Newsreader packages from the gallery's imports — they are no longer candidates.

## 5. Replace the gallery with a Text specimen

`app/_dev/gallery.tsx` becomes the real component gallery. The typeface/ink/paper chooser has done
its job; those values now live in tokens. Replace its contents with a specimen that renders:

- Every `Text` variant at every relevant `weight`, labelled with its variant name.
- Every `tone`, including `onAccent` shown on an accent-filled surface so it can actually be judged.
- `ReadingText` with several real paragraphs, pulled from an imported book exactly as the current
  chooser does — keep that loading logic and the placeholder fallback.
- The truncation case: a long chapter title with `flex` and `numberOfLines={1}` beside a short
  metadata label, in a row, which is the specific case `flex` exists for.
- A control to force light / dark / system theme, so the derived dark theme can be reviewed on
  device for the first time.

The specimen itself may use `View` and `StyleSheet` for its own scaffolding layout, but every
colour and text style it displays must come from the components and tokens.

## 6. Keep the boundary honest

Extend the existing guard test (or add one beside it) asserting that **no file under `ui/` contains
a hex colour literal**. Tier 2 must read every colour from the theme. Allow `transparent` and
`rgba(0,0,0,0)` if genuinely needed, nothing else.

## Explicitly not in this phase

- No other components — no Stack, Surface, Pressable, Button. Those are later passes.
- Do not restyle `app/index.tsx`, the contents screen or the reader. They stay ugly.
- Do not change any token value.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including the new `ui/` colour guard.
The app still runs, the three real screens look exactly as ugly as before, and the gallery shows the
specimen.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.
