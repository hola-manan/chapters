import * as Haptics from 'expo-haptics';
import React, { useImperativeHandle, useLayoutEffect, useRef } from 'react';
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
  const startX = useSharedValue(0);

  // Where the incoming chapter already sits on screen at the moment of the swap, so the spring
  // can pick it up from there. Deliberately a JS ref rather than a shared value: the gesture
  // writes it from the UI thread and this effect reads it from JS, and Reanimated mirrors shared
  // values across threads asynchronously — a shared value could still read 0 here and drop the
  // chapter into place with no movement at all.
  const pendingOffsetRef = useRef(0);

  useLayoutEffect(() => {
    // Runs after the new chapter has rendered but before the frame is presented, so the jump to
    // the incoming chapter's existing position is never visible — only the travel home is.
    translateX.value = pendingOffsetRef.current;
    translateX.value = withSpring(0, springs.default);
    pendingOffsetRef.current = 0;
  }, [chapterKey, translateX]);

  // Called on the JS thread from the gesture, so the offset is stored before onNext/onPrev
  // triggers the re-render that runs the effect above. One wrapper per direction rather than a
  // single `commit(offset, move)`: `runOnJS` serialises its arguments across the thread boundary
  // and a function passed that way arrives as a plain object, not something callable.
  const commitPrev = (offset: number) => {
    pendingOffsetRef.current = offset;
    onPrev();
  };

  const commitNext = (offset: number) => {
    pendingOffsetRef.current = offset;
    onNext();
  };

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
        // At rest the drag offset is zero, so the incoming chapter sits exactly one screen away.
        if (direction === 'next' && hasNext) {
          triggerSelectionHaptic();
          commitNext(screenWidth);
        } else if (direction === 'prev' && hasPrev) {
          triggerSelectionHaptic();
          commitPrev(-screenWidth);
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasNext, hasPrev, onNext, onPrev, screenWidth]
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
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      if (isIgnored.value) return;

      const tx = event.translationX;
      const isBoundary = (tx > 0 && !hasPrev) || (tx < 0 && !hasNext);

      if (isBoundary) {
        translateX.value = startX.value + tx * 0.25;
        if (Math.abs(tx) >= commitThreshold && !hasFiredBoundaryHaptic.value) {
          hasFiredBoundaryHaptic.value = true;
          runOnJS(triggerBoundaryHaptic)();
        }
      } else {
        translateX.value = startX.value + tx;
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
        // The chapter swaps now; the spring afterwards carries content that is already correct,
        // so a second swipe has something to grab immediately instead of waiting out the tail.
        runOnJS(commitPrev)(tx - screenWidth);
      } else if (tx < -commitThreshold && hasNext) {
        runOnJS(triggerSelectionHaptic)();
        runOnJS(commitNext)(tx + screenWidth);
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
