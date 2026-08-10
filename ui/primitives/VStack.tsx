import React from 'react';
import { View } from 'react-native';
import {
  GAP_MAP,
  JUSTIFY_MAP,
  processStackChildren,
  StackGap,
  StackJustify,
} from './stackUtils';

export type VStackAlign = 'stretch' | 'start' | 'center' | 'end';

const VSTACK_ALIGN_MAP: Record<VStackAlign, 'stretch' | 'flex-start' | 'center' | 'flex-end'> = {
  stretch: 'stretch',
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
};

export type VStackProps = {
  gap?: StackGap;
  align?: VStackAlign;
  justify?: StackJustify;
  dividers?: boolean;
  flex?: boolean;
  children: React.ReactNode;
  testID?: string;
};

export function VStack({
  gap = 'none',
  align = 'stretch',
  justify,
  dividers,
  flex,
  children,
  testID,
}: VStackProps) {
  const processedChildren = processStackChildren(children, dividers);

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'column',
        alignItems: VSTACK_ALIGN_MAP[align],
        ...(justify ? { justifyContent: JUSTIFY_MAP[justify] } : undefined),
        ...(gap !== 'none' ? { gap: GAP_MAP[gap] } : undefined),
        ...(flex ? { flex: 1 } : undefined),
      }}
    >
      {processedChildren}
    </View>
  );
}
