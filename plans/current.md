# Fixes — chapter rows as cards, card art layout, word counts, navigator theming

Four changes from on-device review. Two are design decisions from the human, two are defects.

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations anywhere in `ui/` or
`features/` — there are tests enforcing this.

## 1. Chapter rows become raised cards

**Decided by the human.** Rows currently sit at `elevation={0}` — the same colour as the page —
with dividers off by default, so nothing separates one row from the next. On a dark ground that
reads as one flat, very dark field.

- `ChapterRow` becomes a raised card: `Surface elevation={1}` with a radius and a border, matching
  the treatment of `BookCard` on the library screen.
- Switch from `PressableRow` to `PressableCard`. The rows are now discrete inset cards rather than
  full-bleed list rows, so scale feedback is right and the overlay treatment is not. Set `radius`
  on the `PressableCard` itself so the press state is clipped to the card's shape.
- The list supplies horizontal margins and the vertical gap between cards, from space tokens.

**This settles the divider question:** cards separate themselves, so no rules are needed.

- Remove the divider toggle from `DevToggles` and the `ItemSeparatorComponent` from the Contents
  screen.
- **Keep** the `Divider` component and its `inset` prop — it remains a valid tier-2 primitive and is
  still used by the stacks' `dividers` prop. It is simply not used here.
- Keep the serial-number toggle; that decision is still open.

## 2. Progress bar and read time move onto the cover art

**Decided by the human.** They currently sit in the metadata line under the title.

- **Progress bar**: a thin fill flush along the **bottom edge of the `GeneratedCover`**, spanning
  the card's full width, in `accent.base`, with its width set by the book's progress. It should
  read as part of the image, not as a widget sitting near it. At 0% it is simply absent.
- **Read time** (`"12 min read"`): placed **on** the cover art.
- **The title stays below the art**, alone. Remove the metadata line entirely.

On legibility: do **not** add a scrim by default. `GeneratedCover` constrains its background
lightness per theme — roughly 88–94% in light, 14–22% in dark — so `theme.text.primary` has real
contrast against it in both. Verify this holds across the layout presets; only if a preset's
shapes genuinely break it, add a minimal scrim.

## 3. Book read time shows "1 min" — word counts are missing on existing books

`wordCount` was added to `Chapter` in the previous pass, so books imported **before** it have no
value stored. `BookCard` sums `c.wordCount || 0`, gets 0, and `readMinutes` floors to 1.

Fix by backfilling on read rather than forcing a re-import:

- In `storage/`, when a book is loaded, if a chapter's `wordCount` is missing or 0 **and** it has
  blocks, compute it from the blocks and use that. Persist the corrected book so the work happens
  once per book, not on every render.
- Keep the computation in one shared helper so parse-time and backfill can never disagree.
- A chapter with genuinely no blocks keeps a word count of 0; that is correct, not a bug to paper
  over.

## 4. Navigation chrome is unthemed

`<Stack />` in `app/_layout.tsx` has no `screenOptions`, so the navigation header still uses React
Navigation's defaults while every screen below uses the app's theme. In dark mode this puts a light
header above a near-black screen.

- Configure `screenOptions` from the theme: header background `surface.page`, tint and title colour
  `text.primary`, and no header shadow or bottom border — the design leans on hairlines and
  lightness, not elevation.
- The options must be read **inside** the `ThemeProvider`, so extract the themed `<Stack />` into a
  small child component; `useTheme` cannot be called in the same component that renders the
  provider.
- Set the status bar style from `theme.scheme` (`expo-status-bar` is already installed) so the
  clock and battery icons stay legible in both themes.
- Give the Contents screen a title of the book's name, or hide the header title if that duplicates
  `ContentsHeader` — pick whichever avoids showing the title twice, and leave a brief comment.

## Explicitly not in this phase

- Do not restyle the reader screen.
- Do not change the cover generator's hue arc, layouts or lightness bands.
- Do not change any token value.
- Do not resolve the serial-number toggle.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass. Chapter rows read as cards, the
library card shows its progress bar on the art's bottom edge with read time on the art and only the
title below, existing books report a real read time, and the navigation header matches the theme in
both light and dark.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.
