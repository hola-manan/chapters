import React from 'react';
import { Pressable, type PressableHaptic } from './Pressable';
import { Text, type TextVariant, type TextWeight } from './Text';

export type TextLinkProps = {
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: TextVariant;
  weight?: TextWeight;
  haptic?: PressableHaptic;
  hitSlop?: number;
  disabled?: boolean;
  flex?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children: React.ReactNode;
  testID?: string;
};

export function TextLink({
  onPress,
  onLongPress,
  variant,
  weight,
  haptic = 'none',
  hitSlop,
  disabled,
  flex,
  accessibilityLabel,
  accessibilityHint,
  children,
  testID,
}: TextLinkProps) {
  return (
    <Pressable
      feedback="opacity"
      accessibilityRole="link"
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={haptic}
      hitSlop={hitSlop}
      disabled={disabled}
      flex={flex}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <Text tone="accent" variant={variant} weight={weight}>
        {children}
      </Text>
    </Pressable>
  );
}
