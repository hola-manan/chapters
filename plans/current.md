# Component pass 4 — Pressable and its derived variants

## Goal

Build the interaction primitive and the five specialised components that derive from it. This is
the most reused component in the codebase and the first place the springy motion decision becomes
real.

Read `GEMINI.md` first. `ui/` may import from `design/` only, may never hardcode a colour, size,
radius or duration, and must not accept a `style` prop or spread `...rest`.

## Decisions already made by the human — transcribe, do not reinterpret

1. **One base `Pressable`, with five specialised components composing it** by fixing props. Use
   composition — a wrapper that renders `<Pressable feedback="..." />`. **Not** class inheritance:
   function components only, and hooks do not work in classes.
2. **Feedback is a closed vocabulary**: `'scale' | 'overlay' | 'opacity' | 'none'`.
3. **Haptics default to `none`** and are opted into explicitly at the call site. Policy is
   consequential actions only — state changes, not ordinary navigation. Do not bake haptics into
   the card or row variants.
4. **Scale depth is undecided on purpose.** The gallery must expose live controls so it can be
   judged by thumb, not by description.

## 1. `ui/primitives/Pressable.tsx` — the base

```ts
type PressableProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  feedback?: 'scale' | 'overlay' | 'opacity' | 'none';   // default 'opacity'
  haptic?: 'none' | 'selection' | 'light' | 'success' | 'error';  // default 'none'
  hitSlop?: number;
  disabled?: boolean;
  flex?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children: React.ReactNode;
  testID?: string;
};
```

Behaviour requirements:

- **Feedback begins on press-in, not on release.** Waiting for release is the single most common
  cause of an interface feeling laggy. Use `onPressIn` / `onPressOut`.
- Animate with **`react-native-reanimated` v4 worklets** and the spring configs in
  `design/tokens/motion`. Never `Animated` from `react-native`. Springs are the vocabulary here;
  durations are only for opacity.
- `scale` animates a shared value with `withSpring`. `opacity` animates opacity. `overlay` shows an
  absolutely-positioned fill in `theme.state.pressOverlay` that fades in. `none` renders no visual
  change at all but still handles the press.
- **Respect reduced motion.** Read the OS setting (Reanimated's `useReducedMotion` or
  `AccessibilityInfo`) and degrade `scale` to a plain opacity change when it is on. Motion
  sensitivity is a real accessibility need, not a preference.
- `haptic` maps to `expo-haptics`: `selection` → `selectionAsync`, `light` →
  `impactAsync(Light)`, `success` / `error` → `notificationAsync`. Fire on press-in for
  `selection` / `light`; `success` / `error` are for callers to trigger on outcomes.
- `disabled` prevents presses, suppresses haptics, and reduces opacity. Set
  `accessibilityState={{ disabled }}`.
- Default `accessibilityRole` to `'button'`.
- No `style` prop, no `...rest` spread.

## 2. The five derived components

Each is a thin wrapper that fixes props on the base. Each in its own file under `ui/primitives/`.

| Component | Fixes | Notes |
|---|---|---|
| `PressableCard` | `feedback="scale"` | For self-contained tiles with their own surface. |
| `PressableRow` | `feedback="overlay"` | Full-bleed list rows. Overlay must cover the full row width. |
| `IconButton` | `feedback="opacity"`, `hitSlop` sized so the target reaches **44×44pt** | Apple's minimum touch target. The icon is visually smaller; the slop is what makes it usable. |
| `TextLink` | `feedback="opacity"`, `accessibilityRole="link"` | Renders `Text` with `tone="accent"`. Accepts `variant` and `weight` and forwards them. |
| `TapRegion` | `feedback="none"` | Invisible tap areas — reader centre-tap, sheet backdrop. No visual response by design. |

Do **not** duplicate press logic into any of them. Every one renders the base.

## 3. Export from `ui/index.ts`

All six plus their prop types.

## 4. Gallery — make press feel tunable

Add a Pressable section with **live controls**, because press feel cannot be judged from a static
render:

- A slider or chip row for **scale target**, offering at least `0.99`, `0.97`, `0.95`, `0.92`.
- A chip row for **spring config**: `gentle`, `default`, `snappy` from the motion tokens.
- A large `PressableCard` bound to those two controls, so the values can be thumbed directly.
- One live example of each of the five variants, each clearly labelled, all actually pressable:
  a card, a full-width row, an icon button, a text link, and a tap region that toggles something
  visible so it is obviously working despite showing no feedback.
- A disabled example.
- One example with `haptic="selection"` so the haptic can be felt.

Wire the scale and spring controls through props on the base `Pressable` for the demo only — do
not hardcode the chosen value yet. The human picks it after handling it, and it gets written into
the tokens in a follow-up.

## Explicitly not in this phase

- No `Button` component — that is a later pass and depends on this one.
- Do not decide `Divider`'s inset or weight.
- Do not restyle `app/index.tsx`, the contents screen or the reader. The ugly Delete button stays
  as it is; its real design is decided at the `BookCard` pass.
- Do not change any decided token value.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass, including the `ui/` hex and import
guards. The three real screens are unchanged. Every variant in the gallery responds to touch.

## Reminders

- Do not commit. Leave the work in the working tree.
- Do not touch anything outside the project directory.
- Do not upgrade Expo or any `expo-*` package.

---

# Fixes — round 1

Two changes: bake in the press feel the human chose by hand, and fix the overlay shape bug.

## 1. Press feel is decided — bake it into the tokens and close the escape hatch

Chosen by thumb on device: **scale target `0.99`** with the **`default`** spring.

- Add a `press` entry to `design/tokens/motion.ts` holding both values together, e.g.
  `press: { scale: 0.99, spring: springs.default }`. They are one decision, not two, so keep them
  in a single token rather than as separate values that could drift apart.
- `Pressable` reads that token directly.
- **Remove the `scaleTarget` and `springConfig` props** from `Pressable` entirely, and remove the
  live tuning controls and their state from the gallery. They were temporary instruments for making
  this decision. Leaving them public would reopen exactly the escape hatch that the closed `tone`
  and `gap` vocabularies exist to prevent — any call site could then invent its own press feel and
  the system would stop being true.
- The gallery keeps every variant example; it just demonstrates the settled feel instead of
  offering knobs.

## 2. The press overlay ignores the corner radius

`PressableRow`'s overlay renders as a hard rectangle behind a rounded child, so the highlight
visibly overhangs the corners.

**Cause:** `Surface` owns `borderRadius`, but `Pressable` renders the overlay as an
`absoluteFillObject` inside its own container — and that container has no radius, so its
`overflow: 'hidden'` has nothing to clip against.

**The rule:** whatever paints the press overlay must own the shape.

- Add `radius?: 'none' | 'sm' | 'md' | 'lg' | 'pill'` to `Pressable`, defaulting to `'none'`, using
  the same radius tokens and the same closed vocabulary as `Surface`.
- Apply `borderRadius` to the pressable container, and set `overflow: 'hidden'` whenever the radius
  is not `'none'` **or** the feedback is `'overlay'`. The overlay is then clipped to the silhouette.
- Forward `radius` through `PressableCard`, `PressableRow`, `IconButton` and `TapRegion`.
- Update the gallery's row and card examples to set `radius` on the pressable, and drop the radius
  from the inner `Surface` in those examples — the parent's clip now defines the shape for both.
  Add a short comment at that call site recording why, so the pattern is not undone later.

## Not in scope

- Do not change any other token value or component.
- Do not restyle the three real screens.

## Done means

`npx tsc --noEmit`, `npm run lint` and `node --test` all pass. `scaleTarget` and `springConfig` no
longer exist anywhere in the codebase. The row overlay is clipped to its rounded corners.
