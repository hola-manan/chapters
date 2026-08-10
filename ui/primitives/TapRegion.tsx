import React from 'react';
import { Pressable, type PressableHaptic } from './Pressable';

export type TapRegionProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  haptic?: PressableHaptic;
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
