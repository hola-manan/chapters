import React from 'react';
import type { SpringConfig } from '../../design';
import { Pressable, type PressableHaptic } from './Pressable';

export type PressableCardProps = {
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
  scaleTarget?: number;
  springConfig?: SpringConfig;
};

export function PressableCard({
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
  scaleTarget,
  springConfig,
}: PressableCardProps) {
  return (
    <Pressable
      feedback="scale"
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
      scaleTarget={scaleTarget}
      springConfig={springConfig}
    >
      {children}
    </Pressable>
  );
}
