import React from 'react';
import { Text as RNText } from 'react-native';
import { readingAccentType, readingConfig, readingFontFamily } from '../../design';
import { useTheme } from '../theme';

export type ReadingLeadProps = {
  children: string;
  testID?: string;
};

// Note: these are faux small caps. Source Serif 4's small-caps variant is not loaded,
// so this is uppercase at reduced size. True small caps would need an SC font file.
export function ReadingLead({ children, testID }: ReadingLeadProps) {
  const theme = useTheme();
  const fontSize = Math.round(readingConfig.baseSize * readingAccentType.leadScale);

  return (
    <RNText
      allowFontScaling={false}
      testID={testID}
      style={{
        fontSize,
        letterSpacing: readingAccentType.leadTracking,
        fontFamily: readingFontFamily.semibold,
        color: theme.text.primary,
      }}
    >
      {children.toUpperCase()}
    </RNText>
  );
}
