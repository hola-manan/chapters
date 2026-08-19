import {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

export function useScrollY(): {
  scrollY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
} {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return {
    scrollY,
    scrollHandler,
  };
}
