/**
 * Spacing tokens (4-based scale).
 * Zero external imports.
 */

export const space = {
  2: 2,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,

  // Semantic aliases
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  minTouchTarget: 44,
  paragraphGap: 16,   // space between paragraphs in the reading surface
} as const;

export type SpaceValue = (typeof space)[keyof typeof space];
