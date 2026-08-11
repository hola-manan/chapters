import React, { createContext, useContext, useMemo } from 'react';
import { readingConfig, readingSizes, type ReadingSizeName } from '../../design';

export type ReadingSizeContextValue = {
  size: ReadingSizeName;
  setSize: (size: ReadingSizeName) => void;
  step: (direction: 'up' | 'down') => void; // clamped at the ends, returns silently at a limit
};

const ReadingSizeContext = createContext<ReadingSizeContextValue | undefined>(undefined);

const SIZE_ORDER: readonly ReadingSizeName[] = ['small', 'default', 'large'];

export function ReadingSizeProvider(props: {
  value: ReadingSizeName;
  onChange: (size: ReadingSizeName) => void;
  children: React.ReactNode;
}): React.ReactElement {
  const { value, onChange, children } = props;

  const contextValue = useMemo<ReadingSizeContextValue>(() => {
    return {
      size: value,
      setSize: onChange,
      step: (direction: 'up' | 'down') => {
        const index = SIZE_ORDER.indexOf(value);
        if (index === -1) return;
        if (direction === 'up' && index < SIZE_ORDER.length - 1) {
          onChange(SIZE_ORDER[index + 1]);
        } else if (direction === 'down' && index > 0) {
          onChange(SIZE_ORDER[index - 1]);
        }
      },
    };
  }, [value, onChange]);

  return (
    <ReadingSizeContext.Provider value={contextValue}>
      {children}
    </ReadingSizeContext.Provider>
  );
}

export function useReadingSize(): ReadingSizeContextValue {
  const context = useContext(ReadingSizeContext);
  if (!context) {
    return {
      size: 'default',
      setSize: () => {},
      step: () => {},
    };
  }
  return context;
}
