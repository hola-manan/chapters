import React from 'react';
import { Pressable, type PressableHaptic, type PressableRadius } from './Pressable';

export type TapRegionProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  haptic?: PressableHaptic;
  radius?: PressableRadius;
  hitSlop?: number;
  disabled?: boolean;
  flex?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children?: React.ReactNode;
  testID?: string;
};

export function TapRegion({
  onPress,
  onLongPress,
  haptic = 'none',
  radius = 'none',
  hitSlop,
  disabled,
  flex,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  children,
  testID,
}: TapRegionProps) {
  return (
    <Pressable
      feedback="none"
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={haptic}
      radius={radius}
      hitSlop={hitSlop}
      disabled={disabled}
      flex={flex}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
