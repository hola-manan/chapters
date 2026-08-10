import { darkGround, darkInk, forest, neutrals, overlay, pure, teal } from './tokens/color';

/**
 * Semantic theme definitions.
 * Names describe roles, never appearance.
 * Consumes primitives from tokens/color — contains no hex literals.
 */

export interface Theme {
  surface: {
    page: string;
    raised: string;
    sunken: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    onAccent: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  accent: {
    base: string;
    pressed: string;
    tint: string;
  };
  state: {
    pressOverlay: string;
  };
}

export const lightTheme: Theme = {
  surface: {
    page: neutrals.paper,
    raised: pure.white,
    sunken: neutrals[100],
  },
  text: {
    primary: forest[900],
    secondary: forest[600],
    tertiary: forest[400],
    onAccent: pure.white,
  },
  border: {
    subtle: forest[100],
    strong: forest[200],
  },
  accent: {
    base: teal.base,
    pressed: teal.pressed,
    tint: teal.tint,
  },
  state: {
    pressOverlay: overlay.lightPress,
  },
};

// Derived dark theme.
// Note: This theme is derived algorithmically from light values and has not yet been reviewed on device.
export const darkTheme: Theme = {
  surface: {
    page: darkGround[900],
    raised: darkGround[800],
    sunken: darkGround.sunken,
  },
  text: {
    primary: darkInk.primary,
    secondary: darkInk.secondary,
    tertiary: darkInk.tertiary,
    onAccent: darkGround[900],
  },
  border: {
    subtle: overlay.darkBorderSubtle,
    strong: overlay.darkBorderStrong,
  },
  accent: {
    base: teal.light,
    pressed: teal.base,
    tint: overlay.darkAccentTint,
  },
  state: {
    pressOverlay: overlay.darkPress,
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;
