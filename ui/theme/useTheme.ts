import { useContext } from 'react';
import type { Theme } from '../../design';
import { ThemeContext } from './ThemeProvider';

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}
