import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../../design';
import { HStack } from '../primitives/HStack';
import { Icon } from '../primitives/Icon';
import { IconButton } from '../primitives/IconButton';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';

export type CollapsingHeaderProps = {
  scrollY: SharedValue<number>;
  title: string;
  collapseDistance: number; // px of scroll over which the handover completes
  onBack?: () => void;
  testID?: string;
};

export function CollapsingHeader({
  scrollY,
  title,
  collapseDistance,
  onBack,
  testID,
}: CollapsingHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    const dist = collapseDistance > 0 ? collapseDistance : 1;
    const opacity = interpolate(
      scrollY.value,
      [0, dist],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const dist = collapseDistance > 0 ? collapseDistance : 1;
    const opacity = interpolate(
      scrollY.value,
      [0, dist],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, dist],
      [space.xs, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      testID={testID}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: theme.surface.page,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
          },
          backgroundAnimatedStyle,
        ]}
      />
      <View style={styles.content}>
        <HStack align="center" gap="sm">
          {onBack ? (
            <IconButton onPress={onBack} accessibilityLabel="Back">
              <Icon name="chevron-back" size="lg" />
            </IconButton>
          ) : null}
          <Animated.View style={[{ flex: 1 }, titleAnimatedStyle]}>
            <Text variant="body" weight="semibold" numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
        </HStack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  content: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: space.minTouchTarget,
    justifyContent: 'center',
  },
});
