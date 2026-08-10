import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Book } from '../../../pdf/types.ts';
import { getBook } from '../../../storage/index.ts';

export default function ContentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    if (id) {
      getBook(id).then(setBook);
    }
  }, [id]);

  if (!book) {
    return (
      <View style={styles.container}>
        <Text>Loading book contents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{book.title}</Text>
      <Text style={styles.subtitle}>
        {book.pageCount} pages | {book.chapters.length} chapters ({book.chapterSource})
      </Text>

      {book.status === 'no-text-layer' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            This PDF has no extractable text layer (scanned page images).
          </Text>
        </View>
      )}

      <FlatList
        data={book.chapters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.chapterCard}
            onPress={() => router.push(`/book/${book.id}/${item.id}`)}
          >
            <Text style={styles.chapterTitle}>{item.title}</Text>
            <Text style={styles.chapterPages}>
              Pages {item.startPage}–{item.endPage} | {item.blocks.length} blocks
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  warningBox: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderColor: '#ffebaa',
    borderWidth: 1,
    marginBottom: 12,
  },
  warningText: { color: '#856404', fontSize: 13 },
  list: { gap: 8 },
  chapterCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 4,
  },
  chapterTitle: { fontSize: 16, fontWeight: '500' },
  chapterPages: { fontSize: 12, color: '#777' },
});
