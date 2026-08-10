# Component pass 3 — Surface

## Goal

Build the container primitive. `Stack` owns the space *between* children; `Surface` owns the space
*around* content, plus background, radius and border. It is the only component permitted to paint a
background colour.

Read `GEMINI.md` first. `ui/` may import from `design/` only, may never hardcode a colour, size,
radius or duration, and — following `Text` and the stacks — **must not accept a `style` prop or
spread `...rest`**.

## Decisions already made by the human — transcribe, do not reinterpret

1. **Surface owns background, padding, radius and border.** It is the container primitive; a call
   site should not need a bare `View`.
2. **Depth is flat by default.** Elevation 0 and 1 use colour and hairline only, in both themes.
   Only elevation 2 — floating layers such as sheets and toasts — gets a shadow in the light theme,
   and extra lightness in the dark theme where shadows are invisible.
3. **Elevation is numeric**: `elevation={0 | 1 | 2}`. `sunken` is **not** part of the ladder; it is
   a separate boolean, because a numeric scale handles a recessed surface awkwardly.

## 0. Tier-1 additions these decisions require

Both are consequences of the decisions above, not new design choices.

**`design/tokens/color.ts` and `design/themes.ts`:**

- Add `surface.floating` to the `Theme` type and both themes. In **light** it can equal
  `surface.raised` (white), since the shadow does the separating. In **dark** it must be
  *lighter* than `surface.raised`, because that is the only way elevation reads on a dark ground.
  A `darkGround[700]`-style step already exists in the palette for this.
- Add `shadow.color` to the `Theme` type and both themes. In **light**, tint it toward the forest
  ink rather than using neutral black — a neutral shadow over the cool paper reads muddy. In
  **dark**, set it fully transparent, since the dark theme separates by lightness and must never
  paint a shadow.

Add the primitives to `tokens/color.ts` first and reference them from `themes.ts` — `themes.ts`
must remain free of hex literals, and there is a test asserting exactly that.

## 1. `ui/primitives/Surface.tsx`

```ts
type SurfacePadding = 'none' | 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

type SurfaceProps = {
  elevation?: 0 | 1 | 2;        // 0 page · 1 raised · 2 floating
  sunken?: boolean;             // deliberately outside the ladder
  padding?: SurfacePadding;     // all sides
  paddingX?: SurfacePadding;    // overrides padding horizontally
  paddingY?: SurfacePadding;    // overrides padding vertically
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'pill';
  border?: boolean;             // hairline in theme.border.subtle
  flex?: boolean;
  children: React.ReactNode;
  testID?: string;
};
```

- Defaults: `elevation={0}`, `padding='none'`, `radius='none'`, `border={false}`.
- Reuse the padding vocabulary from the stacks — import the existing `StackGap` type or extract the
  shared union into one place. Do **not** define a second, divergent spacing vocabulary.
- Background: `elevation` 0 → `surface.page`, 1 → `surface.raised`, 2 → `surface.floating`.
  `sunken` overrides to `surface.sunken` regardless of elevation.
- Shadow **only** at `elevation={2}`, built from the `shadow` tokens in `design/` plus
  `theme.shadow.color`. Set the iOS shadow properties and the Android `elevation` property so it is
  not silently iOS-only. Because the dark theme's `shadow.color` is transparent, the same code path
  correctly produces no visible shadow in dark — do not branch on theme name.
- `radius` maps through the radius tokens. `border` draws `StyleSheet.hairlineWidth` in
  `theme.border.subtle`.
- No `style` prop, no `...rest` spread.

## 2. Export from `ui/index.ts`

Add `Surface` and its prop types to the barrel.

## 3. Extend the gallery

Add a Surface section showing:

- All three elevations side by side on the page background, labelled, so the flat-versus-floating
  distinction is visible. Include a `sunken` example.
- The same set with the theme override switched to dark — the point being that elevation 2 still
  reads as raised there, via lightness rather than shadow. This is the specific thing to verify by
  eye.
- The padding scale: a few `Surface`es with different `padding` values and a visible border, so the
  padding ladder can be judged the way the gap ladder was.
- One realistic composition: a `Surface` with `elevation={1}`, `radius='md'`, `padding='lg'`
  containing a `VStack` with a title `Text` and a secondary `Text` — the shape a book card will
  take, so the primitives can be seen working together.

## Explicitly not in this phase

- No `Pressable`, `Button`, `Icon` or any other component.
- Do not decide `Divider`'s inset or weight — still its own pass.
- Do not restyle `app/index.tsx`, the contents screen or the reader.
- Do not change any type or motion token, or any decided colour value.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including the `ui/` hex-literal guard
and the `themes.ts` no-hex guard. The three real screens are unchanged.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.
