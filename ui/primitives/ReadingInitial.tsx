import React from 'react';
import { Text as RNText } from 'react-native';
import { readingAccentType, readingConfig, readingFontFamily } from '../../design';
import { useTheme } from '../theme';

export type ReadingInitialProps = {
  children: string; // one character
  testID?: string;
};

// Known limitation: React Native has no float, so text cannot wrap around a true drop cap.
// Nor can this be nested inside a ReadingText to get a raised initial: ReadingText sets an explicit
// lineHeight, which iOS maps to both the minimum and maximum line height, so a glyph several times
// the body size is clamped to the body line box and clipped. Place it in its own column beside the
// paragraph instead. Do not attempt to fake a true drop cap with absolute positioning or padded
// spaces — it breaks the moment the reading size changes.
export function ReadingInitial({ children, testID }: ReadingInitialProps) {
  const theme = useTheme();
  const fontSize = Math.round(readingConfig.baseSize * readingAccentType.initialScale);

  return (
    <RNText
      allowFontScaling={false}
      testID={testID}
      style={{
        fontSize,
        // Tight to the glyph, so the paragraph beside it starts near the initial's cap height
        // instead of below a line box padded out by the font's default leading.
        lineHeight: fontSize,
        fontFamily: readingFontFamily.semibold,
        color: theme.text.primary,
      }}
    >
      {children}
    </RNText>
  );
}
