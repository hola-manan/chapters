import React, { useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, radius, space, springs } from '../../design';
import { Surface } from '../primitives/Surface';
import { useTheme } from '../theme';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export type SheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  testID?: string;
};

export function Sheet({ visible, onDismiss, children, testID }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();

  const [modalVisible, setModalVisible] = useState(visible);

  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  // Zero until measured. The panel is held invisible until then rather than guessing a height —
  // a guess that is wrong shows the panel part-way up before it animates.
  const panelHeight = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      panelHeight.value = h;
    }
  };

  const handleDismissComplete = useCallback(() => {
    setModalVisible(false);
    onDismiss();
  }, [onDismiss]);

  const animateIn = useCallback(() => {
    dragY.value = 0;
    if (isReducedMotion) {
      progress.value = withTiming(1, { duration: motion.durations.instant });
    } else {
      progress.value = withSpring(1, springs.default);
    }
  }, [isReducedMotion, progress, dragY]);

  const animateOut = useCallback(() => {
    if (isReducedMotion) {
      progress.value = withTiming(0, { duration: motion.durations.instant }, (finished) => {
        if (finished) {
          runOnJS(handleDismissComplete)();
        }
      });
    } else {
      progress.value = withSpring(0, springs.default, (finished) => {
        if (finished) {
          runOnJS(handleDismissComplete)();
        }
      });
    }
  }, [isReducedMotion, progress, handleDismissComplete]);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      animateIn();
    } else if (modalVisible) {
      animateOut();
    }
  }, [visible, modalVisible, animateIn, animateOut]);

  const triggerDismiss = useCallback(() => {
    animateOut();
  }, [animateOut]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        dragY.value = event.translationY * motion.dismiss.resistance;
      } else {
        dragY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      const h = panelHeight.value;
      const distanceThreshold = h * motion.dismiss.distanceRatio;

      if (
        (h > 0 && event.translationY > distanceThreshold) ||
        event.velocityY > motion.dismiss.flickVelocity
      ) {
        runOnJS(triggerDismiss)();
      } else {
        dragY.value = withSpring(0, springs.default);
      }
    });

  const panelAnimatedStyle = useAnimatedStyle(() => {
    const h = panelHeight.value;
    if (isReducedMotion) {
      return {
        opacity: h > 0 ? progress.value : 0,
        transform: [{ translateY: dragY.value > 0 ? dragY.value : 0 }],
      };
    }
    return {
      opacity: h > 0 ? 1 : 0,
      transform: [{ translateY: (1 - progress.value) * h + dragY.value }],
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={triggerDismiss}
      testID={testID}
    >
      <View style={styles.modalRoot}>
        {/* Animated Blur Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={triggerDismiss}>
            <AnimatedBlurView
              intensity={50}
              tint={theme.scheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </Pressable>
        </Animated.View>

        {/* Bottom Panel */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={handleLayout}
            style={[
              styles.panelContainer,
              {
                paddingBottom: insets.bottom + space.lg,
              },
              panelAnimatedStyle,
            ]}
          >
            <View style={styles.panelShadowClip}>
              <Surface elevation={2} radius="none">
                <View
                  style={[
                    styles.surfaceInner,
                    {
                      backgroundColor: theme.surface.floating,
                      borderTopLeftRadius: radius.xxl,
                      borderTopRightRadius: radius.xxl,
                    },
                  ]}
                >
                  {/* Grab Handle */}
                  <View style={styles.grabHandleRow}>
                    <View
                      style={[
                        styles.grabHandle,
                        {
                          backgroundColor: theme.border.subtle,
                        },
                      ]}
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.contentPadding}>{children}</View>
                </View>
              </Surface>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panelContainer: {
    width: '100%',
  },
  panelShadowClip: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  surfaceInner: {
    paddingTop: space.sm,
  },
  grabHandleRow: {
    alignItems: 'center',
    paddingVertical: space.xs,
  },
  grabHandle: {
    width: space.xxl,
    height: space.xs,
    borderRadius: radius.pill,
  },
  contentPadding: {
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
});
