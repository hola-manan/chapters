import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { space } from '../../design';
import { HStack, PressableCard, Surface, Text, useTheme, VStack } from '../../ui';

export type ImportTileProps = {
  onPress?: () => void;
  disabled?: boolean;
  isImporting?: boolean;
  stage?: string;
  pct?: number;
  testID?: string;
};

export function ImportTile({
  onPress,
  disabled = false,
  isImporting = false,
  testID,
}: ImportTileProps) {
  const theme = useTheme();
  const isDisabled = disabled || isImporting;

  return (
    <PressableCard
      radius="lg"
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      testID={testID}
    >
      <Surface elevation={1} border>
        <View style={styles.container}>
          <HStack align="center" justify="center" gap="sm">
            <Ionicons name="add-circle-outline" size={20} color={theme.accent.base} />
            <Text variant="body" weight="semibold" tone="accent">
              Import a PDF
            </Text>
          </HStack>
        </View>
      </Surface>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
