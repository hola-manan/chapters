/**
 * Shadow tokens (plain data, not platform style objects).
 * Leans on hairlines and lightness rather than elevation.
 * Zero external imports.
 */

export interface ShadowToken {
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

export const shadow = {
  none: { offsetX: 0, offsetY: 0, blur: 0, opacity: 0 },
  sm: { offsetX: 0, offsetY: 1, blur: 3, opacity: 0.06 },
  md: { offsetX: 0, offsetY: 4, blur: 12, opacity: 0.08 },
  lg: { offsetX: 0, offsetY: 8, blur: 24, opacity: 0.12 },
} as const satisfies Record<string, ShadowToken>;
