import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../../../design';
import {
  ChapterEndCard,
  ChapterOpening,
  ChapterTransition,
  HeadingBlock,
  ParagraphBlock,
  ReaderChrome,
} from '../../../features';
import { displayTitle } from '../../../pdf';
import type { Book, Chapter } from '../../../pdf/types';
import { getBook, getReadingPosition, saveReadingPosition } from '../../../storage';
import { Text, useAutoHide, useTheme } from '../../../ui';

export default function ReaderScreen() {
  const { id, chapter: chapterId } = useLocalSearchParams<{ id: string; chapter: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const autoHide = useAutoHide();

  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  const maxProgressRef = useRef<number>(0);
  const maxBlockIndexRef = useRef<number>(0);
  const contentHeightRef = useRef<number>(0);
  const layoutHeightRef = useRef<number>(0);
  const isScrollableRef = useRef<boolean>(false);
  const hasMeasuredRef = useRef<boolean>(false);

  useEffect(() => {
    if (id) {
      getBook(id).then((b) => {
        setBook(b);
        if (b && chapterId) {
          const found = b.chapters.find((c) => c.id === chapterId);
          setChapter(found || null);
          getReadingPosition(id, chapterId).then((pos) => {
            setInitialIndex(pos.blockIndex);
            maxProgressRef.current = pos.progress;
            maxBlockIndexRef.current = pos.blockIndex;
          });
        }
      });
    }
  }, [id, chapterId]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!id || !chapterId) return;

        // Handle chapters that do not scroll: if content size <= layout measurement the whole
        // chapter is on screen and no scroll event will ever fire, so record it complete on exit.
        // Only once both have actually been measured — otherwise backing out before the list lays
        // out would mark an unread chapter as finished.
        if (hasMeasuredRef.current && !isScrollableRef.current) {
          maxProgressRef.current = 1;
        }

        saveReadingPosition(id, chapterId, maxBlockIndexRef.current, maxProgressRef.current);
      };
    }, [id, chapterId])
  );

  if (!book || !chapter) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
        <View style={styles.emptyContainer}>
          <Text tone="secondary">Loading chapter...</Text>
        </View>
      </View>
    );
  }

  const currentChapterIdx = book.chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentChapterIdx > 0 ? book.chapters[currentChapterIdx - 1] : null;
  const nextChapter =
    currentChapterIdx >= 0 && currentChapterIdx < book.chapters.length - 1
      ? book.chapters[currentChapterIdx + 1]
      : null;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const yOffset = contentOffset.y;

    if (contentSize.height > 0 && layoutMeasurement.height > 0) {
      contentHeightRef.current = contentSize.height;
      layoutHeightRef.current = layoutMeasurement.height;
      isScrollableRef.current = contentSize.height > layoutMeasurement.height;
      hasMeasuredRef.current = true;
    }

    // Estimate block index based on average block height (~40px)
    const blockIndex = Math.max(0, Math.floor(yOffset / 40));
    const maxScroll = contentSize.height - layoutMeasurement.height;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, yOffset / maxScroll)) : 1;

    if (progress > maxProgressRef.current) {
      maxProgressRef.current = progress;
    }
    if (blockIndex > maxBlockIndexRef.current) {
      maxBlockIndexRef.current = blockIndex;
    }

    if (id && chapterId) {
      saveReadingPosition(id, chapterId, maxBlockIndexRef.current, maxProgressRef.current);
    }
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    contentHeightRef.current = h;
    if (h > 0 && layoutHeightRef.current > 0) {
      isScrollableRef.current = h > layoutHeightRef.current;
      hasMeasuredRef.current = true;
    }
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    layoutHeightRef.current = h;
    if (contentHeightRef.current > 0 && h > 0) {
      isScrollableRef.current = contentHeightRef.current > h;
      hasMeasuredRef.current = true;
    }
  };

  const displayBlocks = chapter.blocks.filter((b) => b.type !== 'pagebreak');

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <ReaderChrome
        visibility={autoHide.visibility}
        isVisible={autoHide.isVisible}
        bookTitle={book.title}
        onBack={() => router.replace(`/book/${book.id}`)}
      />

      <ChapterTransition
        chapterKey={chapter.id}
        hasPrev={Boolean(prevChapter)}
        hasNext={Boolean(nextChapter)}
        onPrev={() => prevChapter && router.replace(`/book/${book.id}/${prevChapter.id}`)}
        onNext={() => nextChapter && router.replace(`/book/${book.id}/${nextChapter.id}`)}
        onTap={() => autoHide.toggle()}
      >
        <Animated.FlatList
          ref={flatListRef}
          data={displayBlocks}
          keyExtractor={(_, index) => `block_${index}`}
          contentContainerStyle={[
            styles.listContainer,
            {
              paddingTop: insets.top + space.xxxl,
              paddingBottom: space.xxl + insets.bottom,
            },
          ]}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <ChapterOpening
                title={displayTitle(chapter.title)}
                chapterNumber={currentChapterIdx + 1}
                chapterCount={book.chapters.length}
              />
            </View>
          }
          ListFooterComponent={
            <ChapterEndCard
              nextTitle={nextChapter ? displayTitle(nextChapter.title) : undefined}
              nextWordCount={nextChapter ? nextChapter.wordCount : undefined}
              bookTitle={book.title}
              onNext={
                nextChapter
                  ? () => router.replace(`/book/${book.id}/${nextChapter.id}`)
                  : undefined
              }
              onBackToContents={() => router.replace(`/book/${book.id}`)}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text tone="secondary" align="center">
                {book.status === 'no-text-layer'
                  ? 'No extractable text in this chapter (scanned document).'
                  : 'No text blocks found in this chapter.'}
              </Text>
            </View>
          }
          initialScrollIndex={
            initialIndex && initialIndex < displayBlocks.length ? initialIndex : undefined
          }
          onScroll={autoHide.scrollHandler}
          scrollEventThrottle={16}
          onScrollEndDrag={handleScroll}
          onMomentumScrollEnd={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          }}
          renderItem={({ item }) => {
            if (item.type === 'heading') {
              return <HeadingBlock text={item.text} level={item.level} />;
            }
            if (item.type === 'paragraph') {
              return <ParagraphBlock text={item.text} />;
            }
            return null;
          }}
        />
      </ChapterTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: {
    paddingHorizontal: space.xxl,
  },
  headerContainer: {
    marginBottom: space.lg,
  },
  emptyContainer: {
    paddingVertical: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
