import React from 'react';
import { View } from 'react-native';
import { space } from '../../design';
import type { Book } from '../../pdf/types';
import { Text, VStack } from '../../ui';
import { readMinutes } from '../readingTime';

// Static header for now. Scroll collapse will be added when CollapsingHeader (#15) is built.

export type ContentsHeaderProps = {
  book: Book;
  progress?: number;
  testID?: string;
};

export function ContentsHeader({ book, testID }: ContentsHeaderProps) {
  const totalWords = book.chapters
    ? book.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
    : 0;
  const totalReadTimeMinutes = readMinutes(totalWords);

  return (
    <View testID={testID} style={{ paddingTop: space.xl, paddingBottom: space.md }}>
      <VStack gap="xs">
        <Text variant="title1" weight="semibold">
          {book.title}
        </Text>
        <Text variant="subhead" tone="secondary">
          {totalReadTimeMinutes} min total read
        </Text>
      </VStack>
    </View>
  );
}

