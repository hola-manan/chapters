import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from '../../design';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<Theme | null>(null);
export const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  themeOverride?: 'light' | 'dark';
  mode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
}

export function ThemeProvider({ children, themeOverride, mode = 'system', onModeChange }: ThemeProviderProps) {
  const scheme = useColorScheme();

  const resolvedOverride = themeOverride ?? (mode === 'system' ? undefined : mode);

  const theme = useMemo(() => {
    if (resolvedOverride === 'light') return lightTheme;
    if (resolvedOverride === 'dark') return darkTheme;
    return scheme === 'dark' ? darkTheme : lightTheme;
  }, [scheme, resolvedOverride]);

  const modeContextValue = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      setMode: onModeChange ?? (() => {}),
    }),
    [mode, onModeChange]
  );

  return (
    <ThemeContext.Provider value={theme}>
      <ThemeModeContext.Provider value={modeContextValue}>
        {children}
      </ThemeModeContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    return {
      mode: 'system',
      setMode: () => {},
    };
  }
  return context;
}

