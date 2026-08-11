import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { space } from '../../design';
import { HStack, PressableCard, Surface, Text, useTheme, VStack } from '../../ui';

export type ImportTileProps = {
  onPress?: () => void;
  isImporting?: boolean;
  stage?: string;
  pct?: number;
  testID?: string;
};

export function ImportTile({
  onPress,
  isImporting = false,
  stage,
  pct = 0,
  testID,
}: ImportTileProps) {
  const theme = useTheme();

  return (
    <PressableCard
      radius="lg"
      onPress={isImporting ? undefined : onPress}
      disabled={isImporting}
      testID={testID}
    >
      <Surface elevation={1} border>
        <View style={styles.container}>
          {isImporting ? (
            <VStack align="center" justify="center" gap="xs">
              <Text variant="body" weight="medium" align="center">
                Importing PDF...
              </Text>
              <Text variant="footnote" tone="secondary" align="center">
                {stage ? `${stage} (${pct}%)` : `${pct}%`}
              </Text>
            </VStack>
          ) : (
            <HStack align="center" justify="center" gap="sm">
              <Ionicons name="add-circle-outline" size={20} color={theme.accent.base} />
              <Text variant="body" weight="semibold" tone="accent">
                Import a PDF
              </Text>
            </HStack>
          )}
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
