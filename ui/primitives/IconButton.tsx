import React from 'react';
import { space } from '../../design';
import { Pressable, type PressableHaptic } from './Pressable';

export type IconButtonProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  iconSize?: number;
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

export function IconButton({
  onPress,
  onLongPress,
  iconSize = space.xl,
  haptic = 'none',
  hitSlop,
  disabled,
  flex,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  children,
  testID,
}: IconButtonProps) {
  const calculatedSlop = Math.max(0, (space.minTouchTarget - iconSize) / 2);
  const effectiveHitSlop = hitSlop ?? calculatedSlop;

  return (
    <Pressable
      feedback="opacity"
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={haptic}
      hitSlop={effectiveHitSlop}
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
