import * as Haptics from 'expo-haptics';
import React, { useImperativeHandle, useLayoutEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { springs } from '../../design';

export type ChapterTransitionRef = {
  advance: (direction: 'prev' | 'next') => void;
};

export type ChapterTransitionProps = {
  // Changes when the chapter changes, which is what returns the surface to centre. Navigating
  // between chapters reuses this screen rather than mounting a new one, so without a reset the
  // content would stay parked off-screen where the outgoing animation left it.
  chapterKey: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTap: () => void;
  prevPreview?: React.ReactNode;
  nextPreview?: React.ReactNode;
  children: React.ReactNode;
};

const LEFT_EDGE_DEAD_ZONE = 24;

export const ChapterTransition = React.forwardRef<
  ChapterTransitionRef,
  ChapterTransitionProps
>(function ChapterTransition(
  {
    chapterKey,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
    onTap,
    prevPreview,
    nextPreview,
    children,
  },
  ref
) {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);

  useLayoutEffect(() => {
    translateX.value = 0;
  }, [chapterKey, translateX]);

  const isIgnored = useSharedValue(false);
  const hasFiredBoundaryHaptic = useSharedValue(false);

  const triggerSelectionHaptic = () => {
    try {
      void Haptics.selectionAsync();
    } catch {
      // Haptics unavailable on platform
    }
  };

  const triggerBoundaryHaptic = () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable on platform
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      advance(direction: 'prev' | 'next') {
        if (direction === 'next' && hasNext) {
          triggerSelectionHaptic();
          translateX.value = withSpring(-screenWidth, springs.default, (finished) => {
            if (finished) {
              runOnJS(onNext)();
            }
          });
        } else if (direction === 'prev' && hasPrev) {
          triggerSelectionHaptic();
          translateX.value = withSpring(screenWidth, springs.default, (finished) => {
            if (finished) {
              runOnJS(onPrev)();
            }
          });
        }
      },
    }),
    [hasNext, hasPrev, onNext, onPrev, screenWidth, translateX]
  );

  const commitThreshold = screenWidth * 0.25;

  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onBegin((event) => {
      // Left-edge dead zone: If event.absoluteX < 24, we flag the gesture as ignored
      // and make onUpdate/onEnd no-ops. This is precisely what keeps iOS's interactive
      // back gesture working, which is why the dead zone exists.
      if (event.absoluteX < LEFT_EDGE_DEAD_ZONE) {
        isIgnored.value = true;
        return;
      }
      isIgnored.value = false;
      hasFiredBoundaryHaptic.value = false;
    })
    .onUpdate((event) => {
      if (isIgnored.value) return;

      const tx = event.translationX;
      const isBoundary = (tx > 0 && !hasPrev) || (tx < 0 && !hasNext);

      if (isBoundary) {
        translateX.value = tx * 0.25;
        if (Math.abs(tx) >= commitThreshold && !hasFiredBoundaryHaptic.value) {
          hasFiredBoundaryHaptic.value = true;
          runOnJS(triggerBoundaryHaptic)();
        }
      } else {
        translateX.value = tx;
      }
    })
    .onEnd((event) => {
      if (isIgnored.value) {
        translateX.value = withSpring(0, springs.default);
        return;
      }

      const tx = event.translationX;
      if (tx > commitThreshold && hasPrev) {
        runOnJS(triggerSelectionHaptic)();
        translateX.value = withSpring(screenWidth, springs.default, (finished) => {
          if (finished) {
            runOnJS(onPrev)();
          }
        });
      } else if (tx < -commitThreshold && hasNext) {
        runOnJS(triggerSelectionHaptic)();
        translateX.value = withSpring(-screenWidth, springs.default, (finished) => {
          if (finished) {
            runOnJS(onNext)();
          }
        });
      } else {
        translateX.value = withSpring(0, springs.default);
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)();
  });

  const composedGesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {hasPrev && prevPreview ? (
          <View
            style={[styles.layer, { left: -screenWidth, width: screenWidth }]}
            pointerEvents="none"
          >
            {prevPreview}
          </View>
        ) : null}
        <View style={[styles.layer, { left: 0, width: screenWidth }]}>
          {children}
        </View>
        {hasNext && nextPreview ? (
          <View
            style={[styles.layer, { left: screenWidth, width: screenWidth }]}
            pointerEvents="none"
          >
            {nextPreview}
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
