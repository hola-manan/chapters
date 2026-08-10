/**
 * Primitive color tokens.
 * Raw palette only, no semantics. Named by what the color IS.
 * Zero package imports.
 */

export const forest = {
  900: '#142621', // Dark forest ink
  700: '#2A443C',
  600: '#5C7169', // Muted ink (light)
  500: '#46685D',
  400: '#889A92', // Tertiary ink (light)
  300: '#75998D',
  200: '#C5D0CB', // Strong border (light)
  100: '#E2E7E4', // Subtle border (light)
  50: '#EEF4F1', // Pale forest tint
} as const;

export const neutrals = {
  paper: '#F7F8FA', // Cool paper off-white
  50: '#F7F8FA',
  100: '#EFF1F5',
  200: '#E1E4EA',
  300: '#CCD1DB',
  500: '#8A92A0',
  700: '#4A5160',
  900: '#1A1D24',
} as const;

export const teal = {
  base: '#0F766E', // Base accent
  pressed: '#0D5F58', // Darker pressed step
  light: '#14B8A6', // Raised lightness step (for dark theme legibility)
  tint: '#E6F4F1', // Pale wash for selection / track fills
} as const;

export const darkGround = {
  900: '#0C1412', // Near-black ground with faint green cast
  800: '#14211D', // Slightly elevated dark surface
  700: '#1C2E29',
  sunken: '#070C0A', // Sunken ground
} as const;

export const darkInk = {
  primary: '#ECEFEA', // Inverted ink (pale warm-neutral, not pure white)
  secondary: '#92A59C', // Muted pale ink
  tertiary: '#5E7169', // Faintest legible step
} as const;

export const overlay = {
  lightPress: 'rgba(20, 38, 33, 0.06)',
  darkPress: 'rgba(236, 239, 234, 0.08)',
  darkBorderSubtle: 'rgba(236, 239, 234, 0.10)',
  darkBorderStrong: 'rgba(236, 239, 234, 0.20)',
  darkAccentTint: 'rgba(20, 184, 166, 0.15)',
} as const;

export const pure = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const color = {
  forest,
  neutrals,
  teal,
  darkGround,
  darkInk,
  overlay,
  pure,
} as const;
