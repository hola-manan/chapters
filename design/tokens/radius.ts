/**
 * Border radius tokens.
 * Zero external imports.
 */

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;
