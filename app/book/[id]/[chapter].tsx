import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  ChapterPreview,
  ChapterTransition,
  ChapterTransitionRef,
  HeadingBlock,
  ParagraphBlock,
  ReaderChrome,
} from '../../../features';
import { displayTitle } from '../../../pdf';
import type { Book } from '../../../pdf/types';
import { getBook, getReadingPosition, saveReadingPosition } from '../../../storage';
import { Text, useAutoHide, useTheme } from '../../../ui';

export default function ReaderScreen() {
  const { id, chapter: chapterId } = useLocalSearchParams<{ id: string; chapter: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const transitionRef = useRef<ChapterTransitionRef>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const autoHide = useAutoHide();

  const [book, setBook] = useState<Book | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  const deferredIndex = useDeferredValue(currentIndex);

  const prevIndexRef = useRef<number | null>(null);
  const prevChapterIdRef = useRef<string | null>(null);
  const maxProgressRef = useRef<number>(0);
  const maxBlockIndexRef = useRef<number>(0);
  const contentHeightRef = useRef<number>(0);
  const layoutHeightRef = useRef<number>(0);
  const isScrollableRef = useRef<boolean>(false);
  const hasMeasuredRef = useRef<boolean>(false);

  const currentChapterId = currentIndex !== null && book ? book.chapters[currentIndex]?.id : null;

  useLayoutEffect(() => {
    if (currentChapterId) {
      if (
        prevChapterIdRef.current !== null &&
        prevChapterIdRef.current !== currentChapterId
      ) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
      prevChapterIdRef.current = currentChapterId;
    }
  }, [currentChapterId]);

  // The book is read from disk exactly once. Paging between chapters must not re-enter this —
  // every chapter is already in `book.chapters`, and re-fetching would put a disk read and a
  // whole-tree re-render in the middle of a swipe, which is the thing paging exists to avoid.
  // Hence the ref guard rather than a `currentIndex` dependency.
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!id || didInitRef.current) return;

    getBook(id).then((b) => {
      setBook(b);
      if (b && chapterId && !didInitRef.current) {
        didInitRef.current = true;
        const idx = b.chapters.findIndex((c) => c.id === chapterId);
        const foundIdx = idx !== -1 ? idx : 0;
        setCurrentIndex(foundIdx);
        prevIndexRef.current = foundIdx;
        const foundChapter = b.chapters[foundIdx];
        if (foundChapter) {
          // Resume applies on entry only. A chapter arrived at by swiping starts at the top.
          getReadingPosition(id, foundChapter.id).then((pos) => {
            setInitialIndex(pos.blockIndex);
            maxProgressRef.current = pos.progress;
            maxBlockIndexRef.current = pos.blockIndex;
          });
        }
      }
    });
  }, [id, chapterId]);

  useEffect(() => {
    if (currentIndex === null || !book || !id) return;

    if (prevIndexRef.current !== null && prevIndexRef.current !== currentIndex) {
      const prevChapter = book.chapters[prevIndexRef.current];
      if (prevChapter) {
        if (hasMeasuredRef.current && !isScrollableRef.current) {
          maxProgressRef.current = 1;
        }
        saveReadingPosition(id, prevChapter.id, maxBlockIndexRef.current, maxProgressRef.current);
      }

      maxProgressRef.current = 0;
      maxBlockIndexRef.current = 0;
      contentHeightRef.current = 0;
      layoutHeightRef.current = 0;
      isScrollableRef.current = false;
      hasMeasuredRef.current = false;
      setInitialIndex(null);
    }

    prevIndexRef.current = currentIndex;
  }, [currentIndex, book, id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!id || currentIndex === null || !book) return;
        const activeChapter = book.chapters[currentIndex];
        if (!activeChapter) return;

        if (hasMeasuredRef.current && !isScrollableRef.current) {
          maxProgressRef.current = 1;
        }

        saveReadingPosition(id, activeChapter.id, maxBlockIndexRef.current, maxProgressRef.current);
      };
    }, [id, currentIndex, book])
  );

  if (!book || currentIndex === null || !book.chapters[currentIndex]) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
        <View style={styles.emptyContainer}>
          <Text tone="secondary">Loading chapter...</Text>
        </View>
      </View>
    );
  }

  const chapter = book.chapters[currentIndex];
  const prevChapter = currentIndex > 0 ? book.chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const yOffset = contentOffset.y;

    if (contentSize.height > 0 && layoutMeasurement.height > 0) {
      contentHeightRef.current = contentSize.height;
      layoutHeightRef.current = layoutMeasurement.height;
      isScrollableRef.current = contentSize.height > layoutMeasurement.height;
      hasMeasuredRef.current = true;
    }

    const blockIndex = Math.max(0, Math.floor(yOffset / 40));
    const maxScroll = contentSize.height - layoutMeasurement.height;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, yOffset / maxScroll)) : 1;

    if (progress > maxProgressRef.current) {
      maxProgressRef.current = progress;
    }
    if (blockIndex > maxBlockIndexRef.current) {
      maxBlockIndexRef.current = blockIndex;
    }

    if (id && chapter) {
      saveReadingPosition(id, chapter.id, maxBlockIndexRef.current, maxProgressRef.current);
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

  const deferredPrevChapter =
    deferredIndex !== null && book && deferredIndex > 0
      ? book.chapters[deferredIndex - 1]
      : null;
  const deferredNextChapter =
    deferredIndex !== null && book && deferredIndex < book.chapters.length - 1
      ? book.chapters[deferredIndex + 1]
      : null;

  const prevPreview =
    deferredPrevChapter && deferredIndex !== null && book ? (
      <ChapterPreview
        chapter={deferredPrevChapter}
        chapterNumber={deferredIndex}
        chapterCount={book.chapters.length}
      />
    ) : undefined;

  const nextPreview =
    deferredNextChapter && deferredIndex !== null && book ? (
      <ChapterPreview
        chapter={deferredNextChapter}
        chapterNumber={deferredIndex + 2}
        chapterCount={book.chapters.length}
      />
    ) : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <ReaderChrome
        visibility={autoHide.visibility}
        isVisible={autoHide.isVisible}
        bookTitle={book.title}
        onBack={() => router.replace(`/book/${book.id}`)}
      />

      <ChapterTransition
        ref={transitionRef}
        chapterKey={chapter.id}
        hasPrev={Boolean(prevChapter)}
        hasNext={Boolean(nextChapter)}
        onPrev={() => setCurrentIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setCurrentIndex((i) => (i !== null && i < book.chapters.length - 1 ? i + 1 : i))}
        onTap={() => autoHide.toggle()}
        prevPreview={prevPreview}
        nextPreview={nextPreview}
      >
        <Animated.FlatList
          ref={flatListRef}
          data={displayBlocks}
          keyExtractor={(_, index) => `block_${index}`}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
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
                chapterNumber={currentIndex + 1}
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
                  ? () => transitionRef.current?.advance('next')
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
