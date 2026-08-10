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
  xl: 20,
  xxl: 24,
  step32: 32,
  step40: 40,
  step48: 48,
  step64: 64,
} as const;

export type SpaceValue = (typeof space)[keyof typeof space];
