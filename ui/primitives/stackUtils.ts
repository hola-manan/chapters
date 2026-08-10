import React from 'react';
import { space } from '../../design';
import { Divider } from './Divider';

export type StackGap = 'none' | 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

export type StackJustify = 'start' | 'center' | 'end' | 'between';

export const GAP_MAP: Record<StackGap, number> = {
  none: 0,
  xxs: space.xxs,
  xs: space.xs,
  sm: space.sm,
  md: space.md,
  lg: space.lg,
  xl: space.xl,
  xxl: space.xxl,
  xxxl: space.xxxl,
};

export const JUSTIFY_MAP: Record<StackJustify, 'flex-start' | 'center' | 'flex-end' | 'space-between'> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

export function processStackChildren(children: React.ReactNode, dividers?: boolean): React.ReactNode {
  const validChildren = React.Children.toArray(children).filter(
    (child) => child !== null && child !== undefined && typeof child !== 'boolean'
  );

  if (!dividers || validChildren.length <= 1) {
    return validChildren;
  }

  const result: React.ReactNode[] = [];
  validChildren.forEach((child, index) => {
    if (index > 0) {
      result.push(React.createElement(Divider, { key: `divider-${index}` }));
    }
    result.push(child);
  });
  return result;
}
