import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import type { Book } from '../../pdf/types';
import { PressableCard, Surface, Text, VStack } from '../../ui';
import { GeneratedCover } from './GeneratedCover';

export type BookCardProps = {
  book: Book;
  onPress?: (book: Book) => void;
  onLongPress?: (book: Book) => void;
  testID?: string;
};

export function BookCard({ book, onPress, onLongPress, testID }: BookCardProps) {
  const chapterCount = book.chapters ? book.chapters.length : 0;
  const chapterText = `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}`;
  const pageText = `${book.pageCount} ${book.pageCount === 1 ? 'page' : 'pages'}`;
  const metadataText = `${chapterText} · ${pageText}`;

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
