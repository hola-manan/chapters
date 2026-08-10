import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Book, Chapter } from '../../../pdf/types.ts';
import { getBook, getReadingPosition, saveReadingPosition } from '../../../storage/index.ts';

export default function ReaderScreen() {
  const { id, chapter: chapterId } = useLocalSearchParams<{ id: string; chapter: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      getBook(id).then((b) => {
        setBook(b);
        if (b && chapterId) {
          const found = b.chapters.find((c) => c.id === chapterId);
          setChapter(found || null);
          getReadingPosition(id, chapterId).then((pos) => {
            setInitialIndex(pos);
          });
        }
      });
    }
  }, [id, chapterId]);

  if (!book || !chapter) {
    return (
      <View style={styles.container}>
        <Text>Loading chapter...</Text>
      </View>
    );
  }

  const currentChapterIdx = book.chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentChapterIdx > 0 ? book.chapters[currentChapterIdx - 1] : null;
  const nextChapter =
    currentChapterIdx >= 0 && currentChapterIdx < book.chapters.length - 1
      ? book.chapters[currentChapterIdx + 1]
      : null;

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    // Estimate block index based on average block height (~40px)
    const blockIndex = Math.max(0, Math.floor(yOffset / 40));
    if (id && chapterId) {
      saveReadingPosition(id, chapterId, blockIndex);
    }
  };

  const displayBlocks = chapter.blocks.filter((b) => b.type !== 'pagebreak');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{chapter.title}</Text>

      {displayBlocks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {book.status === 'no-text-layer'
              ? 'No extractable text in this chapter (scanned document).'
              : 'No text blocks found in this chapter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayBlocks}
          keyExtractor={(_, index) => `block_${index}`}
          contentContainerStyle={styles.list}
          initialScrollIndex={
            initialIndex && initialIndex < displayBlocks.length ? initialIndex : undefined
          }
          onScroll={handleScroll}
          scrollEventThrottle={500}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          renderItem={({ item }) => {
            if (item.type === 'heading') {
              return (
                <Text style={item.level === 1 ? styles.heading1 : styles.heading2}>
                  {item.text}
                </Text>
              );
            }
            if (item.type === 'paragraph') {
              return <Text style={styles.paragraph}>{item.text}</Text>;
            }
            return null;
          }}
        />
      )}

      <View style={styles.footer}>
        {prevChapter ? (
          <Pressable
            style={styles.navButton}
            onPress={() => router.replace(`/book/${book.id}/${prevChapter.id}`)}
          >
            <Text style={styles.navText}>← Previous</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        {nextChapter ? (
          <Pressable
            style={styles.navButton}
            onPress={() => router.replace(`/book/${book.id}/${nextChapter.id}`)}
          >
            <Text style={styles.navText}>Next →</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#666', textAlign: 'center' },
  list: { gap: 12, paddingBottom: 24 },
  heading1: { fontSize: 22, fontWeight: 'bold', marginVertical: 8 },
  heading2: { fontSize: 18, fontWeight: '600', marginVertical: 6 },
  paragraph: { fontSize: 16, lineHeight: 24, color: '#222' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  navButton: { padding: 10, backgroundColor: '#f0f0f0' },
  navText: { fontSize: 14, fontWeight: '500' },
  placeholder: { width: 80 },
});
