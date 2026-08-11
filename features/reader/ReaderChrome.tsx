import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../../design';
import { HStack, IconButton, Text, useTheme } from '../../ui';

export type ReaderChromeProps = {
  visibility: SharedValue<number>;
  isVisible: boolean;
  bookTitle: string;
  onBack: () => void;
  testID?: string;
};

export function ReaderChrome({
  visibility,
  isVisible,
  bookTitle,
  onBack,
  testID,
}: ReaderChromeProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useReducedMotion();
  const barHeight = useSharedValue(100);

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      barHeight.value = h;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    const h = barHeight.value > 0 ? barHeight.value : 100;
    if (isReducedMotion) {
      return {
        opacity: visibility.value,
        transform: [{ translateY: 0 }],
      };
    }
    const translateY = interpolate(visibility.value, [0, 1], [-h, 0]);
    return {
      transform: [{ translateY }],
      opacity: visibility.value,
    };
  });

  return (
    <Animated.View
      onLayout={handleLayout}
      pointerEvents={isVisible ? 'auto' : 'none'}
      testID={testID}
      style={[
        styles.chromeContainer,
        {
          paddingTop: insets.top,
          backgroundColor: theme.surface.page,
          borderBottomColor: theme.border.subtle,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <HStack align="center" gap="sm">
          <IconButton onPress={onBack} accessibilityLabel="Back to contents">
            <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
          </IconButton>
          <Text variant="footnote" tone="secondary" numberOfLines={1} flex>
            {bookTitle}
          </Text>
        </HStack>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chromeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
