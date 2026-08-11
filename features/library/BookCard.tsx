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
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const progressText = pct > 0 ? `${pct}% read` : 'Unread';
  const metadataText = `${progressText} · ${readTimeText}`;

  return (
    <PressableCard
      radius="lg"
      onPress={onPress ? () => onPress(book) : undefined}
      onLongPress={onLongPress ? () => onLongPress(book) : undefined}
      testID={testID}
    >
      <Surface elevation={1} border>
        <VStack gap="none">
          <GeneratedCover seed={book.id || book.title} radius="none" />
          <View style={styles.textContainer}>
            <VStack gap="xs">
              <Text variant="title3" weight="semibold" numberOfLines={2}>
                {book.title}
              </Text>
              <Text variant="footnote" tone="secondary">
                {metadataText}
              </Text>
            </VStack>
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
