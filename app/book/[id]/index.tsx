import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../../../design';
import { ChapterRow, ContentsHeader } from '../../../features';
import { displayTitle } from '../../../pdf';
import type { Book } from '../../../pdf/types';
import { getBook, getBookPrefs, resumeChapterId, type BookPrefs } from '../../../storage';
import { CollapsingHeader, SkeletonText, useScrollY, useTheme } from '../../../ui';

export default function ContentsScreen() {
  const { id, title: initialTitle } = useLocalSearchParams<{ id: string; title?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollY, scrollHandler } = useScrollY();

  const [book, setBook] = useState<Book | null>(null);
  const [prefs, setPrefs] = useState<BookPrefs>({});
  const [collapseDistance, setCollapseDistance] = useState(48);

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

  const effectiveTitle = book ? book.title : (initialTitle ?? '');
  const targetChapterId = book ? resumeChapterId(book, prefs) : undefined;

  const renderHeader = () => (
    <ContentsHeader
      title={effectiveTitle}
      book={book ?? undefined}
      scrollY={scrollY}
      collapseDistance={collapseDistance}
      onTitleLayout={setCollapseDistance}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <CollapsingHeader
        scrollY={scrollY}
        title={effectiveTitle}
        collapseDistance={collapseDistance}
        onBack={() => router.back()}
      />
      <Animated.FlatList
        data={book ? book.chapters : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + space.xl,
            paddingBottom: space.lg + insets.bottom,
          },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!book ? <SkeletonText lines={6} /> : null}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          if (!book) return null;
          const chProgress = prefs[item.id]?.progress ?? 0;
          const isResumeTarget = item.id === targetChapterId;
          return (
            <ChapterRow
              chapter={item}
              progress={chProgress}
              isResumeTarget={isResumeTarget}
              index={index}
              onPress={() => {
                router.push({
                  pathname: '/book/[id]/[chapter]',
                  params: {
                    id: book.id,
                    chapter: item.id,
                    title: displayTitle(item.title),
                    chapterNumber: String(index + 1),
                    chapterCount: String(book.chapters.length),
                    bookTitle: effectiveTitle,
                  },
                });
              }}
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
    gap: space.sm,
  },
});
