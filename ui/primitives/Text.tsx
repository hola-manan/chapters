import React from 'react';
import { Text as RNText } from 'react-native';
import { uiFontFamily, uiType } from '../../design';
import { useTheme } from '../theme';

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

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.35}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{
        fontSize: typeStep.fontSize,
        lineHeight: typeStep.lineHeight,
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
