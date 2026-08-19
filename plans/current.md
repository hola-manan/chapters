# App identity — icon, launch screen, name, bundle identifier

Read `GEMINI.md` first. No hardcoded colours, sizes, radii or durations in `ui/`, `features/` or
`app/` — there are tests enforcing it. (The icon generator in `scripts/` is outside those layers and
is exempt; it is a build tool, not app code.)

**The design decisions below were made by the human and are not open.** Implement them exactly.

Decided:

- **Mark: stacked rules** — four horizontal bars, two pairs, alternating full and short.
- **Ground: forest, mark in paper.** Ground `#142621`, mark `#F7F8FA`.
- **Launch screen: the mark, centred**, on the page colour, with light and dark variants.
- Display name **`Chapters`**, bundle identifier **`com.manansingal.chapters`**.

## 1. The mark — exact geometry

Defined in a 100×100 field and scaled to whatever size is being written. **These numbers are the
ones that were judged at real size on device — do not adjust them.** All bars have a corner radius
of 3 in the same units.

| Bar | x | y | width | height | opacity |
|---|---|---|---|---|---|
| 1 | 20 | 28 | 60 | 6 | 1.0 |
| 2 | 20 | 40 | 44 | 6 | 0.75 |
| 3 | 20 | 58 | 60 | 6 | 1.0 |
| 4 | 20 | 70 | 32 | 6 | 0.75 |

The 12-unit gap inside each pair and the 18-unit gap between pairs are what make it read as two
blocks of text rather than four loose lines. Keep both.

## 2. `scripts/generate-icons.mjs` — a committed generator, not mystery binaries

There is no image tooling on this machine and `sharp` is not installed. **Write a dependency-free
Node script** that rasterises the mark and writes real PNGs using only built-in modules
(`node:zlib`, `node:fs`).

Requirements:

- Draw into an RGBA pixel buffer: fill the ground, then composite each rounded bar over it with its
  opacity. Rounded corners come from a rounded-rectangle coverage test.
- **Anti-alias by supersampling** — render at 4× the target and box-filter down. Without it the bar
  ends and corners will be visibly jagged at 1024px.
- Encode PNG by hand: signature, `IHDR` (8-bit RGBA, colour type 6), `IDAT` of zlib-deflated
  scanlines each prefixed with filter byte 0, then `IEND`. CRC32 per chunk.
- Support a transparent ground (alpha 0) for the variants that need one.
- Expose it as an npm script: `"icons": "node scripts/generate-icons.mjs"`.

Files it must write, all into `assets/images/`:

| File | Size | Ground | Mark |
|---|---|---|---|
| `icon.png` | 1024 | `#142621` | `#F7F8FA` |
| `icon-dark.png` | 1024 | `#0C1412` | `#F7F8FA` |
| `icon-tinted.png` | 1024 | `#1C1C1C` | `#EDEDED` |
| `android-icon-foreground.png` | 1024 | transparent | `#F7F8FA` |
| `android-icon-background.png` | 1024 | `#142621` | — (ground only, no bars) |
| `android-icon-monochrome.png` | 1024 | transparent | `#FFFFFF` |
| `splash-icon.png` | 512 | transparent | `#142621` |
| `splash-icon-dark.png` | 512 | transparent | `#F7F8FA` |
| `favicon.png` | 48 | `#142621` | `#F7F8FA` |

Notes on two of them. The **tinted** variant is greyscale by design — iOS applies its own tint to it,
so shipping colour there produces a muddy result. The **Android foreground** must keep the mark
well inside the safe area; Android masks adaptive icons aggressively, so inset the whole 100-unit
field to about 72% of the canvas and centre it.

## 3. `app.json`

- `name`: `Chapters` (slug stays `chapters` — changing it would orphan the EAS project).
- `ios.bundleIdentifier`: `com.manansingal.chapters`.
- `ios.icon` becomes the object form so iOS 18 gets all three variants:
  `{ "light": "./assets/images/icon.png", "dark": "./assets/images/icon-dark.png", "tinted": "./assets/images/icon-tinted.png" }`.
  Keep the top-level `icon` pointing at `icon.png` as the fallback.
- `android.adaptiveIcon.backgroundColor`: `#142621`.
- `expo-splash-screen` plugin config: `image` `./assets/images/splash-icon.png`, `imageWidth` 160,
  `resizeMode` `contain`, `backgroundColor` `#F7F8FA`, and a `dark` block with
  `image` `./assets/images/splash-icon-dark.png` and `backgroundColor` `#0C1412`.

The splash colours are the app's real page colours in each theme, so the launch screen and the first
frame of the app are the same ground.

## 4. Delete the scaffolding

Remove `assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png` and
`partial-react-logo.png`. **Grep the whole repo for each filename before deleting** and fix any
import you find — they came from the `create-expo-app` template and should have no callers, but
verify rather than assume.

## 5. Test — `test/icons.test.ts`

One test, guarding the hand-written PNG encoder, which is the only part of this that can fail
silently:

- Read `assets/images/icon.png`, assert the 8-byte PNG signature, then parse the `IHDR` chunk and
  assert width 1024, height 1024, bit depth 8 and colour type 6.
- Do the same for `splash-icon.png` at 512.

If the encoder produces a corrupt file, the build will fail with something unhelpful much later;
this catches it here.

## 6. Do not change

Anything under `app/`, `features/`, `ui/`, `design/`, `pdf/` or `storage/`. This pass touches only
`assets/`, `scripts/`, `app.json`, `package.json` and `test/`.

## Gates

- `npm run icons` — must produce every file in the table above.
- `npx tsc --noEmit`
- `npm run lint`
- `node --test --experimental-strip-types test/pdf.test.ts test/design.test.ts test/icons.test.ts`

## Constraints

- **Do not touch anything outside this project directory.** No package installs — the generator must
  work with Node built-ins alone. If you believe a dependency is unavoidable, stop and say so at the
  end of your response instead of installing it.
- **Do not commit.** Leave the tree dirty for review.
- `pdfs/` is read-only.
- Do not upgrade Expo, React Native or any pinned dependency. SDK 54 is a hard constraint.
