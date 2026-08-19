import * as Haptics from 'expo-haptics';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { space } from '../design';
import { LibraryFeed, useImport } from '../features';
import type { Book } from '../pdf/types';
import { computeBookProgress, getBookPrefs, listBooks, removeBook } from '../storage';
import { Text, useTheme } from '../ui';

export default function LibraryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const { state: importState, startImport, dismissError, lastCompletedAt } = useImport();

  const loadLibrary = async () => {
    const list = await listBooks();
    setBooks(list);

    const pMap: Record<string, number> = {};
    for (const b of list) {
      const prefs = await getBookPrefs(b.id);
      pMap[b.id] = computeBookProgress(b, prefs);
    }
    setProgressMap(pMap);
  };

  useEffect(() => {
    loadLibrary();
  }, [lastCompletedAt]);

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const handleDeleteBook = (book: Book) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics unavailable on platform
    }

    Alert.alert(
      `Delete “${book.title}”?`,
      'This book will be removed from your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeBook(book.id);
            await loadLibrary();
          },
        },
      ]
    );
  };

  const header = (
    <View style={styles.headerRow}>
      <Text variant="title1" weight="semibold" flex>
        Library
      </Text>
      <Link href="/_dev/gallery">
        <Text variant="caption" tone="tertiary">
          Dev Gallery
        </Text>
      </Link>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <LibraryFeed
        books={books}
        progressMap={progressMap}
        onSelectBook={(book) =>
          router.push({
            pathname: '/book/[id]',
            params: { id: book.id, title: book.title },
          })
        }
        onDeleteBook={handleDeleteBook}
        onImportPress={startImport}
        importState={importState}
        onDismissImportError={dismissError}
        headerComponent={header}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: space.xl,
    paddingBottom: space.xs,
  },
});
