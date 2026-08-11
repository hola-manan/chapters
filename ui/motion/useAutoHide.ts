import { useCallback, useState } from 'react';
import {
  runOnJS,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { reducedMotion, springs } from '../../design';

export type UseAutoHideOptions = {
  threshold?: number; // px of movement before committing, default 10
  initiallyVisible?: boolean; // default true
};

export type AutoHide = {
  visibility: SharedValue<number>; // 0 hidden, 1 visible — animated on the UI thread
  isVisible: boolean; // JS mirror, for pointerEvents only
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  toggle: () => void;
};

export function useAutoHide(options?: UseAutoHideOptions): AutoHide {
  const threshold = options?.threshold ?? 10;
  const initiallyVisible = options?.initiallyVisible ?? true;

  const visibility = useSharedValue(initiallyVisible ? 1 : 0);
  const [isVisible, setIsVisible] = useState(initiallyVisible);

  // Intent, as distinct from `visibility`, which is mid-flight while the spring settles.
  // Every decision below compares against this: comparing against the animated value would
  // see "not yet 0" on every frame of a hide and restart the spring on each scroll event,
  // so the bar would never actually arrive anywhere.
  const target = useSharedValue(initiallyVisible ? 1 : 0);

  const prevOffset = useSharedValue(0);
  const accumulatedDelta = useSharedValue(0);

  // The tap/scroll conflict, and the rule that resolves it:
  // if the user taps to hide, an upward scroll must not immediately undo that. Set by a
  // hide-toggle, cleared the next time the user deliberately scrolls down.
  const suppressReveal = useSharedValue(false);
  const isReducedMotion = useReducedMotion();

  const setVisibleJS = (visible: boolean) => {
    setIsVisible(visible);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const applyTarget = (next: number) => {
        if (target.value === next) return;
        target.value = next;
        visibility.value = isReducedMotion
          ? withTiming(next, { duration: reducedMotion.duration })
          : withSpring(next, springs.default);
        runOnJS(setVisibleJS)(next === 1);
      };

      const y = event.contentOffset.y;
      const dy = y - prevOffset.value;
      prevOffset.value = y;

      // At the top of the content there is nothing to hide for, so the bar comes back —
      // unless the reader explicitly dismissed it, which outranks the position rule.
      if (y <= threshold) {
        accumulatedDelta.value = 0;
        if (!suppressReveal.value) {
          applyTarget(1);
        }
        return;
      }

      // A change of direction restarts the accumulator, so the threshold measures movement
      // in one direction rather than net movement over the whole gesture.
      if ((dy > 0 && accumulatedDelta.value < 0) || (dy < 0 && accumulatedDelta.value > 0)) {
        accumulatedDelta.value = 0;
      }
      accumulatedDelta.value += dy;

      if (accumulatedDelta.value >= threshold) {
        // A deliberate downward scroll is what clears a tap-dismissal: the reader has moved
        // on, so the next upward scroll is allowed to bring the bar back.
        suppressReveal.value = false;
        applyTarget(0);
      } else if (accumulatedDelta.value <= -threshold) {
        if (!suppressReveal.value) {
          applyTarget(1);
        }
      }
    },
  });

  const toggle = useCallback(() => {
    const next = target.value === 1 ? 0 : 1;
    target.value = next;
    // Tapping to hide suppresses scroll-reveal; tapping to show clears the suppression.
    suppressReveal.value = next === 0;
    visibility.value = isReducedMotion
      ? withTiming(next, { duration: reducedMotion.duration })
      : withSpring(next, springs.default);
    setIsVisible(next === 1);
  }, [isReducedMotion, visibility, target, suppressReveal]);

  return {
    visibility,
    isVisible,
    scrollHandler,
    toggle,
  };
}
