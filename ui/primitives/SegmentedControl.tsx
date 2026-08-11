import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion, radius, shadow as shadowTokens, space, springs } from '../../design';
import { useTheme } from '../theme';
import { Pressable } from './Pressable';
import { Surface } from './Surface';
import { Text } from './Text';

export type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

type SegmentLayout = {
  x: number;
  width: number;
  height: number;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, SegmentLayout>>({});

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorHeight = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const activeOption = options[selectedIndex >= 0 ? selectedIndex : 0];
  const activeLayout = activeOption ? layouts[activeOption.value] : undefined;

  useEffect(() => {
    if (!activeLayout || activeLayout.width === 0) return;

    const targetX = activeLayout.x;
    const targetWidth = activeLayout.width;
    const targetHeight = activeLayout.height;

    if (indicatorOpacity.value === 0) {
      // First layout measurement: set positions directly without transition jump
      indicatorX.value = targetX;
      indicatorWidth.value = targetWidth;
      indicatorHeight.value = targetHeight;
      indicatorOpacity.value = withTiming(1, { duration: motion.durations.instant });
      return;
    }

    if (isReducedMotion) {
      // Cross-fade indicator instead of sliding under reduced motion
      indicatorOpacity.value = withSequence(
        withTiming(0, { duration: motion.durations.instant }, () => {
          indicatorX.value = targetX;
          indicatorWidth.value = targetWidth;
          indicatorHeight.value = targetHeight;
        }),
        withTiming(1, { duration: motion.durations.instant })
      );
    } else {
      indicatorX.value = withSpring(targetX, springs.default);
      indicatorWidth.value = withSpring(targetWidth, springs.default);
      indicatorHeight.value = targetHeight;
      indicatorOpacity.value = withTiming(1, { duration: motion.durations.fast });
    }
  }, [activeLayout, isReducedMotion, indicatorX, indicatorWidth, indicatorHeight, indicatorOpacity]);

  const handlePress = (optionValue: T) => {
    if (optionValue !== value) {
      try {
        void Haptics.selectionAsync();
      } catch {
        // Haptics unavailable on platform
      }
      onChange(optionValue);
    }
  };

  const handleSegmentLayout = (optValue: string, e: LayoutChangeEvent) => {
    const { x, width, height } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const existing = prev[optValue];
      if (existing && existing.x === x && existing.width === width && existing.height === height) {
        return prev;
      }
      return {
        ...prev,
        [optValue]: { x, width, height },
      };
    });
  };

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorX.value }],
      width: indicatorWidth.value > 0 ? indicatorWidth.value : undefined,
      height: indicatorHeight.value > 0 ? indicatorHeight.value : undefined,
      opacity: indicatorOpacity.value,
    };
  });

  return (
    <Surface sunken radius="md" padding="xxs" testID={testID}>
      <View style={styles.trackContainer}>
        {/* Raised Indicator Surface */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              backgroundColor: theme.surface.raised,
              borderRadius: radius.sm,
              shadowColor: theme.shadow.color,
              shadowOffset: {
                width: shadowTokens.sm.offsetX,
                height: shadowTokens.sm.offsetY,
              },
              shadowRadius: shadowTokens.sm.blur,
              shadowOpacity: shadowTokens.sm.opacity,
              elevation: 1,
            },
            indicatorAnimatedStyle,
          ]}
        />

        {/* Options Row */}
        <View style={styles.segmentsRow}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <View
                key={opt.value}
                style={styles.segmentFlex}
                onLayout={(e) => handleSegmentLayout(opt.value, e)}
              >
                <Pressable
                  onPress={() => handlePress(opt.value)}
                  feedback="none"
                  flex
                  radius="sm"
                >
                  <View style={styles.segmentContent}>
                    <Text
                      variant="footnote"
                      weight={isSelected ? 'semibold' : 'medium'}
                      tone={isSelected ? 'primary' : 'secondary'}
                      align="center"
                    >
                      {opt.label}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  trackContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  segmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentFlex: {
    flex: 1,
  },
  segmentContent: {
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
