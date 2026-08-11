import React from 'react';
import { View } from 'react-native';
import { space } from '../../design';
import { HStack, Pressable, Surface, Text } from '../../ui';

// TEMPORARY DEV TOGGLES
// Used to judge undecided design questions on device:
// 1. Dividers (none vs hairline with inset)
// 2. Serial numbers (off vs on)
// When a decision is made, both toggles and the losing branch will be deleted.

export type DevTogglesProps = {
  dividerMode: 'none' | 'inset';
  onToggleDivider: (mode: 'none' | 'inset') => void;
  showSerials: boolean;
  onToggleSerials: (show: boolean) => void;
};

export function DevToggles({
  dividerMode,
  onToggleDivider,
  showSerials,
  onToggleSerials,
}: DevTogglesProps) {
  return (
    <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
      <HStack gap="xs" align="center">
        <Pressable
          onPress={() => onToggleDivider(dividerMode === 'none' ? 'inset' : 'none')}
        >
          <Surface sunken paddingX="sm" paddingY="xs" radius="sm">
            <Text variant="caption" tone="secondary">
              Dividers: {dividerMode === 'none' ? 'Off' : 'Inset'}
            </Text>
          </Surface>
        </Pressable>

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
