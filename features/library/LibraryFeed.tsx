import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { space } from '../../design';
import type { Book } from '../../pdf/types';
import type { ImportState } from '../import';
import { EmptyState, VStack } from '../../ui';
import { BookCard } from './BookCard';
import { ImportProgressCard } from './ImportProgressCard';
import { ImportTile } from './ImportTile';

export type LibraryFeedProps = {
  books: Book[];
  progressMap?: Record<string, number>;
  onSelectBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onImportPress: () => void;
  importState?: ImportState;
  onDismissImportError?: () => void;
  headerComponent?: React.ReactNode;
  testID?: string;
};

export function LibraryFeed({
  books,
  progressMap,
  onSelectBook,
  onDeleteBook,
  onImportPress,
  importState,
  onDismissImportError,
  headerComponent,
  testID,
}: LibraryFeedProps) {
  const isImporting = importState?.status === 'importing';

  const renderHeader = () => (
    <VStack gap="md">
      {headerComponent}
      <ImportTile onPress={onImportPress} disabled={isImporting} />
      {importState?.status === 'importing' ? (
        <ImportProgressCard
          status="importing"
          fileName={importState.fileName}
          stage={importState.stage}
          pct={importState.pct}
        />
      ) : null}
      {importState?.status === 'error' ? (
        <ImportProgressCard
          status="error"
          fileName={importState.fileName}
          errorMessage={importState.message}
          onDismiss={onDismissImportError}
        />
      ) : null}
    </VStack>
  );

  const renderEmpty = () => {
    if (importState && (importState.status === 'importing' || importState.status === 'error')) {
      return null;
    }
    return (
      <EmptyState
        title="Nothing here yet."
        message="Chapters turns a PDF into a handful of short reads."
      />
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
});
