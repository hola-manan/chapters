import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { radius, space } from '../../../design';
import { ChapterOpening, HeadingBlock, OpeningPicker, OpeningTreatment, ParagraphBlock } from '../../../features';
import { displayTitle } from '../../../pdf';
import type { Block, Book, Chapter } from '../../../pdf/types';
import { getBook, getReadingPosition, saveReadingPosition } from '../../../storage';
import { Text, useTheme } from '../../../ui';

export default function ReaderScreen() {
  const { id, chapter: chapterId } = useLocalSearchParams<{ id: string; chapter: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const theme = useTheme();

  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [initialIndex, setInitialIndex] = useState<number | null>(null);
  const [treatment, setTreatment] = useState<OpeningTreatment>('eyebrow');

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

  const rawBlocks = chapter.blocks.filter((b) => b.type !== 'pagebreak');
  const firstParagraphBlock = rawBlocks.find(
    (b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph'
  );
  const firstParagraphText = firstParagraphBlock?.text;

  let displayBlocks = rawBlocks;
  if ((treatment === 'initial' || treatment === 'smallcaps') && firstParagraphBlock) {
    let dropped = false;
    displayBlocks = rawBlocks.filter((b) => {
      if (!dropped && b === firstParagraphBlock) {
        dropped = true;
        return false;
      }
      return true;
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.page }]}>
      <FlatList
        ref={flatListRef}
        data={displayBlocks}
        keyExtractor={(_, index) => `block_${index}`}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <OpeningPicker treatment={treatment} onChangeTreatment={setTreatment} />
            <ChapterOpening
              title={displayTitle(chapter.title)}
              chapterNumber={currentChapterIdx + 1}
              chapterCount={book.chapters.length}
              treatment={treatment}
              firstParagraph={firstParagraphText}
            />
          </View>
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
        onScroll={handleScroll}
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={500}
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

      <View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
        {prevChapter ? (
          <Pressable
            style={[styles.navButton, { backgroundColor: theme.surface.sunken }]}
            onPress={() => router.replace(`/book/${book.id}/${prevChapter.id}`)}
          >
            <Text variant="footnote" weight="medium" tone="primary">
              ← Previous
            </Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}

        {nextChapter ? (
          <Pressable
            style={[styles.navButton, { backgroundColor: theme.surface.sunken }]}
            onPress={() => router.replace(`/book/${book.id}/${nextChapter.id}`)}
          >
            <Text variant="footnote" weight="medium" tone="primary">
              Next →
            </Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: {
    paddingHorizontal: space.xxl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
  },
  headerContainer: {
    marginBottom: space.lg,
  },
  emptyContainer: {
    paddingVertical: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderTopWidth: 1,
  },
  navButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  placeholder: { width: 80 },
});
