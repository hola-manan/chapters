import React from 'react';
import { Text as RNText, useWindowDimensions } from 'react-native';
import { uiFontFamily, uiType } from '../../design';
import { useTheme } from '../theme';

// React Native scales fontSize for Dynamic Type but leaves an explicitly set
// lineHeight alone, so at large accessibility sizes lines crowd and overlap.
// lineHeight is therefore scaled by the same capped factor, keeping the
// size-to-leading ratio constant at every text size.
const MAX_FONT_SCALE = 1.35;

export type TextProps = {
  variant?: 'caption' | 'footnote' | 'subhead' | 'body' | 'title3' | 'title2' | 'title1';
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent';
  weight?: 'regular' | 'medium' | 'semibold';
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  flex?: boolean;
  children: React.ReactNode;
  accessibilityRole?: 'header' | 'text' | 'link';
  accessibilityLabel?: string;
  testID?: string;
};

const WEIGHT_MAP = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export function Text({
  variant = 'body',
  tone = 'primary',
  weight = 'regular',
  align = 'left',
  numberOfLines,
  flex,
  children,
  accessibilityRole,
  accessibilityLabel,
  testID,
}: TextProps) {
  const theme = useTheme();
  const typeStep = uiType[variant];
  const color = tone === 'accent' ? theme.accent.base : theme.text[tone];
  // useWindowDimensions is reactive — it re-renders when the OS text size changes,
  // which PixelRatio.getFontScale() would not do.
  const { fontScale } = useWindowDimensions();
  const cappedScale = Math.min(fontScale, MAX_FONT_SCALE);

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{
        fontSize: typeStep.fontSize,
        lineHeight: Math.round(typeStep.lineHeight * cappedScale),
        letterSpacing: typeStep.letterSpacing,
        color,
        fontWeight: WEIGHT_MAP[weight],
        fontFamily: uiFontFamily[weight],
        textAlign: align,
        ...(flex ? { flex: 1 } : undefined),
      }}
    >
      {children}
    </RNText>
  );
}
