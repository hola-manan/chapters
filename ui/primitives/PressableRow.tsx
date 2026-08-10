import React from 'react';
import { Pressable, type PressableHaptic } from './Pressable';

export type PressableRowProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  haptic?: PressableHaptic;
  hitSlop?: number;
  disabled?: boolean;
  flex?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children: React.ReactNode;
  testID?: string;
};

export function PressableRow({
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
}: PressableRowProps) {
  return (
    <Pressable
      feedback="overlay"
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
