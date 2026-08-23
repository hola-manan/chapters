# Reader edge treatment — how the reading surface meets the top and bottom of the screen

Read `GEMINI.md` first.

## Context

In the immersive reader the list has `paddingTop: insets.top + space.xxxl` and
`paddingBottom: space.xxl + insets.bottom`, which is correct **at rest** — the first line starts
below the clock, the last stops above the home indicator.

Nothing occupies those regions **during** scroll. So text slides up and collides with the live
status bar (clock, battery) with no separation at all, and slides off the bottom guillotined
mid-glyph. `ReaderChrome` covers the top with opaque paper, but only while visible — which in
immersive reading is never.

This pass gives both edges a treatment. It also produces a genuinely reusable tier-2 component,
which is the point of the project.

## Decided by the human and not open

- **Top:** an opaque paper band across the status-bar region, then a **short gradient below it**
  fading paper to transparent. The clock always sits on clean paper; text dissolves rather than
  being clipped.
- **Bottom:** **fade only, and gentler than the top.** Reading runs downward, so a deep bottom fade
  obscures the line you are about to read and reads as friction. The gradient must reach full paper
  opacity by the safe-area line, so the home indicator sits on solid paper.
- **Not decided, do not touch:** whether `ReaderChrome` keeps its hairline bottom border or
  dissolves into the same gradient. The human will judge that on device once the edges exist.
  **Leave `ReaderChrome` exactly as it is.**

Rejected, for the record, so nobody re-proposes them: blur/material (over flat paper a blur strip
only smudges the glyphs and reads as a rendering bug — it needs rich content behind it to work);
hiding the status bar (impossible in an iOS standalone PWA, which is how this app is actually used,
so it would split native and web behaviour).

## 1. `design/tokens/color.ts` — add `withAlpha`

```ts
export function withAlpha(hex: string, alpha: number): string
```

Takes `#RRGGBB` (also accept `#RGB`), returns `rgba(r, g, b, alpha)`. Pure, no package imports —
this file is tier 1 and the guard test enforces that.

**This is not a convenience, it is the whole correctness of the gradient.** A gradient ending at
`'transparent'` ends at transparent *black*, and the interpolation runs through progressively
darker semi-transparent greys — you get a visible dirty halo through the middle of the fade,
worst on a light paper background. The gradient must end at the *same RGB* with alpha `0`.

Add a comment saying exactly that, or someone will "simplify" it back to `'transparent'` later.

## 2. `ui/overlay/EdgeFade.tsx` — new tier-2 component

Absolutely positioned overlay pinned to one edge, painting the surface colour solid at the outer
edge and fading it out toward the content.

```ts
export type EdgeFadeProps = {
  edge: 'top' | 'bottom';
  /** Fully opaque band at the outer edge. Usually the safe-area inset. Defaults to 0. */
  solidHeight?: number;
  /** Gradient span between the solid band and the content. */
  fadeHeight: number;
  /** Defaults to theme.surface.page. */
  color?: string;
  testID?: string;
};
```

Implementation notes:

- One `LinearGradient` node, not two views. Colours `[c, c, withAlpha(c, 0)]` with `locations`
  `[0, solidRatio, 1]` where `solidRatio = solidHeight / (solidHeight + fadeHeight)`. For
  `edge: 'bottom'` the colour order reverses so the opaque end is at the bottom.
- Total height is `solidHeight + fadeHeight`. Pin with `position: 'absolute'`, `left: 0`,
  `right: 0`, and `top: 0` or `bottom: 0`.
- **`pointerEvents="none"` is mandatory.** The reader toggles its chrome on tap; without this the
  top ~83pt and bottom ~46pt of the screen become dead to touch, which is a much worse bug than
  the one this pass is fixing.
- No hex literals — the default colour comes from `useTheme().surface.page`. The guard test
  enforces this for everything under `ui/`.
- Export from `ui/overlay/index.ts` alongside `Sheet` and `CollapsingHeader`.

## 3. Wire it into the reader — `app/book/[id]/[chapter].tsx`

Two instances at the **screen root**, as siblings of the `GestureDetector` — deliberately *outside*
`ChapterTransition`. The filmstrip layers must slide underneath a fixed edge treatment; a fade that
travels with the content would be visibly wrong during a swipe. This also means `ChapterPreview`
needs no change at all.

```tsx
<EdgeFade edge="top" solidHeight={insets.top} fadeHeight={space.xl} />
<EdgeFade edge="bottom" solidHeight={insets.bottom} fadeHeight={space.md} />
```

`space.xl` (24) against `space.md` (12) is the asymmetry the human chose — do not equalise them.

Z-order: `ReaderChrome` is `zIndex: 10`. Give `EdgeFade` a lower `zIndex` (5) so the chrome covers
it when visible, while both sit above the list. React Native honours `zIndex` over tree order, so
placement in JSX is not what decides this — set it explicitly.

Add the same two to the loading branch of this screen (the skeleton state around line 195) so the
edges do not pop into existence when the book finishes loading.

## 4. `app/_dev/gallery.tsx`

Add an `EdgeFade` section: both edges over a block of real-looking paragraph text, in both themes,
so the gradient can be checked for banding and for the transparent-black halo described in step 1.

## 5. Docs

- `docs/components.md` — a decision-log entry. Record the research (Apple systematised this in
  iOS 26 as the *scroll edge effect*: blur **and** fade at the top, fade **only** at the bottom —
  the asymmetry is Apple's too, not an invention here), the reading-direction argument for the
  gentler bottom, why blur and status-bar-hiding were rejected, and that the chrome hairline
  question is deliberately still open.
- `docs/library.md` — `EdgeFade`'s API and `withAlpha`, plus a new entry in "Things that will bite
  you" for the transparent-black gradient halo.

## Gates

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts test/icons.test.ts`
  (the design guard must still pass — `withAlpha` in tier 1 with no imports, `EdgeFade` in tier 2
  with no hex literals)
- `npx expo export --platform web` followed by `npm run check:web`

`expo-linear-gradient` renders through CSS on react-native-web, so it must work in the PWA too.
Confirm the export succeeds and report the main bundle size delta.

## Constraints

- **Do not touch anything outside this project directory.** Do not run `git`, do not commit.
- **No package installs.** `expo-linear-gradient@~15.0.8` is already installed and is the only new
  dependency this pass gets. If you believe you need another, stop and say so instead.
- Do not change `ReaderChrome`, `ChapterTransition`, `ChapterPreview`, `ChapterEndCard`, or any
  typography. The only behavioural change is the two new overlays.
- Do not change the existing `paddingTop` / `paddingBottom` on the list. The edge treatment covers
  scroll; the padding governs rest. They are separate concerns and both are still needed.
- If an out-of-repo need appears, list it at the end of your response rather than acting on it.
