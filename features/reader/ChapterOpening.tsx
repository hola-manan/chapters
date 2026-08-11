import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import { Text, useTheme } from '../../ui';

export type ChapterOpeningProps = {
  title: string; // already passed through displayTitle()
  chapterNumber: number; // 1-based
  chapterCount: number;
  testID?: string;
};

// Settled on device: an eyebrow above the title, a hairline rule below it, and the body starting
// as ordinary prose. The drop cap and small-caps openings were built, compared and rejected —
// see docs/components.md #25.
export function ChapterOpening({ title, chapterNumber, chapterCount, testID }: ChapterOpeningProps) {
  const theme = useTheme();

  return (
    <View testID={testID}>
      <View style={styles.eyebrow}>
        <Text variant="caption" weight="semibold" tone="accent">
          {`CHAPTER ${chapterNumber} OF ${chapterCount}`}
        </Text>
      </View>

      <Text variant="title1" weight="semibold">
        {title}
      </Text>

      <View style={styles.rule}>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border.subtle }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginBottom: space.xs },
  rule: { marginTop: space.lg, marginBottom: space.lg },
});
