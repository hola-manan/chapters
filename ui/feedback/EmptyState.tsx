import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import { Text } from '../primitives/Text';
import { VStack } from '../primitives/VStack';

export type EmptyStateProps = {
  title?: string;
  message: string;
  children?: React.ReactNode;
  testID?: string;
};

export function EmptyState({
  title,
  message,
  children,
  testID,
}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <VStack align="center" gap="xs">
        {title ? (
          <Text variant="body" weight="semibold" align="center">
            {title}
          </Text>
        ) : null}
        <View style={styles.messageContainer}>
          <Text variant="subhead" tone="secondary" align="center">
            {message}
          </Text>
        </View>
        {children}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    maxWidth: '85%',
  },
});
