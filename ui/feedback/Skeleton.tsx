import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getReadingStyle, radius, readingConfig, readingSizes, space } from '../../design';
import { useReadingSize, useTheme } from '../theme';

export type SkeletonTextProps = {
  lines?: number; // default 3
  delayMs?: number; // default 200 — nothing renders before this elapses
  testID?: string;
};

const WIDTHS = ['100%', '92%', '76%'] as const;

export function SkeletonText({
  lines = 3,
  delayMs = 200,
  testID,
}: SkeletonTextProps) {
  const theme = useTheme();
  const { size } = useReadingSize();
  const isReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(delayMs <= 0);
  const opacity = useSharedValue(1);

  const baseSize = readingSizes[size] ?? readingConfig.baseSize;
  const readingStyle = getReadingStyle(1.0, baseSize);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    if (isReducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 800 }),
      -1,
      true
    );
  }, [isReducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isReducedMotion ? 1 : opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      testID={testID}
      style={[
        animatedStyle,
        {
          marginBottom: space.paragraphGap,
        },
      ]}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={{
            height: readingStyle.lineHeight,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: WIDTHS[i % WIDTHS.length],
              height: readingStyle.fontSize,
              borderRadius: radius.sm,
              backgroundColor: theme.surface.sunken,
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}
