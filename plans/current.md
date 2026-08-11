# Reader settings — Sheet, SegmentedControl, live reading size and theme

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it.

**The design decisions below were made by the human and are not open.** Implement them exactly.

Decided:

- The sheet holds **two controls: reading size and theme**. Nothing else. No line spacing, no
  typeface picker.
- **Reading size has three steps: Small, Default, Large.** Not five, not a slider.
- **Theme is Light / Dark / System**, and the choice persists across launches.
- **Pinching the page also changes the reading size**, and the two stay in sync — neither is the
  authority, they read and write the same value.
- **One detent, dragged down to dismiss.** The sheet has one resting height.
- **The page behind the sheet is blurred** (`expo-blur`, already a dependency).

Not in this pass: `Slider` stays `todo` in the inventory. Nothing here needs it.

## 1. Tier 1 — reading size steps

In `design/tokens/type.ts`, add the three sizes. Line height is already derived as
`round(fontSize * leading)` by `getReadingStyle`, so each step gets a matched leading for free —
do not tabulate line heights by hand.

```ts
export const readingSizes = {
  small: 17,
  default: 19,   // must equal readingConfig.baseSize
  large: 22,
} as const;

export type ReadingSizeName = keyof typeof readingSizes;
```

## 2. Tier 2 — reading size in context

New `ui/theme/ReadingSizeProvider.tsx` (it belongs beside the theme provider — both are
app-wide display state).

```ts
export type ReadingSizeContextValue = {
  size: ReadingSizeName;
  setSize: (size: ReadingSizeName) => void;
  step: (direction: 'up' | 'down') => void;  // clamped at the ends, returns silently at a limit
};

export function ReadingSizeProvider(props: {
  value: ReadingSizeName;
  onChange: (size: ReadingSizeName) => void;
  children: React.ReactNode;
}): JSX.Element;

export function useReadingSize(): ReadingSizeContextValue;
```

- The provider is **controlled** — it holds no state of its own. The root layout owns the value and
  its persistence; this only distributes it. That is what keeps a single source of truth between the
  pinch gesture and the sheet.
- `ReadingText` calls `useReadingSize()` and passes the resolved size into `getReadingStyle`. It must
  still work with no provider above it (the gallery renders it bare) — fall back to
  `readingConfig.baseSize`.
- Export both from `ui/theme/index.ts` and `ui/index.ts`.

## 3. Tier 2 — `ui/primitives/SegmentedControl.tsx`

```ts
export type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};
```

- A `Surface sunken` track with a raised indicator behind the selected label. The indicator moves
  with `withSpring` using `springs.default`; measure segment width with `onLayout` rather than
  assuming equal division from screen width.
- Labels use `Text variant="footnote" weight="medium"`; the selected label goes `weight="semibold"`,
  unselected `tone="secondary"`.
- Each segment is a `Pressable` with `feedback="none"` — the indicator moving *is* the feedback, and
  a scale or overlay on top of it reads as two responses to one tap.
- `Haptics.selectionAsync()` on a change that actually changes the value. This is a deliberate
  choice by the user, which is what the haptics policy means by consequential; do not fire it when
  the same segment is tapped again.
- Degrade under `useReducedMotion()`: cross-fade the indicator instead of sliding it.

## 4. Tier 2 — `ui/overlay/Sheet.tsx`

New directory `ui/overlay/`. This is the richest reusable component in the project — build it
properly.

```ts
export type SheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  testID?: string;
};
```

- Renders through React Native's `Modal` with `transparent` and `animationType="none"` — the
  animation is ours, not the platform's.
- Backdrop is a `BlurView` from `expo-blur`, tint following `theme.scheme`, animated from 0 to full
  intensity alongside the sheet. Tapping the backdrop dismisses.
- The sheet panel is a `Surface elevation={2}` with a large top radius, bottom-anchored, sized by its
  content — **no fixed height**. It must respect `useSafeAreaInsets().bottom` as extra bottom
  padding.
- A grab handle at the top: a short rounded bar in `theme.border.subtle`, centred.
- Entry and exit animate `translateY` with `springs.default`, from the panel's measured height.
- **Drag to dismiss must use velocity, not just distance.** A `Gesture.Pan()` on the panel tracks
  downward movement; on release, dismiss if the panel has travelled past a third of its height **or**
  if `event.velocityY` exceeds a flick threshold. Distance alone makes a fast flick feel ignored.
  Resist upward drags (multiply by 0.2) — there is nowhere above to go.
- Support the Android back button via `Modal`'s `onRequestClose`.
- Export from `ui/overlay/index.ts` and `ui/index.ts`.

## 5. Persistence — `storage/settings.ts`

```ts
export type AppSettings = {
  readingSize: ReadingSizeName;   // default 'default'
  themeMode: 'light' | 'dark' | 'system';  // default 'system'
};

export async function getSettings(): Promise<AppSettings>;
export async function saveSettings(settings: AppSettings): Promise<void>;
```

- One JSON file in the document directory, same shape as the other storage modules. Missing or
  malformed file returns the defaults — never throw.
- Serialise writes through a promise chain, exactly as `saveReadingPosition` does, so two rapid
  changes cannot interleave a read-modify-write.
- Export from `storage/index.ts`.

## 6. Wire it up — `app/_layout.tsx`

- Load settings alongside the fonts and **keep the splash screen up until both are ready**. A flash
  of the wrong theme or size on every launch is the whole reason to load before first paint.
- Hold `readingSize` and `themeMode` in state; pass `themeMode` to `ThemeProvider` as
  `themeOverride` (mapping `'system'` to `undefined`), and wrap the tree in `ReadingSizeProvider`.
- Every change writes through `saveSettings`.

## 7. Tier 3 — `features/reader/ReaderSettingsSheet.tsx`

```ts
export type ReaderSettingsSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  readingSize: ReadingSizeName;
  onChangeReadingSize: (size: ReadingSizeName) => void;
  themeMode: 'light' | 'dark' | 'system';
  onChangeThemeMode: (mode: 'light' | 'dark' | 'system') => void;
};
```

Two labelled rows inside a `Sheet`: `TEXT SIZE` with segments Small / Default / Large, and
`APPEARANCE` with Light / Dark / System. Labels are `Text variant="caption" tone="secondary"
weight="semibold"`, uppercased. Both rows are `SegmentedControl`. Nothing else in the sheet — no
title bar, no done button; the handle and drag-to-dismiss are the affordance.

## 8. Opening it, and the pinch gesture

- `ReaderChrome` gains an `onOpenSettings` prop and an `IconButton` at the trailing end of the bar,
  opposite the back chevron. Use the `text` glyph from `@expo/vector-icons` Ionicons
  (`"text-outline"`), which reads as "Aa".
- In `app/book/[id]/[chapter].tsx`, wrap `ChapterTransition` in a `GestureDetector` running a
  `Gesture.Pinch()`. Nested detectors are fine here — pinch needs two fingers and the chapter pan
  needs one, so they cannot both claim a gesture.
- **Apply the step as soon as a threshold is crossed, not on release.** Pinching out past a scale of
  1.15 steps up one size; pinching in below 0.87 steps down one. Latch after each step (track the
  scale at which the last step fired) so one continuous pinch can travel Small → Default → Large but
  cannot fire twice for the same movement. Fire `Haptics.selectionAsync()` on each step, and nothing
  at all when already at a limit.
- Three discrete steps mean at most two re-renders during a pinch, which is why this can be live at
  all. Do not make the size continuous.

## 9. Gallery — `app/_dev/gallery.tsx`

Add a section with `SegmentedControl` in a two-option and a three-option configuration, and a button
opening a `Sheet` containing sample rows, so both are exercisable outside the reader.

## 10. Do not change

The reading surface, chapter opening, chrome behaviour, `useAutoHide`, the end card, chapter paging
and its commit timing are all settled. Progress recording must keep working exactly as it does.

## Gates

- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** `expo-blur` is already a dependency —
  no installs are needed. If you find any other out-of-repo need, list it at the end of your
  response instead of acting on it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency. SDK 54 is a hard constraint.
