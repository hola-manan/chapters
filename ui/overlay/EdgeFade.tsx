import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { withAlpha } from '../../design';
import { useTheme } from '../theme';

export type EdgeFadeProps = {
  edge: 'top' | 'bottom';
  /** Fully opaque band at the outer edge. Usually the safe-area inset. Defaults to 0. */
  solidHeight?: number;
  /** Gradient span between the solid band and the content. */
  fadeHeight: number;
  /** Defaults to theme.surface.page. */
  color?: string;
  testID?: string;
};

export function EdgeFade({
  edge,
  solidHeight = 0,
  fadeHeight,
  color,
  testID,
}: EdgeFadeProps) {
  const theme = useTheme();
  const c = color ?? theme.surface.page;
  const totalHeight = solidHeight + fadeHeight;

  if (totalHeight <= 0) {
    return null;
  }

  const solidRatio = solidHeight / totalHeight;

  const colors: readonly [string, string, string] =
    edge === 'top'
      ? [c, c, withAlpha(c, 0)]
      : [withAlpha(c, 0), c, c];

  const locations: readonly [number, number, number] =
    edge === 'top'
      ? [0, solidRatio, 1]
      : [0, 1 - solidRatio, 1];

  return (
    <LinearGradient
      testID={testID}
      pointerEvents="none"
      colors={colors}
      locations={locations}
      style={[
        styles.base,
        edge === 'top' ? styles.top : styles.bottom,
        { height: totalHeight },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
