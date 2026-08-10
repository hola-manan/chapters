# Phase 2 — Tier 1 design tokens

## Goal

Create the `design/` layer: the portable foundation every component reads from. This is **only**
tokens and themes. Do not build components, do not touch the existing screens, do not restyle
anything. The screens stay ugly until their own component passes.

## The hard constraint

**No file under `design/` may import anything at all.** Not `react`, not `react-native`, not any
`expo*` package, not a third-party library. Every file exports plain TypeScript values and types.

- A colour is `'#142621'`, never a `StyleSheet` entry.
- A motion token is `{ damping, stiffness, mass }` or `{ duration, easing }`, never an `Animated`
  value or a Reanimated helper.
- A space token is the number `16`, never a style object.

This is what lets `design/` be copied into an unrelated web project untouched. It is the single
most important property of this layer — enforce it with the test in section 7.

## Decisions already made by the human — transcribe, do not reinterpret

| Decision | Value |
|---|---|
| Reading face | Source Serif 4 (`SourceSerif4_400Regular`, `SourceSerif4_600SemiBold`) |
| Reading size | 19pt base |
| Reading leading | 1.45 (tight; correct for the ~40-character phone measure) |
| UI face | system (SF Pro) — do not load a font for UI |
| Paper (light) | `#F7F8FA` cool off-white |
| Ink (light) | `#142621` forest |
| Muted ink (light) | `#5C7169` |
| Accent | `#0F766E` teal |
| Motion character | springy and physical, iOS-like, slight overshoot |
| Theme order | light designed first, dark derived from it |

Direction, for judgement calls: *a quiet container whose entire quality is in its typography.
Nothing in the reader announces the app. Everything in the reader is measured.* The app is a
short-form content viewer (~5 minute reads), not a book reader.

## 1. `design/tokens/color.ts` — primitives

Raw palette only, no semantics. Name by what the colour *is*.

- A forest ink ramp: at least 5 steps from `#142621` up to a pale tint, for text, borders and
  subtle fills. Derive them as genuine dark-green-family colours, not greys.
- Neutrals: the cool paper `#F7F8FA` plus a small cool-grey ramp for borders and sunken surfaces.
- A teal accent ramp: `#0F766E` base, a darker pressed step, and a pale tint for track fills and
  selection backgrounds.
- Pure `#FFFFFF`, and a near-black ground for the dark theme.

## 2. `design/themes.ts` — semantic layer

Two themes, `light` and `dark`, with **identical key sets** and a shared `Theme` type. Names must
describe role, never appearance — `text.primary`, not `forest900`. Adding a third theme later must
cost nothing.

Required keys, at minimum:

```
surface.page          the reading ground
surface.raised        cards, sheets
surface.sunken        wells, track backgrounds
text.primary          body copy
text.secondary        metadata, captions
text.tertiary         the faintest legible step
text.onAccent         text placed on an accent fill
border.subtle         hairlines between rows
border.strong         deliberate divisions
accent.base           the single accent
accent.pressed        its pressed state
accent.tint           a pale wash of it
state.pressOverlay    overlay colour for press feedback
```

Light theme uses the decided values above. **Derive** the dark theme: a near-black ground with a
faint green cast so it stays in the same family, ink inverted to a pale warm-neutral rather than
pure white, and the accent raised in lightness — `#0F766E` is too dark to sit on a dark ground and
will fail legibility unchanged. Do not simply invert the light values; inversion always produces a
bad dark theme. Add a comment marking the dark theme as derived and not yet reviewed on device.

## 3. `design/tokens/type.ts` — two independent scales

The central typographic idea: **UI type and reading type are separate systems and must not share a
scale.**

- `ui`: a fixed ramp for labels, titles and chrome — roughly 11 / 13 / 15 / 17 / 20 / 24 / 28,
  each with its own line height and letter-spacing. For the system font.
- `reading`: a single `baseSize` of 19 and `leading` of 1.45, plus a `scale` multiplier intended to
  become user-adjustable later. Line height must be **derived** (`round(size * leading)`), never
  listed as a constant — the relationship is the point.
- Font family constants: the two Source Serif 4 names for reading. For UI use `undefined`/`null` to
  mean "system default" — do not invent a fontFamily string for SF Pro.

## 4. `design/tokens/space.ts`

One 4-based scale, roughly 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Export as a named object and
keep the raw numbers accessible. Every gap in the app comes from here.

## 5. `design/tokens/motion.ts`

Springy and physical. Provide:

- Spring configs as plain objects (`{ damping, stiffness, mass }`) in at least three characters:
  `gentle`, `default`, `snappy`. These are the primary vocabulary — this app animates with springs,
  not durations.
- Durations (`instant` 90, `fast` 160, `base` 220, `slow` 360) with cubic-bezier easing arrays, for
  opacity transitions where a spring makes no sense.
- A `reducedMotion` fallback duration.

Keep these as data. Reanimated bindings belong in `ui/`, not here.

## 6. `design/tokens/radius.ts` and `design/tokens/shadow.ts`

Radius: `none` 0 through `pill` 999, a small set. Shadow: plain data
(`{ offsetY, blur, opacity }`), not platform style objects, and keep it minimal — this design leans
on hairlines and lightness rather than elevation.

## 7. Enforce the no-import rule with a test

Add a Node test under `test/` that reads every `.ts` file under `design/` and fails if any contains
an `import` or `require` statement. Without this the rule silently rots. It must run under the
existing `node --test`.

## 8. `design/index.ts`

Barrel exporting the tokens, the themes, and the `Theme` type.

## Explicitly not in this phase

- No `ui/` directory, no components, no `ThemeProvider`, no hooks.
- No changes to `app/`, `features/`, `pdf/` or `storage/`.
- Do **not** modify `app/_dev/gallery.tsx` — it is the human's active chooser.
- No styling of existing screens.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including the new import-guard test.
Nothing in the running app changes appearance, because nothing consumes these tokens yet.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.

---

# Fixes — round 1

The token layer is otherwise correct: the two independent type scales, the derived reading line
height, `undefined` for the system UI font, the spring-first motion vocabulary, and the dark theme
being genuinely re-pitched rather than inverted are all right. Three fixes.

## 1. The no-import rule was specified wrongly — relax it

My spec said no file under `design/` may import *anything*. That was too strong and it forced the
duplication in fix 2. The rule that actually protects portability is:

> **No file under `design/` may import from a package.** Relative imports *within* `design/` are
> fine, because the folder is copied as a unit.

Update `test/design.test.ts` accordingly: parse each import/`require` specifier and fail only when
it does **not** begin with `./` or `../`. Keep failing on `react`, `react-native`, `expo-*` and any
other bare specifier. Keep the comment-stripping. The test must still fail loudly if someone adds
`import { View } from 'react-native'` to a token file.

## 2. `themes.ts` must consume `color.ts`, not restate it

Every colour in `themes.ts` is currently a hex literal duplicated from `tokens/color.ts` —
`#142621`, `#F7F8FA`, `#0F766E`, `#0C1412`, `#ECEFEA` and the rest. There is no link between the
primitive layer and the semantic layer, so they can drift apart silently. That defeats the purpose
of having two layers.

Rewrite `themes.ts` to `import { ... } from './tokens/color'` and reference the primitives by name
throughout. After this change **no hex literal may appear in `themes.ts` at all** — every value is
either a primitive reference or a function of one. If a semantic role needs a colour that is not in
the palette, add it to `tokens/color.ts` first (see fix 3).

`rgba(...)` overlay values may stay as literals only if they cannot be expressed from the palette;
prefer adding an explicit overlay entry to `color.ts` instead.

## 3. Add the missing primitives

These appear in `themes.ts` but not in `tokens/color.ts`, which is how the duplication slipped in:

- The light border steps (`#E2E7E4` subtle, `#C5D0CB` strong) — add them to the `forest` ramp or a
  dedicated `border` group, in the same green family.
- The light `text.tertiary` step (`#889A92`).
- The press-overlay and dark border rgba values — add an `overlay` group to `color.ts`.

Once added, reference them from `themes.ts`.

## Not in scope

- Do not change any decided value. The palette, sizes and leading stay exactly as they are; this is
  a wiring fix, not a redesign.
- Still no `ui/` directory, no components, no `ThemeProvider`.
- Do **not** modify `app/_dev/gallery.tsx`.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass. `themes.ts` contains no hex
literals. The guard test rejects a bare-specifier import but permits a relative one — verify by
reasoning, not by leaving a broken test behind.
