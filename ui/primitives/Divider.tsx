import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

/**
 * Provisional Divider component.
 *
 * NOTE: Inset, weight, and list rhythm governance are NOT decided here and will be
 * addressed in a dedicated component pass. This is a provisional full-bleed hairline.
 */

export type DividerProps = {
  testID?: string;
};

export function Divider({ testID }: DividerProps) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={{
        minWidth: StyleSheet.hairlineWidth,
        minHeight: StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
        backgroundColor: theme.border.subtle,
      }}
    />
  );
}
