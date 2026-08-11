import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { space } from '../../design';
import type { Book } from '../../pdf/types';
import { Text, VStack } from '../../ui';
import { BookCard } from './BookCard';
import { ImportTile } from './ImportTile';

export type LibraryFeedProps = {
  books: Book[];
  progressMap?: Record<string, number>;
  onSelectBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onImportPress: () => void;
  isImporting?: boolean;
  importStage?: string;
  importPct?: number;
  headerComponent?: React.ReactNode;
  testID?: string;
};

export function LibraryFeed({
  books,
  progressMap,
  onSelectBook,
  onDeleteBook,
  onImportPress,
  isImporting = false,
  importStage,
  importPct,
  headerComponent,
  testID,
}: LibraryFeedProps) {
  const renderHeader = () => (
    <VStack gap="md">
      {headerComponent}
      <ImportTile
        onPress={onImportPress}
        isImporting={isImporting}
        stage={importStage}
        pct={importPct}
      />
    </VStack>
  );

  const renderEmpty = () => {
    if (isImporting) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" tone="secondary" align="center">
          Your library is empty. Import a PDF to start reading.
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      testID={testID}
      data={books}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      renderItem={({ item }) => (
        <BookCard
          book={item}
          progress={progressMap?.[item.id] ?? 0}
          onPress={onSelectBook}
          onLongPress={onDeleteBook}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: space.lg,
    gap: space.md,
  },
  emptyContainer: {
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
