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
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
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
  ReaderSettingsSheet,
} from '../../../features';
import { displayTitle } from '../../../pdf';
import type { Book } from '../../../pdf/types';
import { getBook, getReadingPosition, saveReadingPosition } from '../../../storage';
import { EmptyState, EdgeFade, SkeletonText, useAutoHide, useReadingSize, useTheme, useThemeMode } from '../../../ui';

// Relative pinch travel that commits one size step. Small enough to feel responsive, large enough
// that an unsteady two-finger rest does not trip it.
const PINCH_STEP_UP = 1.1;
const PINCH_STEP_DOWN = 0.91;

export default function ReaderScreen() {
  const {
    id,
    chapter: chapterId,
    title: initialTitle,
    chapterNumber: initialChapterNumStr,
    chapterCount: initialChapterCountStr,
    bookTitle: initialBookTitle,
  } = useLocalSearchParams<{
    id: string;
    chapter: string;
    title?: string;
    chapterNumber?: string;
    chapterCount?: string;
    bookTitle?: string;
  }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const transitionRef = useRef<ChapterTransitionRef>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const autoHide = useAutoHide();

  const { size: readingSize, setSize: onChangeReadingSize, step: stepReadingSize } = useReadingSize();
  const { mode: themeMode, setMode: onChangeThemeMode } = useThemeMode();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const sizeRef = useRef(readingSize);
  sizeRef.current = readingSize;
  const stepRef = useRef(stepReadingSize);
  stepRef.current = stepReadingSize;

  // Scale at which the last step fired, so one continuous pinch can travel small → default →
  // large without firing twice for the same movement. A shared value, not a ref, because the
  // gesture below runs on the UI thread.
  const pinchLatch = useSharedValue(1);

  const stepSize = useCallback((direction: 'up' | 'down') => {
    const atLimit =
      (direction === 'up' && sizeRef.current === 'large') ||
      (direction === 'down' && sizeRef.current === 'small');
    if (atLimit) return;
    try {
      void Haptics.selectionAsync().catch(() => {});
    } catch {
      // Haptics unavailable on platform
    }
    stepRef.current(direction);
  }, []);

  const pinchGesture = Gesture.Pinch()
    // Deliberately NOT .runOnJS(true): that moves the whole gesture onto the JS thread, where
    // recognition competes with rendering and the pinch reads as sluggish. Only the step itself
    // needs JS.
    .onStart(() => {
      pinchLatch.value = 1;
    })
    .onUpdate((event) => {
      const relative = event.scale / pinchLatch.value;
      if (relative >= PINCH_STEP_UP) {
        pinchLatch.value = event.scale;
        runOnJS(stepSize)('up');
      } else if (relative <= PINCH_STEP_DOWN) {
        pinchLatch.value = event.scale;
        runOnJS(stepSize)('down');
      }
    });

  const [book, setBook] = useState<Book | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  const prevIndexRef = useRef<number | null>(null);
  const maxProgressRef = useRef<number>(0);
  const maxBlockIndexRef = useRef<number>(0);
  const contentHeightRef = useRef<number>(0);
  const layoutHeightRef = useRef<number>(0);
  const isScrollableRef = useRef<boolean>(false);
  const hasMeasuredRef = useRef<boolean>(false);

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
    const initialChapterNumber = initialChapterNumStr
      ? parseInt(initialChapterNumStr, 10)
      : undefined;
    const initialChapterCount = initialChapterCountStr
      ? parseInt(initialChapterCountStr, 10)
      : undefined;

    return (
      <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
        <ReaderChrome
          visibility={autoHide.visibility}
          isVisible={autoHide.isVisible}
          bookTitle={initialBookTitle ?? ''}
          onBack={() => router.replace(`/book/`)}
        />
        <EdgeFade edge="top" solidHeight={insets.top} fadeHeight={space.xl} />
        <View
          style={[
            styles.listContainer,
            {
              paddingTop: insets.top + space.xxxl,
              paddingBottom: space.xxl + insets.bottom,
            },
          ]}
        >
          {initialTitle ? (
            <>
              <View style={styles.headerContainer}>
                <ChapterOpening
                  title={initialTitle}
                  chapterNumber={initialChapterNumber}
                  chapterCount={initialChapterCount}
                />
              </View>
              <SkeletonText lines={6} />
            </>
          ) : (
            <SkeletonText lines={6} />
          )}
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

  const prevPreview = prevChapter ? (
    <ChapterPreview
      chapter={prevChapter}
      chapterNumber={currentIndex}
      chapterCount={book.chapters.length}
    />
  ) : undefined;

  const nextPreview = nextChapter ? (
    <ChapterPreview
      chapter={nextChapter}
      chapterNumber={currentIndex + 2}
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
        onOpenSettings={() => setSettingsVisible(true)}
      />

      <EdgeFade edge="top" solidHeight={insets.top} fadeHeight={space.xl} />

      <GestureDetector gesture={pinchGesture}>
        <View style={styles.container}>
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
              key={chapter.id}
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
                <EmptyState
                  message={
                    book.status === 'no-text-layer'
                      ? 'No extractable text in this chapter (scanned document).'
                      : 'No text blocks found in this chapter.'
                  }
                />
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
      </GestureDetector>

      <ReaderSettingsSheet
        visible={settingsVisible}
        onDismiss={() => setSettingsVisible(false)}
        readingSize={readingSize}
        onChangeReadingSize={onChangeReadingSize}
        themeMode={themeMode}
        onChangeThemeMode={onChangeThemeMode}
      />
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
});
