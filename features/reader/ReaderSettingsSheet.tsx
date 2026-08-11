import React from 'react';
import type { ReadingSizeName } from '../../design';
import { SegmentedControl, Sheet, Text, VStack } from '../../ui';

export type ReaderSettingsSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  readingSize: ReadingSizeName;
  onChangeReadingSize: (size: ReadingSizeName) => void;
  themeMode: 'light' | 'dark' | 'system';
  onChangeThemeMode: (mode: 'light' | 'dark' | 'system') => void;
};

const SIZE_OPTIONS: readonly { value: ReadingSizeName; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
];

const THEME_OPTIONS: readonly { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ReaderSettingsSheet({
  visible,
  onDismiss,
  readingSize,
  onChangeReadingSize,
  themeMode,
  onChangeThemeMode,
}: ReaderSettingsSheetProps) {
  return (
    <Sheet visible={visible} onDismiss={onDismiss} testID="reader-settings-sheet">
      <VStack gap="lg">
        <VStack gap="xs">
          <Text variant="caption" tone="secondary" weight="semibold">
            TEXT SIZE
          </Text>
          <SegmentedControl
            options={SIZE_OPTIONS}
            value={readingSize}
            onChange={onChangeReadingSize}
            testID="reading-size-segmented-control"
          />
        </VStack>

        <VStack gap="xs">
          <Text variant="caption" tone="secondary" weight="semibold">
            APPEARANCE
          </Text>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={themeMode}
            onChange={onChangeThemeMode}
            testID="theme-mode-segmented-control"
          />
        </VStack>
      </VStack>
    </Sheet>
  );
}
