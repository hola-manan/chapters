import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable as RNPressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion, type SpringConfig } from '../../design';
import { useTheme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export type PressableFeedback = 'scale' | 'overlay' | 'opacity' | 'none';
export type PressableHaptic = 'none' | 'selection' | 'light' | 'success' | 'error';

export type PressableProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  feedback?: PressableFeedback;
  haptic?: PressableHaptic;
  hitSlop?: number;
  disabled?: boolean;
  flex?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children?: React.ReactNode;
  testID?: string;
  scaleTarget?: number;
  springConfig?: SpringConfig;
};

export function Pressable({
  onPress,
  onLongPress,
  feedback = 'opacity',
  haptic = 'none',
  hitSlop,
  disabled = false,
  flex = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  children,
  testID,
  scaleTarget,
  springConfig,
}: PressableProps) {
  const theme = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReducedMotion(enabled);
    });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReducedMotion(enabled);
    });
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  const effectiveScaleTarget = scaleTarget ?? 0.96;
  const effectiveSpringConfig = springConfig ?? motion.springs.default;
  const effectiveFeedback = reducedMotion && feedback === 'scale' ? 'opacity' : feedback;

  const handlePressIn = () => {
    if (disabled) return;

    if (haptic === 'selection') {
      try {
        void Haptics.selectionAsync();
      } catch {
        // Haptics unavailable on platform
      }
    } else if (haptic === 'light') {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics unavailable on platform
      }
    }

    if (effectiveFeedback === 'scale') {
      scale.value = withSpring(effectiveScaleTarget, effectiveSpringConfig);
    } else if (effectiveFeedback === 'opacity') {
      opacity.value = withTiming(0.6, { duration: motion.durations.instant });
    } else if (effectiveFeedback === 'overlay') {
      overlayOpacity.value = withTiming(1, { duration: motion.durations.instant });
    }
  };

  const handlePressOut = () => {
    if (disabled) return;

    if (effectiveFeedback === 'scale') {
      scale.value = withSpring(1, effectiveSpringConfig);
    } else if (effectiveFeedback === 'opacity') {
      opacity.value = withTiming(1, { duration: motion.durations.fast });
    } else if (effectiveFeedback === 'overlay') {
      overlayOpacity.value = withTiming(0, { duration: motion.durations.fast });
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: disabled ? 0.4 : opacity.value,
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  return (
    <AnimatedPressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop !== undefined ? hitSlop : undefined}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[
        flex ? styles.flex : undefined,
        feedback === 'overlay' ? styles.overflowHidden : undefined,
        animatedStyle,
      ]}
    >
      {children}
      {feedback === 'overlay' && (
        <Animated.View
          style={[
            styles.overlay,
            { backgroundColor: theme.state.pressOverlay },
            animatedOverlayStyle,
          ]}
        />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overflowHidden: {
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
});
