// Ionicons are drawn to fill their square, so an icon set to the same point size as the text
// beside it reads as larger. These are the optically corrected sizes, not the type sizes.
export const iconSizes = {
  // Beside text — one per UI type variant that actually pairs with an icon.
  caption: 12,
  footnote: 14,
  subhead: 16,
  body: 18,
  title3: 20,
  // Standalone — no text to match.
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type IconSizeName = keyof typeof iconSizes;
