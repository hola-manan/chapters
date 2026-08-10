import React from 'react';
import { View } from 'react-native';
import {
  GAP_MAP,
  JUSTIFY_MAP,
  processStackChildren,
  StackGap,
  StackJustify,
} from './stackUtils';

export type HStackAlign = 'center' | 'start' | 'end' | 'baseline';

const HSTACK_ALIGN_MAP: Record<HStackAlign, 'center' | 'flex-start' | 'flex-end' | 'baseline'> = {
  center: 'center',
  start: 'flex-start',
  end: 'flex-end',
  baseline: 'baseline',
};

export type HStackProps = {
  gap?: StackGap;
  align?: HStackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  dividers?: boolean;
  flex?: boolean;
  children: React.ReactNode;
  testID?: string;
};

export function HStack({
  gap = 'none',
  align = 'center',
  justify,
  wrap,
  dividers,
  flex,
  children,
  testID,
}: HStackProps) {
  const processedChildren = processStackChildren(children, dividers);

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: HSTACK_ALIGN_MAP[align],
        ...(justify ? { justifyContent: JUSTIFY_MAP[justify] } : undefined),
        ...(wrap ? { flexWrap: 'wrap' } : undefined),
        ...(gap !== 'none' ? { gap: GAP_MAP[gap] } : undefined),
        ...(flex ? { flex: 1 } : undefined),
      }}
    >
      {processedChildren}
    </View>
  );
}
