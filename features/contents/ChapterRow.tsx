import React from 'react';
import { View } from 'react-native';
import { space } from '../../design';
import { displayTitle } from '../../pdf';
import type { Chapter } from '../../pdf/types';
import { chapterState } from '../../storage';
import { HStack, PressableCard, Surface, Text } from '../../ui';
import { readMinutes } from '../readingTime';

export type ChapterRowProps = {
  chapter: Chapter;
  progress: number;
  isResumeTarget: boolean;
  showSerialNumber?: boolean;
  index: number;
  onPress: () => void;
  testID?: string;
};

export function ChapterRow({
  chapter,
  progress,
  isResumeTarget,
  showSerialNumber = false,
  index,
  onPress,
  testID,
}: ChapterRowProps) {
  const minutes = readMinutes(chapter.wordCount);
  const state = chapterState(progress);
  const titleText = displayTitle(chapter.title);

  return (
    <PressableCard radius="lg" onPress={onPress} testID={testID}>
      <Surface elevation={1} border radius="lg" paddingX="lg" paddingY="md">
        <HStack align="center" gap="md">
          {showSerialNumber && (
            <View style={{ width: space.xl, alignItems: 'flex-start' }}>
              <Text variant="footnote" tone="secondary">
                {index + 1}
              </Text>
            </View>
          )}

          <Text variant="body" tone="primary" numberOfLines={2} flex>
            {titleText}
          </Text>

          <HStack align="center" gap="xs">
            <Text variant="footnote" tone="secondary">
              {minutes} min
            </Text>

            {isResumeTarget ? (
              <Text variant="footnote" tone="accent">
                • Resume
              </Text>
            ) : state === 'in_progress' ? (
              <Text variant="footnote" tone="secondary">
                {Math.round(progress * 100)}%
              </Text>
            ) : state === 'done' ? (
              <Text variant="footnote" tone="secondary">
                Done
              </Text>
            ) : null}
          </HStack>
        </HStack>
      </Surface>
    </PressableCard>
  );
}

