import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import type { Book } from '../../pdf/types';
import { PressableCard, Surface, Text, VStack } from '../../ui';
import { GeneratedCover } from './GeneratedCover';

import { readMinutes } from '../readingTime';

export type BookCardProps = {
  book: Book;
  progress?: number;
  onPress?: (book: Book) => void;
  onLongPress?: (book: Book) => void;
  testID?: string;
};

export function BookCard({ book, progress = 0, onPress, onLongPress, testID }: BookCardProps) {
  const totalWords = book.chapters
    ? book.chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0)
    : 0;
  const totalMinutes = readMinutes(totalWords);
  const readTimeText = `${totalMinutes} min read`;

  return (
    <PressableCard
      radius="lg"
      onPress={onPress ? () => onPress(book) : undefined}
      onLongPress={onLongPress ? () => onLongPress(book) : undefined}
      testID={testID}
    >
      <Surface elevation={1} border radius="lg">
        <VStack gap="none">
          <GeneratedCover
            seed={book.id || book.title}
            radius="none"
            progress={progress}
            readTimeText={readTimeText}
          />
          <View style={styles.textContainer}>
            <Text variant="title3" weight="semibold" numberOfLines={2}>
              {book.title}
            </Text>
          </View>
        </VStack>
      </Surface>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
});

