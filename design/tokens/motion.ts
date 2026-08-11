/**
 * Motion tokens: spring configs, durations, cubic-bezier easings.
 * Data only, no Reanimated or Animated imports.
 * Zero external imports.
 */

export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export const springs = {
  gentle: { damping: 24, stiffness: 180, mass: 1 },
  default: { damping: 20, stiffness: 220, mass: 1 },
  snappy: { damping: 16, stiffness: 280, mass: 0.8 },
} as const satisfies Record<string, SpringConfig>;

export const durations = {
  instant: 90,
  fast: 160,
  base: 220,
  slow: 360,
} as const;

export const easings = {
  // Cubic-bezier control points [x1, y1, x2, y2]
  standard: [0.2, 0, 0, 1] as const,
  accelerate: [0.3, 0, 1, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
} as const;

export const reducedMotion = {
  duration: 100,
  easing: [0, 0, 1, 1] as const,
} as const;

export const press = {
  scale: 0.99,
  spring: springs.default,
} as const satisfies { scale: number; spring: SpringConfig };

export const motion = {
  springs,
  durations,
  easings,
  reducedMotion,
  press,
} as const;
