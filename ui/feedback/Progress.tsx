import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion, radius, space, springs } from '../../design';
import { useTheme } from '../theme';

export type ProgressBarProps = {
  value: number; // 0..1, clamped
  testID?: string;
};

export type SpinnerProps = {
  size?: 'sm' | 'md';
  testID?: string;
};

export function ProgressBar({ value, testID }: ProgressBarProps) {
  const theme = useTheme();
  const isReducedMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, value));
  const progress = useSharedValue(clamped);

  useEffect(() => {
    if (isReducedMotion) {
      progress.value = clamped;
    } else {
      progress.value = withSpring(clamped, springs.default);
    }
  }, [clamped, isReducedMotion, progress]);

  const fillAnimatedStyle = useAnimatedStyle(() => {
    const pct = Math.min(100, Math.max(0, progress.value * 100));
    return {
      width: `${pct}%`,
    };
  });

  return (
    <View
      testID={testID}
      style={[
        styles.track,
        {
          backgroundColor: theme.surface.sunken,
          borderRadius: radius.pill,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: theme.accent.base,
            borderRadius: radius.pill,
          },
          fillAnimatedStyle,
        ]}
      />
    </View>
  );
}

export function Spinner({ size = 'sm', testID }: SpinnerProps) {
  const theme = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: motion.durations.spin,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false
    );
  }, [rotation]);

  const spinnerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const dimension = size === 'md' ? space.xl : space.lg;

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.spinner,
        {
          width: dimension,
          height: dimension,
          borderWidth: space.xxs,
          borderRadius: radius.pill,
          borderColor: 'transparent',
          borderTopColor: theme.accent.base,
        },
        spinnerAnimatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: space.xxs,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  spinner: {
    alignSelf: 'center',
  },
});
