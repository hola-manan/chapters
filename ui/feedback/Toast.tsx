import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, space, springs } from '../../design';
import { Pressable } from '../primitives/Pressable';
import { Surface } from '../primitives/Surface';
import { Text } from '../primitives/Text';

export type ToastOptions = {
  message: string;
  onPress?: () => void; // makes the toast tappable
  durationMs?: number; // default 4000
};

export type ToastContextValue = {
  show: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue<number>(space.xxxl);
  const opacity = useSharedValue<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishDismiss = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const dismissToast = useCallback(() => {
    clearTimer();
    if (isReducedMotion) {
      opacity.value = withTiming(0, { duration: motion.durations.instant }, (finished) => {
        if (finished) {
          runOnJS(finishDismiss)();
        }
      });
    } else {
      translateY.value = withSpring(space.xxxl, springs.default);
      opacity.value = withTiming(0, { duration: motion.durations.fast }, (finished) => {
        if (finished) {
          runOnJS(finishDismiss)();
        }
      });
    }
  }, [clearTimer, finishDismiss, isReducedMotion, opacity, translateY]);

  const show = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      setCurrentToast(options);

      if (isReducedMotion) {
        translateY.value = 0;
        opacity.value = withTiming(1, { duration: motion.durations.instant });
      } else {
        translateY.value = withSpring(0, springs.default);
        opacity.value = withSpring(1, springs.default);
      }

      const duration = options.durationMs ?? motion.durations.toast;
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, duration);
    },
    [clearTimer, dismissToast, isReducedMotion, opacity, translateY]
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const handlePress = () => {
    if (!currentToast) return;
    const onPressFn = currentToast.onPress;
    dismissToast();
    if (onPressFn) {
      onPressFn();
    }
  };

  const toastAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {currentToast ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            {
              bottom: insets.bottom + space.lg,
              paddingHorizontal: space.lg,
            },
          ]}
        >
          <Animated.View style={[styles.toastContainer, toastAnimatedStyle]}>
            <Pressable
              feedback={currentToast.onPress ? 'opacity' : 'none'}
              radius="pill"
              onPress={handlePress}
            >
              <Surface elevation={2} radius="pill" border paddingX="lg" paddingY="md">
                <Text variant="footnote" weight="medium" align="center" numberOfLines={2}>
                  {currentToast.message}
                </Text>
              </Surface>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toastContainer: {
    maxWidth: '100%',
    alignItems: 'center',
  },
});
