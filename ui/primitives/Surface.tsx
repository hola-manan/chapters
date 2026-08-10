import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius as radiusTokens, shadow as shadowTokens } from '../../design';
import { useTheme } from '../theme';
import { GAP_MAP, type StackGap } from './stackUtils';

export type SurfacePadding = StackGap;

export type SurfaceProps = {
  elevation?: 0 | 1 | 2; // 0 page · 1 raised · 2 floating
  sunken?: boolean; // deliberately outside the ladder
  padding?: SurfacePadding; // all sides
  paddingX?: SurfacePadding; // overrides padding horizontally
  paddingY?: SurfacePadding; // overrides padding vertically
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'pill';
  border?: boolean; // hairline in theme.border.subtle
  flex?: boolean;
  children: React.ReactNode;
  testID?: string;
};

export function Surface({
  elevation = 0,
  sunken = false,
  padding = 'none',
  paddingX,
  paddingY,
  radius = 'none',
  border = false,
  flex = false,
  children,
  testID,
}: SurfaceProps) {
  const theme = useTheme();

  const backgroundColor = sunken
    ? theme.surface.sunken
    : elevation === 2
    ? theme.surface.floating
    : elevation === 1
    ? theme.surface.raised
    : theme.surface.page;

  const shadowStyle =
    elevation === 2
      ? {
          shadowColor: theme.shadow.color,
          shadowOffset: {
            width: shadowTokens.md.offsetX,
            height: shadowTokens.md.offsetY,
          },
          shadowRadius: shadowTokens.md.blur,
          shadowOpacity: shadowTokens.md.opacity,
          elevation: 2,
        }
      : undefined;

  const paddingVal = GAP_MAP[padding];
  const paddingXVal = paddingX !== undefined ? GAP_MAP[paddingX] : undefined;
  const paddingYVal = paddingY !== undefined ? GAP_MAP[paddingY] : undefined;

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor,
          padding: paddingVal,
          ...(paddingXVal !== undefined && { paddingHorizontal: paddingXVal }),
          ...(paddingYVal !== undefined && { paddingVertical: paddingYVal }),
          borderRadius: radiusTokens[radius],
          ...(border && {
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border.subtle,
          }),
          ...(flex && { flex: 1 }),
        },
        shadowStyle,
      ]}
    >
      {children}
    </View>
  );
}
