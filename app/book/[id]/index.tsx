import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { space } from '../../../design';
import { ChapterRow, ContentsHeader, DevToggles } from '../../../features';
import type { Book } from '../../../pdf/types';
import { computeBookProgress, getBook, getBookPrefs, resumeChapterId, type BookPrefs } from '../../../storage';
import { Text, useTheme } from '../../../ui';

export default function ContentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [book, setBook] = useState<Book | null>(null);
  const [prefs, setPrefs] = useState<BookPrefs>({});
  const [showSerials, setShowSerials] = useState(false);

  const loadData = useCallback(async () => {
    if (id) {
      const loadedBook = await getBook(id);
      const loadedPrefs = await getBookPrefs(id);
      setBook(loadedBook);
      setPrefs(loadedPrefs);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!book) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
        <Text tone="secondary">Loading book contents...</Text>
      </View>
    );
  }

  const bookProgress = computeBookProgress(book, prefs);
  const targetChapterId = resumeChapterId(book, prefs);

  const renderHeader = () => (
    <View>
      <ContentsHeader book={book} progress={bookProgress} />
      <DevToggles showSerials={showSerials} onToggleSerials={setShowSerials} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <FlatList
        data={book.chapters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => {
          const chProgress = prefs[item.id]?.progress ?? 0;
          const isResumeTarget = item.id === targetChapterId;
          return (
            <ChapterRow
              chapter={item}
              progress={chProgress}
              isResumeTarget={isResumeTarget}
              showSerialNumber={showSerials}
              index={index}
              onPress={() => router.push(`/book/${book.id}/${item.id}`)}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: space.sm,
  },
});

