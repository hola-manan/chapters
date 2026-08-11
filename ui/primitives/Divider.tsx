import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import { useTheme } from '../theme';

/**
 * Provisional Divider component.
 *
 * NOTE: Inset, weight, and list rhythm governance are NOT decided here and will be
 * addressed in a dedicated component pass. Hairline supports optional content inset.
 */

export type DividerProps = {
  inset?: 'none' | 'content';
  testID?: string;
};

export function Divider({ inset = 'none', testID }: DividerProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={{
        minWidth: StyleSheet.hairlineWidth,
        minHeight: StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
        backgroundColor: theme.border.subtle,
        marginLeft: inset === 'content' ? space.lg : 0,
      }}
    />
  );
}

