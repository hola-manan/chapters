import React from 'react';
import { View } from 'react-native';
import { space } from '../../design';
import { Text } from '../../ui';

export type HeadingBlockProps = {
  text: string;
  level: 1 | 2;
  testID?: string;
};

export function HeadingBlock({ text, level, testID }: HeadingBlockProps) {
  const variant = level === 1 ? 'title3' : 'body';

  return (
    <View
      style={{
        marginTop: space.xl,
        marginBottom: space.sm,
      }}
      testID={testID}
    >
      <Text variant={variant} weight="semibold">
        {text}
      </Text>
    </View>
  );
}
