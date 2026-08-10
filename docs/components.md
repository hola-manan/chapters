# Component inventory

The working list for the component passes. Ordered by dependency — earlier entries are used by
later ones. Each component gets its own pass: **brief → you decide → implement → look on device
→ iterate**. Nothing here is designed in advance.

**Status legend:** `todo` · `brief written` · `decided` · `built` · `settled`

## How a pass works

1. **Brief.** What the component must do, every state it has, the real content it will hold
   (pulled from the actual books in `pdfs/`), its constraints, and the genuine decision points
   with tradeoffs. No implementation, no pre-chosen default.
2. **You decide.** The design direction is yours.
3. **Implement.** Built in `app/_dev/gallery.tsx` first, then wired into the app.
4. **Iterate** against your eye on the device.

Decisions get recorded under each component as they land, so the reasoning survives.

---

## Tier 1 — `design/` (portable anywhere: web, native, any framework)

Not components. Settled in the design-direction session before any component pass, because
per-component decisions cannot cohere without them.

| Token set | Status | Notes |
|---|---|---|
| `color` + themes | **decided** | Cool paper `#F7F8FA`, forest ink `#142621`, muted `#5C7169`, teal accent `#0F766E`. Dark theme derived, not yet reviewed on device. |
| `type` — UI and reading scales, independent | **decided** | Source Serif 4 for reading at 19pt / 1.45 leading; system SF Pro for UI. Reading line height derived, never tabulated. |
| `space` | **decided** | 4-based scale. |
| `motion` — durations, easings, springs | **decided** | Springy and physical; springs are the primary vocabulary, durations only for opacity. |
| `radius`, `shadow` | **decided** | Minimal; the design leans on hairlines and lightness rather than elevation. |

---

## Tier 2 — `ui/` (reusable in any React Native app)

| # | Component | Status | The interesting problem in it |
|---|---|---|---|
| 1 | `Text` + `ReadingText` | **built** | Decided: two separate components rather than one with a variant, because `reading` obeys a different contract (it rescales, UI type doesn't) and one prop name would have hidden two behaviours. Colour is a closed `tone` prop — an arbitrary colour is unrepresentable. Split scaling policy: `Text` honours Dynamic Type capped at 1.35, `ReadingText` sets `allowFontScaling={false}` so the coming in-app size control is the only lever and the two never multiply. No `style` prop; spacing belongs to the parent, with `align`, `numberOfLines` and `flex` as the only escape valves. |
| 2 | `VStack` + `HStack` | **built** | Decided: two separate components (`VStack` & `HStack`) rather than one with a `direction` prop. Spacing belongs to layout primitives. Gap is a closed named vocabulary (`xxs` through `xxxl`) mapping to `space` tokens. The `dividers` boolean prop filters valid children before interleaving hairline separators. No `style` prop or rest spreading. |
| 3 | `Surface` | **built** | Decided: owns background, padding, radius and border — the container primitive, so no call site needs a bare View. Depth is **flat by default**: elevation 0 and 1 use colour and hairline only in both themes, and only elevation 2 (sheets, toasts) shows depth, because those are the sole components that genuinely float over content. Elevation is numeric (0/1/2) with `sunken` deliberately outside the ladder. Dark mode needs no branch: `theme.shadow.color` is transparent there and `surface.floating` is *lighter* than raised, so one code path serves both themes. Light shadows are tinted toward forest ink — a neutral shadow reads muddy on cool paper. |
| 4 | `Pressable` | todo | Press feedback: scale, opacity, timing, haptics. The most-reused component you will ever write. |
| 5 | `Icon` | todo | Icon sizing and optical alignment against text. |
| 6 | `Divider` | **provisional — pass still owed** | A minimal full-bleed hairline exists only to unblock `VStack`/`HStack`'s `dividers` prop. It uses `minWidth`/`minHeight` at hairline plus `alignSelf: 'stretch'`, so it renders horizontally in a `VStack` and vertically in an `HStack` with no orientation prop. **Inset and weight are undecided** — that is the real pass, and it should be run against a real chapter list, since separator inset governs list rhythm more than row height does. |
| 7 | `Button` | todo | Hierarchy: primary / secondary / quiet, and how much a two-action app really needs. |
| 8 | `Slider` | todo | Custom gesture handling on the UI thread. Powers the reader's live typography controls. |
| 9 | `SegmentedControl` | todo | Theme and font pickers. Selection motion. |
| 10 | `Sheet` | todo | Bottom sheet: drag, detents, backdrop, dismissal. The richest gesture work in the project. |
| 11 | `Skeleton` | todo | Loading shimmer. What a placeholder should imply about incoming content. |
| 12 | `Progress` | todo | Ring and bar. Serves both import progress and reading progress. |
| 13 | `EmptyState` | todo | Composition, illustration, tone of voice. |
| 14 | `Toast` | todo | Transient feedback: entry, dwell, exit, stacking. |
| 15 | `CollapsingHeader` | todo | Scroll-linked interpolation done properly on the UI thread. |

## Tier 3 — `features/` (this app only)

| # | Component | Status | The interesting problem in it |
|---|---|---|---|
| 16 | `GeneratedCover` | todo | Covers are generated, not extracted — deterministic gradient plus title in the reading face, hashed from the title. Sidesteps PDF thumbnailing and gives a generative-design surface. |
| 17 | `BookCard` | todo | Cover / title / meta hierarchy at small size. Where a grid lives or dies. |
| 18 | `LibraryGrid` | todo | Grid rhythm, column count, gutters, scroll padding. |
| 19 | `ImportTile` | todo | The primary action, placed in the content flow rather than floating over it. |
| 20 | `ImportProgressCard` | todo | The parse wait as a designed moment: optimistic insert, live stages, skeleton filling in. |
| 21 | ~~`UnreadableBookState`~~ | **cut** | Decided 2026-08-10: unreadable PDFs are rejected at import with an error, never added to the library. So there is no unreadable state to design, no empty reader, and no per-book branching downstream. The rejection message lives in the import flow (#20). |
| 22 | `ContentsHeader` | todo | Book title block and its collapse into the nav bar. |
| 23 | `ChapterRow` | todo | Number, title, progress, length. List rhythm against real chapter titles — some are very long (see Joke Writing's "Chapter Five (PRACTICAL): Double Joke-webs & The Hadron Joke Collider"). |
| 24 | `ParagraphBlock` | todo | **The most important component in the app.** Measure, line height derived from measure, paragraph spacing vs indentation, widow handling. |
| 25 | `HeadingBlock` | todo | Chapter openers: scale, space above vs below, optical alignment. |
| 26 | `PageBreakMarker` | todo | Whether the source pagination should be visible at all — a real design question, not a given. |
| 27 | `ReaderChrome` | todo | Auto-hide on scroll down, return on scroll up, centre-tap toggle. Genuinely instructive gesture state. |
| 28 | `ReaderProgressBar` | todo | Progress within chapter vs within book — which one actually helps a reader. |
| 29 | `ReaderSettingsSheet` | todo | Live typography controls; changes apply underneath the sheet as you drag, so it doubles as the playground. |
| 30 | `ChapterTransition` | todo | Horizontal swipe between chapters with a haptic tick at boundaries. |
| 31 | `ChapterEndCard` | todo | End of chapter — arrival, and the invitation to continue. |
