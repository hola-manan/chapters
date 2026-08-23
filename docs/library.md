# The library — using `design/` and `ui/` in another project

This is the API reference. `docs/components.md` is the companion: it records *why* each of these is
shaped the way it is, and is worth reading before you change one. This file only tells you how to
call them.

Everything here is portable. Nothing in `design/` or `ui/` knows this app exists.

---

## Taking it to a new project

**1. Copy two directories.** `design/` and `ui/`, keeping their relative positions — `ui/` imports
`design/` with `../../design`.

**2. Install what `ui/` imports.** These are the only external packages it touches:

```
react-native-reanimated
react-native-gesture-handler
react-native-safe-area-context
expo-haptics
expo-blur            # Sheet's backdrop only
expo-linear-gradient # EdgeFade only
@expo/vector-icons   # Icon only

```

`design/` needs nothing at all — it is plain TypeScript objects. That is the point of it, and it is
why a colour token is `#F7F8FA` and never a `StyleSheet`, and a spring is `{ damping, stiffness,
mass }` and never an `Animated.Value`. Drop `design/` into a Next.js project and it still works.

**3. Wrap the tree.** `GestureHandlerRootView` must be outermost or gestures silently do nothing.

```tsx
<ThemeProvider mode={themeMode} onModeChange={setThemeMode}>
  <ReadingSizeProvider value={readingSize} onChange={setReadingSize}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <YourApp />
      </ToastProvider>
    </GestureHandlerRootView>
  </ReadingSizeProvider>
</ThemeProvider>
```

`ReadingSizeProvider` is only needed if you use `ReadingText`. `ToastProvider` only if you use
toasts. Both are controlled — see below.

**4. Copy `test/design.test.ts` too.** It is what stops the library rotting.

---

## The three rules

| Tier | Directory | May import | Reusable in |
|---|---|---|---|
| 1 | `design/` | nothing — no packages at all; relative imports within `design/` are fine | any project, any framework |
| 2 | `ui/` | `design/` and relative paths within `ui/` | any React Native app |
| 3 | `features/` | anything | one app |

Two of these are machine-checked by `test/design.test.ts`:

- no file under `design/` imports a package
- no file under `ui/`, `features/` or `app/` contains a hex colour literal
- no file under `ui/` imports from `features/`

**The guard has a known hole: it catches colours, not sizes.** Three icon call sites drifted to 20,
24 and 22 points with nothing to stop them. If you want that closed, ban numeric literals in size
props as well — noisier, but it would have caught it.

---

# Tier 1 — `design/`

Import everything from `design`:

```ts
import { space, radius, uiType, springs, motion, lightTheme, darkTheme } from '../../design';
```

## `space`

A 4-based scale, addressable two ways. The numeric keys are for reading a value; the named keys are
what you use in components.

```ts
space[2] space[4] space[8] space[12] space[16] space[20] space[24] space[32] space[40] space[48] space[64]

space.xxs  // 2      space.lg   // 16     space.paragraphGap    // 16
space.xs   // 4      space.xl   // 24     space.minTouchTarget  // 44
space.sm   // 8      space.xxl  // 32
space.md   // 12     space.xxxl // 48
```

## `radius`

```ts
radius.none // 0    radius.md // 8     radius.xxl  // 24
radius.xs   // 2    radius.lg // 12    radius.pill // 999
radius.sm   // 4    radius.xl // 16
```

## `uiType` — the UI scale

Fixed steps. Every entry is `{ fontSize, lineHeight, letterSpacing }`.

| Variant | Size / line height | Use |
|---|---|---|
| `caption` | 11 / 14 | Eyebrows, uppercase labels |
| `footnote` | 13 / 18 | Metadata, secondary rows |
| `subhead` | 15 / 20 | Supporting copy |
| `body` | 17 / 22 | Default |
| `title3` | 20 / 25 | Section headings |
| `title2` | 24 / 30 | |
| `title1` | 28 / 34 | Screen titles |

## Reading type — a separate scale with a different contract

UI type is a fixed ramp. Reading type is **derived**, because line height must follow size:

```ts
readingConfig          // { baseSize: 19, leading: 1.45, scale: 1 }
readingSizes           // { small: 17, default: 19, large: 22 }
getReadingStyle(scale?, baseSize?, leading?)
                       // -> { fontSize, lineHeight: round(fontSize * leading), fontFamily }
readingAccentType      // { initialScale: 3.2, leadScale: 0.82, leadTracking: 0.8 }
readingFontFamily      // { regular, semibold } — Source Serif 4 by default
```

Never tabulate line heights by hand. Add a size to `readingSizes` and its leading comes out right
for free — that is the whole reason this scale is a function and the UI scale is a table.

## `motion`

```ts
springs.gentle   // { damping: 24, stiffness: 180, mass: 1 }
springs.default  // { damping: 20, stiffness: 220, mass: 1 }   ← the workhorse
springs.snappy   // { damping: 16, stiffness: 280, mass: 0.8 }

durations.instant // 90     durations.base // 220    durations.spin  // 900
durations.fast    // 160    durations.slow // 360    durations.toast // 4000

easings.standard / .accelerate / .decelerate    // cubic-bezier control points
reducedMotion     // { duration: 100, easing }
press             // { scale: 0.99, spring: springs.default }
dismiss           // { flickVelocity: 500, distanceRatio: 1/3, resistance: 0.2 }
```

**A spring's callback fires when it *settles*, not when it looks finished.** `springs.default` has a
damping ratio near 0.67 and settles around 460 ms, of which the last ~300 ms is invisible. Never
sequence anything the user is waiting on behind a spring completion callback. This cost a whole
debugging round — see `docs/components.md` #30c.

## `iconSizes`

Optically corrected — Ionicons fill their square, so an icon at the text's point size reads larger
than the text.

```ts
// beside text
caption: 12   footnote: 14   subhead: 16   body: 18   title3: 20
// standalone
sm: 16        md: 20         lg: 24
```

## Themes

`lightTheme` and `darkTheme`, both this shape:

```ts
theme.scheme                // 'light' | 'dark'
theme.surface.page / .raised / .floating / .sunken
theme.text.primary / .secondary / .tertiary / .onAccent
theme.border.subtle / .strong
theme.accent.base / .pressed / .tint
theme.shadow.color
theme.state.pressOverlay
```

**Never branch on `theme.scheme` to pick a colour.** The semantic names already resolve per theme —
in dark, `shadow.color` is transparent and `surface.floating` is *lighter* than `raised`, so one code
path serves both. `scheme` exists for one legitimate case: procedural generation, where a lightness
band cannot be expressed as a single token.

**`text.tertiary` is roughly 2.8:1 in light mode.** Disabled states and decoration only. Anything
meant to be read uses `secondary`.

### `withAlpha(hex: string, alpha: number): string`

Takes `#RRGGBB` (or `#RGB`) and returns `rgba(r, g, b, alpha)`. Pure, tier-1 helper with zero package
imports. Used whenever a gradient fades to transparent so the fade target preserves the surface's
RGB channels rather than defaulting to transparent black.


---

# Tier 2 — `ui/`

```ts
import { Text, VStack, Surface, PressableCard, useTheme } from '../../ui';
```

## Theme

### `ThemeProvider`

```ts
<ThemeProvider
  mode?: 'light' | 'dark' | 'system'   // default 'system'
  onModeChange?: (mode) => void
  themeOverride?: 'light' | 'dark'     // forces a theme regardless of mode; for galleries
/>
```

Controlled — it stores nothing. You own the value and its persistence.

### `useTheme(): Theme` · `useThemeMode(): { mode, setMode }`

`useThemeMode` returns a no-op setter when there is no provider, so a component can be rendered bare
in a gallery without crashing.

### `ReadingSizeProvider` · `useReadingSize()`

```ts
<ReadingSizeProvider value={ReadingSizeName} onChange={(size) => void} />

useReadingSize(): {
  size: 'small' | 'default' | 'large';
  setSize: (size) => void;
  step: (direction: 'up' | 'down') => void;   // clamps silently at the ends
}
```

Also controlled, and for a specific reason: a pinch gesture and a settings control both write the
size, and a provider that held its own copy would let the two disagree.

## Typography

### `Text`

```ts
<Text
  variant?: 'caption' | 'footnote' | 'subhead' | 'body' | 'title3' | 'title2' | 'title1'  // 'body'
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent'                     // 'primary'
  weight?: 'regular' | 'medium' | 'semibold'                                              // 'regular'
  align?: 'left' | 'center' | 'right'
  numberOfLines?: number
  flex?: boolean
  accessibilityRole?: 'header' | 'text' | 'link'
/>
```

**No `style` prop and no rest spread.** Colour is a closed set — an arbitrary colour is
unrepresentable, which is the point. Spacing belongs to the parent; `align`, `numberOfLines` and
`flex` are the only escape valves. `tone="accent"` resolves to `theme.accent.base`.

Honours OS Dynamic Type, capped at 1.35×, and scales `lineHeight` with it — React Native does not do
that for you, and text set at a fixed line height collides with itself at large accessibility sizes.

### `ReadingText`

```ts
<ReadingText tone?: 'primary' | 'secondary'  align?: 'left' | 'center'  numberOfLines?: number />
```

Reads its size from `useReadingSize()` and falls back to `readingConfig.baseSize` with no provider.
Sets `allowFontScaling={false}` **deliberately**: if you ship an in-app size control, that control
and OS Dynamic Type would multiply.

### `ReadingInitial` · `ReadingLead`

```ts
<ReadingInitial>C</ReadingInitial>     // one large initial glyph
<ReadingLead>The first four words</ReadingLead>   // faux small caps
```

**`ReadingInitial` cannot be nested inside `ReadingText`.** `ReadingText` sets an explicit
`lineHeight`, iOS maps that to the paragraph style's minimum *and* maximum, and a glyph several times
the body size is clamped to the body line box and clipped. Put it in its own column beside the
paragraph. React Native has no `float`, so text cannot wrap around it either.

`ReadingLead` is uppercase at 0.82× with tracking. Real small caps need an SC font file.

## Layout

### `VStack` · `HStack`

```ts
<VStack gap?: StackGap  align?: 'stretch'|'start'|'center'|'end'   justify?  dividers?  flex? />
<HStack gap?: StackGap  align?: 'center'|'start'|'end'|'baseline'  justify?  dividers?  flex?  wrap? />

type StackGap = 'none' | 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'
type StackJustify = 'start' | 'center' | 'end' | 'between'
```

Two components rather than one with a `direction` prop, so the alignment vocabulary can differ —
`baseline` means something in a row and nothing in a column.

`dividers` filters out false and null children before interleaving, so a conditional child cannot
leave a stray rule behind.

### `Surface`

```ts
<Surface
  elevation?: 0 | 1 | 2        // 0 page · 1 raised · 2 floating
  sunken?: boolean             // deliberately outside the ladder
  padding? paddingX? paddingY?: StackGap
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'pill'
  border?: boolean             // hairline in theme.border.subtle
  flex?: boolean
/>
```

The container primitive — background, padding, radius and border — so no call site needs a bare
`View`. Elevations 0 and 1 use colour and hairline only; **only elevation 2 casts a shadow**, because
sheets and toasts are the only things that genuinely float.

**`Surface` paints a radius but does not clip.** A child with square corners will poke out. Either
put the radius on a `Pressable` above it (which does clip) or round the child's corners to match.

### `Divider`

```ts
<Divider inset?: 'none' | 'content' />
```

Works in both orientations with no orientation prop: `minWidth`/`minHeight` at hairline plus
`alignSelf: 'stretch'`, so a `VStack` makes it horizontal and an `HStack` makes it vertical.

## Interaction

### `Pressable` and its five variants

```ts
<Pressable
  onPress? onLongPress?
  feedback?: 'scale' | 'overlay' | 'opacity' | 'none'
  haptic?:   'none' | 'selection' | 'light' | 'success' | 'error'   // default 'none'
  radius?:   'none' | 'sm' | 'md' | 'lg' | 'pill'
  hitSlop? disabled? flex?
  accessibilityRole? accessibilityLabel? accessibilityHint?
/>
```

The five variants are the same component with props fixed — composition, not inheritance:

| Variant | Feedback | For |
|---|---|---|
| `PressableCard` | scale | Self-contained tiles |
| `PressableRow` | overlay | Full-bleed list rows |
| `IconButton` | opacity | Icons; derives hitSlop to reach 44pt |

| `TextLink` | opacity | Inline links; takes `variant` and `weight` |
| `TapRegion` | none | Invisible tap areas |

**`IconButton` takes an `iconSize` and derives its hitSlop from it** — `(44 − iconSize) / 2` — so
the touch target reaches 44pt. It defaults to `space.xl` (24). **Put a smaller icon in one without
saying so and the touch target comes out under 44pt**, silently: `<IconButton iconSize={16}><Icon
size="sm" …/></IconButton>`.

**Whatever paints the press overlay must own the shape.** Set `radius` on the `Pressable`, not on the
`Surface` inside it, or the overlay paints square corners into a rounded card.

**`flex` sets `flex: 1`, which collapses in an auto-height column.** In a row it fills the width as
expected; in a column whose height comes from its content, a `flex: 1` child takes a flex basis of
zero and disappears. This rendered an entire `SegmentedControl` invisible. If the parent's main axis
isn't the one you want filled, leave it off — cross-axis stretch is already the default.

Haptics default to `none` and are opted into per call site. The policy that has held up: consequential
actions only — a navigation commit, a destructive confirm, a deliberate setting change. Not taps.

Feedback starts on press-*in*, not release, and scale degrades to opacity under OS reduce-motion.

### `Icon`

```ts
<Icon name={IoniconName} size?: IconSizeName  tone?: 'primary'|'secondary'|'tertiary'|'accent'|'onAccent' />
```

`size` carries **two vocabularies**: type-variant names (`body`, `footnote`) for an icon beside text,
and named steps (`sm`/`md`/`lg`) for one standing alone. That ambiguity is deliberate and has a cost;
if it confuses, split it into `size` + `matchText` rather than dropping a vocabulary.

No numeric `size`, no `color` — the same closed-prop discipline as `Text`.

### `SegmentedControl`

```ts
<SegmentedControl<T extends string>
  options={readonly { value: T; label: string }[]}
  value={T}
  onChange={(value: T) => void}
/>
```

Generic over a string union, so options and value cannot disagree. Segment widths come from
`onLayout`, never from dividing screen width — labels differ in length and equal division only looks
right by accident. Segments carry no press feedback of their own: the indicator moving *is* the
response. Selection haptic fires only on an actual change.

## Overlay

### `Sheet`

```ts
<Sheet visible={boolean} onDismiss={() => void}>{children}</Sheet>
```

One detent, bottom-anchored, sized by its content, blurred backdrop. Drag down to dismiss.

**Dismissal reads velocity as well as distance** — past a third of the panel's height *or* faster
than `motion.dismiss.flickVelocity`. Distance alone makes a quick flick feel ignored, and this is the
single detail most often skipped in a hand-rolled sheet.

Height is measured via `onLayout` and the panel stays invisible until it reports; a guessed height
shows the sheet part-way up before it animates.

A blurred backdrop rather than a dim scrim was a decision for *this* app — its sheet adjusts the text
behind it, and a scrim darkens the thing being judged. For a sheet over content nobody is evaluating,
a scrim is the more conventional choice.

Renders through a native `Modal`, so **nothing else in your app can draw over it** — including
toasts.

### `CollapsingHeader`

```ts
<CollapsingHeader
  scrollY={SharedValue<number>}
  title={string}
  collapseDistance={number}
  onBack?={() => void}
/>
```

The compact bar only — the large title stays in your list's header, driven from the same `scrollY`.
Measure `collapseDistance` from that title's own height via `onLayout` rather than guessing.

The back button never animates: it is navigation, not decoration.

Needs the screen's native header off. A native header title cannot be animated from a worklet, and
scroll-linked interpolation on the JS thread is exactly the jank this avoids. Turning the header off
does **not** disable the native back gesture — that is a separate flag.

### `EdgeFade`

```ts
<EdgeFade
  edge="top" | "bottom"
  solidHeight?: number       // default 0, fully opaque band at outer edge (e.g. insets.top)
  fadeHeight: number         // gradient span between solid band and content (e.g. space.xl)
  color?: string             // defaults to theme.surface.page
  testID?: string
/>
```

Pinned edge gradient overlay. Implemented as a single `LinearGradient` node with `locations`
derived from `solidRatio = solidHeight / (solidHeight + fadeHeight)`. For `edge="bottom"`, the
colour order reverses so the solid band covers the bottom inset (home indicator) while the gentler
gradient faces the content.

**`pointerEvents="none"` is mandatory.** Without it, the top and bottom edge regions capture touches
and deaden tap-to-toggle chrome and other scroll interactions.

Has `zIndex: 5`, sitting above scrolling content but beneath `ReaderChrome` (`zIndex: 10`). Pinned
at the screen root outside `ChapterTransition` so edge treatments stay fixed during horizontal swipe.


## Feedback

### `ProgressBar` · `Spinner`

```ts
<ProgressBar value={number} />        // 0..1, clamped
<Spinner size?: 'sm' | 'md' />
```

Two components rather than one with a `determinate` prop, because they answer different questions: a
bar claims a position, a spinner only claims that work is happening. Use a bar **only where progress
is genuinely measurable**, and a spinner where it isn't — stitching several unrelated sub-progresses
into one bar is how you get a bar that sits at 40% for a minute and then jumps to 95%.

Under reduced motion the spinner keeps turning; it is essential feedback, not decoration.

### `SkeletonText`

```ts
<SkeletonText lines?={number} delayMs?={number} />   // defaults 3 and 200
```

**Renders nothing at all until `delayMs` elapses.** A skeleton that appears and vanishes inside
200 ms reads as a flicker, and most loads beat that.

Before reaching for it: the better move is usually to show what you already know. If the previous
screen was holding the title, pass it forward and skeleton only the part that is genuinely pending.

Pulses rather than shimmers — a sweeping shimmer needs a masked gradient and reads as a busy app.

### `EmptyState`

```ts
<EmptyState title?={string} message={string}>{children}</EmptyState>
```

No action slot. If the empty screen already carries its call to action elsewhere, the empty state
should say something else rather than repeat it.

### `Toast`

```ts
<ToastProvider>{children}</ToastProvider>

const { show } = useToast();
show({ message: string, onPress?: () => void, durationMs?: number });   // default 4000
```

Mounted above the navigator so it can appear over any screen. **One at a time, no stack** — a second
`show` replaces the first and restarts its timer. If you need a queue, that is the first thing to
add.

Clear the dismiss timer on replacement as well as unmount, or the outgoing toast's timer kills the
incoming one early.

## Motion hooks

### `useAutoHide`

```ts
useAutoHide({ threshold?: number, initiallyVisible?: boolean }): {
  visibility: SharedValue<number>;   // 0 hidden, 1 visible
  isVisible: boolean;                // JS mirror — for pointerEvents only
  scrollHandler;                     // pass to an Animated scroll view
  toggle: () => void;
}
```

Scroll-linked auto-hide for chrome over a reading or feed surface. Two rules inside it are worth
knowing because both are invisible until they are missing:

- **Intent is tracked separately from the animation.** Comparing against the animated value sees
  "not yet 0" on every frame of a hide and restarts the spring on each scroll event, so the bar never
  arrives.
- **A tap-dismissal outranks the scroll rule** until the user deliberately scrolls down again.
  Otherwise tapping the chrome away and continuing to read upward brings it straight back.

Drive `pointerEvents` from `isVisible`; never drive layout from it.

### `useScrollY`

```ts
useScrollY(): { scrollY: SharedValue<number>; scrollHandler }
```

The plain sibling — it only reports the offset.

---

## Things that will bite you

Collected because each one cost real debugging time.

1. **`Pressable`'s `flex` collapses in an auto-height column.** An entire control rendered invisible.
2. **`Surface` does not clip its children.** Square corners poke out of rounded cards.
3. **A large glyph nested in `ReadingText` gets clipped** — iOS clamps the line box to `lineHeight`.
4. **`withSpring`'s callback fires on settle, not on arrival** — ~300 ms of invisible tail.
5. **`runOnJS` cannot carry a function argument.** It serialises; the function arrives as an object.
6. **Shared values written on the UI thread are mirrored to JS asynchronously.** Reading one back in
   a layout effect can return the stale value. Route through a JS ref when ordering matters.
7. **`.runOnJS(true)` on a gesture moves the whole gesture to the JS thread**, where recognition
   competes with rendering. Use `runOnJS(fn)` for the callback instead.
8. **`react-native-gesture-handler` needs `GestureHandlerRootView` at the root**, or gestures fail
   silently with no warning.
9. **A gradient ending at `'transparent'` creates a dirty grey halo.** In CSS and native renderers,
   `'transparent'` resolves to `rgba(0, 0, 0, 0)` (transparent black). Interpolating from a light paper
   background (`#F7F8FA`) toward `'transparent'` interpolates through darker semi-transparent greys in
   the middle of the fade. The gradient must always end at the *same RGB* with alpha 0 using
   `withAlpha(c, 0)`.

