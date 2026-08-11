import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { radius, space } from '../design';
import { LibraryFeed } from '../features';
import { parsePdf } from '../pdf';
import type { Book } from '../pdf/types';
import { addBook, listBooks, removeBook } from '../storage';
import { Text, useTheme, VStack } from '../ui';

export default function LibraryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLibrary = async () => {
    const list = await listBooks();
    setBooks(list);
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const handlePickDocument = async () => {
    try {
      setErrorMessage('');
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const asset = res.assets[0];
      setIsParsing(true);
      setProgressStage('reading');
      setProgressPct(0);

      const parsedBook = await parsePdf(asset.uri, (stage, pct) => {
        setProgressStage(stage);
        setProgressPct(pct);
      });

      // Only readable books enter the library. A PDF with no text layer cannot be
      // reflowed at all, so it is rejected at import rather than added as a book
      // that can never be opened.
      if (parsedBook.status === 'no-text-layer') {
        setErrorMessage(
          `“${parsedBook.title}” is scanned page images, not text. There is nothing to display.`
        );
        return;
      }
      if (parsedBook.status === 'failed') {
        setErrorMessage(
          `“${parsedBook.title}” could not be read.${parsedBook.error ? ` ${parsedBook.error}` : ''}`
        );
        return;
      }

      await addBook(parsedBook);
      await loadLibrary();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import PDF');
    } finally {
      setIsParsing(false);
    }
  };

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
    <VStack gap="xs">
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
      {errorMessage ? (
        <View style={[styles.errorBox, { borderColor: theme.border.strong }]}>
          <Text variant="footnote" tone="secondary">
            {errorMessage}
          </Text>
        </View>
      ) : null}
    </VStack>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <LibraryFeed
        books={books}
        onSelectBook={(book) => router.push(`/book/${book.id}`)}
        onDeleteBook={handleDeleteBook}
        onImportPress={handlePickDocument}
        isImporting={isParsing}
        importStage={progressStage}
        importPct={progressPct}
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
  errorBox: {
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: space.xs,
  },
});
