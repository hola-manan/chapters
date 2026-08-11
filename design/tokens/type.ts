/**
 * Typography tokens: UI and Reading are independent scales.
 * Zero external imports.
 */

// Font families
export const readingFontFamily = {
  regular: 'SourceSerif4_400Regular',
  semibold: 'SourceSerif4_600SemiBold',
} as const;

export const uiFontFamily = {
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
} as const;

// UI Typography Scale (fixed ramp for chrome, labels, and titles)
export interface UITypeStep {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export const uiType = {
  caption: { fontSize: 11, lineHeight: 14, letterSpacing: 0.1 },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  title2: { fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
} as const satisfies Record<string, UITypeStep>;

// Reading Typography Scale
export interface ReadingTypeConfig {
  baseSize: number;
  leading: number;
  scale: number;
}

export const readingConfig: ReadingTypeConfig = {
  baseSize: 19,
  leading: 1.45,
  scale: 1.0,
};

/**
 * Derives reading typography styles dynamically.
 * Line height is derived as round(size * leading).
 */
export function getReadingStyle(
  scale: number = readingConfig.scale,
  baseSize: number = readingConfig.baseSize,
  leading: number = readingConfig.leading
) {
  const fontSize = Math.round(baseSize * scale);
  const lineHeight = Math.round(fontSize * leading);
  return {
    fontSize,
    lineHeight,
    fontFamily: readingFontFamily.regular,
  };
}

export const readingType = {
  baseSize: readingConfig.baseSize,
  leading: readingConfig.leading,
  scale: readingConfig.scale,
  fontFamily: readingFontFamily,
  getStyle: getReadingStyle,
} as const;

// Multiples of the reading base size, for opening treatments.
export const readingAccentType = {
  initialScale: 3.2,     // raised initial: 19 * 3.2 ≈ 61pt
  leadScale: 0.82,       // small-caps lead words, before uppercasing
  leadTracking: 0.8,     // letterspacing for uppercased lead words
} as const;

