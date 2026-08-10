import React, { createContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from '../../design';

export const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  themeOverride?: 'light' | 'dark';
}

export function ThemeProvider({ children, themeOverride }: ThemeProviderProps) {
  const scheme = useColorScheme();

  const theme = useMemo(() => {
    if (themeOverride === 'light') return lightTheme;
    if (themeOverride === 'dark') return darkTheme;
    return scheme === 'dark' ? darkTheme : lightTheme;
  }, [scheme, themeOverride]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
