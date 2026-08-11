import React from 'react';
import { View } from 'react-native';
import { space } from '../../design';
import { HStack, Pressable, Surface, Text } from '../../ui';

// TEMPORARY DEV TOGGLE
// Used to judge undecided design question on device:
// Serial numbers (off vs on)
// When a decision is made, this toggle will be cleaned up.

export type DevTogglesProps = {
  showSerials: boolean;
  onToggleSerials: (show: boolean) => void;
};

export function DevToggles({ showSerials, onToggleSerials }: DevTogglesProps) {
  return (
    <View style={{ paddingVertical: space.xs }}>
      <HStack gap="xs" align="center">
        <Pressable onPress={() => onToggleSerials(!showSerials)}>
          <Surface sunken paddingX="sm" paddingY="xs" radius="sm">
            <Text variant="caption" tone="secondary">
              Serials: {showSerials ? 'On' : 'Off'}
            </Text>
          </Surface>
        </Pressable>
      </HStack>
    </View>
  );
}

