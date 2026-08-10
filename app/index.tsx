import * as DocumentPicker from 'expo-document-picker';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { parsePdf } from '../pdf/index.ts';
import type { Book } from '../pdf/types.ts';
import { addBook, listBooks, removeBook } from '../storage/index.ts';

export default function LibraryScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingTitle, setParsingTitle] = useState('');
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
      setParsingTitle(asset.name || 'PDF Document');
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

  const handleRemove = async (id: string) => {
    await removeBook(id);
    await loadLibrary();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Library</Text>

      <Pressable style={styles.importButton} onPress={handlePickDocument} disabled={isParsing}>
        <Text style={styles.importButtonText}>
          {isParsing ? 'Importing PDF...' : 'Import a PDF'}
        </Text>
      </Pressable>

      <Link href="/_dev/gallery" style={styles.galleryLink}>
        <Text>Open Dev Component Gallery</Text>
      </Link>

      {isParsing && (
        <View style={styles.parsingBox}>
          <ActivityIndicator size="small" />
          <Text style={styles.parsingTitle}>{parsingTitle}</Text>
          <Text style={styles.parsingProgress}>
            Stage: {progressStage} ({progressPct}%)
          </Text>
        </View>
      )}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isParsing ? <Text>No books added yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable style={styles.cardInfo} onPress={() => router.push(`/book/${item.id}`)}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.metaText}>
                {item.pageCount} pages | Status: {item.status}
              </Text>
              {item.status === 'failed' && item.error ? (
                <Text style={styles.metaText}>Error: {item.error}</Text>
              ) : null}
              <Text style={styles.metaText}>
                Source: {item.chapterSource} | Chapters: {item.chapters.length}
              </Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => handleRemove(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  importButton: {
    padding: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    marginBottom: 8,
  },
  importButtonText: { fontSize: 16, fontWeight: '600' },
  galleryLink: { marginBottom: 16, color: 'blue' },
  parsingBox: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  parsingTitle: { fontWeight: 'bold', fontSize: 14 },
  parsingProgress: { fontSize: 12, color: '#555' },
  errorText: { color: 'red', marginVertical: 8 },
  list: { gap: 12, paddingTop: 8 },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: { flex: 1, gap: 2 },
  bookTitle: { fontSize: 16, fontWeight: 'bold' },
  metaText: { fontSize: 12, color: '#666' },
  deleteButton: { padding: 8, backgroundColor: '#ffd1d1' },
  deleteText: { color: 'red', fontSize: 12 },
});
