import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { iconSizes, type IconSizeName } from '../../design';
import { useTheme } from '../theme';

export type IconProps = {
  name: keyof typeof Ionicons.glyphMap;
  size?: IconSizeName;                                                  // default 'body'
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent';  // default 'primary'
  testID?: string;
};

export function Icon({
  name,
  size = 'body',
  tone = 'primary',
  testID,
}: IconProps) {
  const theme = useTheme();
  const pixelSize = iconSizes[size];
  const color = tone === 'accent' ? theme.accent.base : theme.text[tone];

  return <Ionicons name={name} size={pixelSize} color={color} testID={testID} />;
}
