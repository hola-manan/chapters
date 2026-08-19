import React from 'react';
import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { space } from '../../design';
import type { Book } from '../../pdf/types';
import { Text, VStack } from '../../ui';
import { readMinutes } from '../readingTime';

export type ContentsHeaderProps = {
  title?: string;
  totalReadTimeMinutes?: number;
  book?: Book;
  progress?: number;
  scrollY?: SharedValue<number>;
  collapseDistance?: number;
  onTitleLayout?: (height: number) => void;
  testID?: string;
};

export function ContentsHeader({
  title,
  totalReadTimeMinutes,
  book,
  scrollY,
  collapseDistance,
  onTitleLayout,
  testID,
}: ContentsHeaderProps) {
  const displayTitle = book?.title ?? title ?? '';
  let readTime = totalReadTimeMinutes;
  if (readTime === undefined && book) {
    const totalWords = book.chapters
      ? book.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
      : 0;
    readTime = readMinutes(totalWords);
  }

  const readTimeAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollY || !collapseDistance || collapseDistance <= 0) {
      return { opacity: 1 };
    }
    const opacity = interpolate(
      scrollY.value,
      [0, collapseDistance],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <View testID={testID} style={{ paddingTop: space.xl, paddingBottom: space.md }}>
      <VStack gap="xs">
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && onTitleLayout) {
              onTitleLayout(h);
            }
          }}
        >
          <Text variant="title1" weight="semibold">
            {displayTitle}
          </Text>
        </View>
        {readTime !== undefined ? (
          <Animated.View style={readTimeAnimatedStyle}>
            <Text variant="subhead" tone="secondary">
              {readTime} min total read
            </Text>
          </Animated.View>
        ) : null}
      </VStack>
    </View>
  );
}
