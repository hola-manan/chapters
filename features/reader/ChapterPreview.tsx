import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../../design';
import { displayTitle } from '../../pdf';
import type { Chapter } from '../../pdf/types';
import { ChapterOpening } from './ChapterOpening';
import { HeadingBlock } from './HeadingBlock';
import { ParagraphBlock } from './ParagraphBlock';

export type ChapterPreviewProps = {
  chapter: Chapter;
  chapterNumber: number;
  chapterCount: number;
  testID?: string;
};

export function ChapterPreview({
  chapter,
  chapterNumber,
  chapterCount,
  testID,
}: ChapterPreviewProps) {
  const insets = useSafeAreaInsets();
  const displayBlocks = chapter.blocks
    .filter((b) => b.type !== 'pagebreak')
    .slice(0, 12);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          paddingTop: insets.top + space.xxxl,
          paddingHorizontal: space.xxl,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.headerContainer}>
        <ChapterOpening
          title={displayTitle(chapter.title)}
          chapterNumber={chapterNumber}
          chapterCount={chapterCount}
        />
      </View>
      {displayBlocks.map((item, index) => {
        if (item.type === 'heading') {
          return <HeadingBlock key={`preview_heading_${index}`} text={item.text} level={item.level} />;
        }
        if (item.type === 'paragraph') {
          return <ParagraphBlock key={`preview_para_${index}`} text={item.text} />;
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  headerContainer: {
    marginBottom: space.lg,
  },
});
