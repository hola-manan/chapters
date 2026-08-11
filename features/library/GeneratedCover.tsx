import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius as radiusTokens, type RadiusKey } from '../../design';
import { useTheme } from '../../ui';

export const COVER_ASPECT_RATIO = 16 / 9;

export type GeneratedCoverProps = {
  seed: string;
  radius?: RadiusKey;
  testID?: string;
};

/**
 * Stable, non-random string hashing algorithm (djb2).
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function GeneratedCover({
  seed,
  radius = 'none',
  testID,
}: GeneratedCoverProps) {
  const theme = useTheme();
  const h = hashString(seed || 'default');

  // Palette constrained to the app's teal (175°) - forest (155°) - slate (195°) arc
  const baseHue = 150 + (h % 45); // 150deg to 195deg

  // Use explicit theme scheme for procedural lightness band calculation
  const isDark = theme.scheme === 'dark';

  // Lightness and saturation ranges tuned for visual comfort in light/dark themes
  const bgSat = 20 + (h % 15);
  const bgLight = isDark ? 14 + (h % 8) : 88 + (h % 6);
  const bgColor = `hsl(${baseHue}, ${bgSat}%, ${bgLight}%)`;

  const hue1 = (baseHue + 15) % 360;
  const hue2 = (baseHue - 15 + 360) % 360;
  const hue3 = (baseHue + 30) % 360;

  const shape1Color = isDark
    ? `hsla(${hue1}, ${30 + (h % 20)}%, ${65 + (h % 20)}%, 0.16)`
    : `hsla(${hue1}, ${30 + (h % 20)}%, ${40 + (h % 25)}%, 0.18)`;

  const shape2Color = isDark
    ? `hsla(${hue2}, ${25 + (h % 15)}%, ${50 + (h % 25)}%, 0.12)`
    : `hsla(${hue2}, ${25 + (h % 15)}%, ${25 + (h % 20)}%, 0.12)`;

  const shape3Color = isDark
    ? `hsla(${hue3}, ${35 + (h % 15)}%, ${75 + (h % 15)}%, 0.10)`
    : `hsla(${hue3}, ${35 + (h % 15)}%, ${50 + (h % 20)}%, 0.15)`;

  const layoutPreset = (h >> 3) % 3;
  const borderRadius = radiusTokens[radius];

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderRadius,
        },
      ]}
    >
      {layoutPreset === 0 && (
        <>
          {/* Large top-right circle */}
          <View
            style={[
              styles.absoluteShape,
              {
                top: '-30%',
                right: '-20%',
                width: '90%',
                aspectRatio: 1,
                borderRadius: 999,
                backgroundColor: shape1Color,
              },
            ]}
          />
          {/* Bottom-left tilted rectangle */}
          <View
            style={[
              styles.absoluteShape,
              {
                bottom: '-25%',
                left: '-15%',
                width: '65%',
                height: '85%',
                borderRadius: radiusTokens.lg,
                backgroundColor: shape2Color,
                transform: [{ rotate: '-18deg' }],
              },
            ]}
          />
        </>
      )}

      {layoutPreset === 1 && (
        <>
          {/* Left sweeping arc card */}
          <View
            style={[
              styles.absoluteShape,
              {
                top: '-40%',
                left: '-20%',
                width: '80%',
                height: '150%',
                borderRadius: radiusTokens.xxl,
                backgroundColor: shape1Color,
                transform: [{ rotate: '14deg' }],
              },
            ]}
          />
          {/* Right soft accent pill */}
          <View
            style={[
              styles.absoluteShape,
              {
                bottom: '-30%',
                right: '-10%',
                width: '60%',
                height: '110%',
                borderRadius: radiusTokens.pill,
                backgroundColor: shape3Color,
                transform: [{ rotate: '-22deg' }],
              },
            ]}
          />
        </>
      )}

      {layoutPreset === 2 && (
        <>
          {/* Diagonal mid band */}
          <View
            style={[
              styles.absoluteShape,
              {
                top: '10%',
                left: '-30%',
                width: '150%',
                height: '55%',
                borderRadius: radiusTokens.xl,
                backgroundColor: shape2Color,
                transform: [{ rotate: '-32deg' }],
              },
            ]}
          />
          {/* Top accent circle */}
          <View
            style={[
              styles.absoluteShape,
              {
                top: '-20%',
                right: '10%',
                width: '45%',
                aspectRatio: 1,
                borderRadius: 999,
                backgroundColor: shape1Color,
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: COVER_ASPECT_RATIO,
    overflow: 'hidden',
    position: 'relative',
  },
  absoluteShape: {
    position: 'absolute',
  },
});
