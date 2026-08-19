import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import { HStack, Icon, PressableCard, Surface, Text } from '../../ui';

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
            <Icon name="add-circle-outline" size="body" tone="accent" />
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
