import React from 'react';
import { Pressable, type PressableHaptic, type PressableRadius } from './Pressable';

export type PressableCardProps = {
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
  children: React.ReactNode;
  testID?: string;
};

export function PressableCard({
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
}: PressableCardProps) {
  return (
    <Pressable
      feedback="scale"
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
