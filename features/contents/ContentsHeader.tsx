import React from 'react';
import { View } from 'react-native';
import { radius, space } from '../../design';
import type { Book } from '../../pdf/types';
import { HStack, Surface, Text, useTheme, VStack } from '../../ui';
import { readMinutes } from '../readingTime';

// Static header for now. Scroll collapse will be added when CollapsingHeader (#15) is built.

export type ContentsHeaderProps = {
  book: Book;
  progress: number; // 0..1
  testID?: string;
};

export function ContentsHeader({ book, progress, testID }: ContentsHeaderProps) {
  const theme = useTheme();

  const totalWords = book.chapters
    ? book.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
    : 0;
  const totalReadTimeMinutes = readMinutes(totalWords);
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <View testID={testID} style={{ paddingTop: space.xl, paddingBottom: space.md }}>
      <VStack gap="md">
        <Text variant="title1" weight="semibold">
          {book.title}
        </Text>

        <VStack gap="xs">
          <HStack align="center" justify="between">
            <Text variant="subhead" tone="secondary">
              {totalReadTimeMinutes} min total read
            </Text>
            <Text variant="subhead" tone="secondary">
              {pct}% read
            </Text>
          </HStack>

          <Surface sunken radius="pill">
            <View style={{ height: space.xs, borderRadius: radius.pill, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: theme.accent.base,
                  borderRadius: radius.pill,
                }}
              />
            </View>
          </Surface>
        </VStack>
      </VStack>
    </View>
  );
}
