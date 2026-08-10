import React from 'react';
import { Text as RNText } from 'react-native';
import { getReadingStyle, readingFontFamily } from '../../design';
import { useTheme } from '../theme';

export type ReadingTextProps = {
  tone?: 'primary' | 'secondary';
  align?: 'left' | 'center';
  numberOfLines?: number;
  children: React.ReactNode;
  testID?: string;
};

export function ReadingText({
  tone = 'primary',
  align = 'left',
  numberOfLines,
  children,
  testID,
}: ReadingTextProps) {
  const theme = useTheme();
  const readingStyle = getReadingStyle();

  return (
    <RNText
      // allowFontScaling is false because an in-app reader size control is coming,
      // and honouring OS scaling as well would multiply the two size controls.
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      testID={testID}
      style={{
        fontSize: readingStyle.fontSize,
        lineHeight: readingStyle.lineHeight,
        fontFamily: readingFontFamily.regular,
        color: theme.text[tone],
        textAlign: align,
      }}
    >
      {children}
    </RNText>
  );
}
