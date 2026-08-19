# Chapters

A reading app that turns a PDF into a set of clean, short chapter reads.

Instead of displaying fixed PDF page images, Chapters detects chapter boundaries and re-typesets the text into the app's own typographic system.

## Platforms

- **iOS**: Run through Expo Go on iOS.
- **Web / PWA**: Installable Progressive Web App with offline support.
- **Live PWA**: [https://hola-manan.github.io/chapters/](https://hola-manan.github.io/chapters/)

## Architecture & Documentation

The codebase is organized into three strictly decoupled tiers to keep design tokens and UI components portable:

- **Tier 1 (`design/`)**: Portable design tokens (colors, typography, spacing, motion, radius, shadow) with zero framework dependencies.
- **Tier 2 (`ui/`)**: Reusable React Native components that consume only `design/` tokens.
- **Tier 3 (`features/` & `app/`)**: Application routes and feature logic.

For more details:
- [docs/components.md](docs/components.md) — Component inventory and design decisions.
- [docs/library.md](docs/library.md) — API reference and guidelines for reusing `design/` and `ui/`.
- [docs/corpus-findings.md](docs/corpus-findings.md) — Measurements and heuristics for PDF parsing.