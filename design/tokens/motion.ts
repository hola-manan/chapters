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
  spin: 900,
  toast: 4000,
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

export const dismiss = {
  // Points per second. A downward flick faster than this dismisses however far it travelled —
  // deciding on distance alone makes a fast flick feel ignored.
  flickVelocity: 500,
  // Fraction of the panel's own height that counts as dragged away.
  distanceRatio: 1 / 3,
  // Multiplier applied to drags in the direction with nowhere to go.
  resistance: 0.2,
} as const;

export const motion = {
  springs,
  durations,
  easings,
  reducedMotion,
  press,
  dismiss,
} as const;
