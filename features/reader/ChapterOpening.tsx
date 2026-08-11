import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import { ReadingInitial, ReadingLead, ReadingText, Text, useTheme } from '../../ui';

export type OpeningTreatment = 'eyebrow' | 'plain' | 'initial' | 'smallcaps';

export type ChapterOpeningProps = {
  title: string; // already passed through displayTitle()
  chapterNumber: number; // 1-based
  chapterCount: number;
  treatment: OpeningTreatment;
  firstParagraph?: string; // needed by 'initial' and 'smallcaps'
  testID?: string;
};

export function ChapterOpening({
  title,
  chapterNumber,
  chapterCount,
  treatment,
  firstParagraph,
  testID,
}: ChapterOpeningProps) {
  const theme = useTheme();

  const renderFirstParagraph = () => {
    if (!firstParagraph) return null;

    if (treatment === 'initial') {
      const firstChar = firstParagraph.charAt(0);
      const restOfParagraph = firstParagraph.slice(1);

      // A paragraph opening on a quotation mark or a numeral would put that glyph on the
      // initial, which reads as a mistake. Fall back to an untreated paragraph instead.
      if (!/\p{L}/u.test(firstChar)) {
        return (
          <View style={{ marginBottom: space.paragraphGap }}>
            <ReadingText>{firstParagraph}</ReadingText>
          </View>
        );
      }

      // The initial sits in its own column rather than nested inside the ReadingText.
      // ReadingText sets an explicit lineHeight, which React Native maps to both the minimum
      // and maximum line height on iOS — a nested glyph several times the body size would be
      // clamped to the body line box and clipped. A separate column cannot be clipped, at the
      // cost of indenting the whole paragraph rather than only its first lines.
      return (
        <View style={{ flexDirection: 'row', marginBottom: space.paragraphGap }}>
          <View style={{ marginRight: space.sm }}>
            <ReadingInitial>{firstChar}</ReadingInitial>
          </View>
          <View style={{ flex: 1 }}>
            <ReadingText>{restOfParagraph.replace(/^\s+/, '')}</ReadingText>
          </View>
        </View>
      );
    }

    if (treatment === 'smallcaps') {
      const words = firstParagraph.trim().split(/\s+/);
      if (words.length <= 4) {
        return (
          <View style={{ marginBottom: space.paragraphGap }}>
            <ReadingText>{firstParagraph}</ReadingText>
          </View>
        );
      }

      const leadText = words.slice(0, 4).join(' ');
      const restText = ' ' + words.slice(4).join(' ');

      return (
        <View style={{ marginBottom: space.paragraphGap }}>
          <ReadingText>
            <ReadingLead>{leadText}</ReadingLead>
            {restText}
          </ReadingText>
        </View>
      );
    }

    return null;
  };

  const eyebrowText = `CHAPTER ${chapterNumber} OF ${chapterCount}`.toUpperCase();

  return (
    <View testID={testID}>
      {treatment === 'eyebrow' && (
        <View style={{ marginBottom: space.xs }}>
          <Text variant="caption" weight="semibold" tone="accent">
            {eyebrowText}
          </Text>
        </View>
      )}

      <Text variant="title1" weight="semibold">
        {title}
      </Text>

      {treatment === 'eyebrow' ? (
        <View style={{ marginTop: space.lg, marginBottom: space.lg }}>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border.subtle }} />
        </View>
      ) : (
        <View style={{ height: space.xxl }} />
      )}

      {renderFirstParagraph()}
    </View>
  );
}
