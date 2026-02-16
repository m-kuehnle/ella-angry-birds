// Level definitions for Ella vs. The Tomato Towers
// Each level contains tomato positions and apple count

export default [
  // Level 1: Simple Tower
  {
    apples: 3,
    tomatoes: [
      { x: 800, y: 600, scale: 1 },
      { x: 800, y: 520, scale: 1 },
      { x: 800, y: 440, scale: 1 },
      { x: 800, y: 360, scale: 1.3, isKing: true },
    ],
  },

  // Level 2: Wide Base
  {
    apples: 3,
    tomatoes: [
      { x: 750, y: 600, scale: 1 },
      { x: 850, y: 600, scale: 1 },
      { x: 800, y: 520, scale: 1 },
      { x: 800, y: 440, scale: 1 },
      { x: 800, y: 360, scale: 1.3, isKing: true },
    ],
  },

  // Level 3: Pyramid
  {
    apples: 4,
    tomatoes: [
      // Bottom row
      { x: 700, y: 600, scale: 1 },
      { x: 800, y: 600, scale: 1 },
      { x: 900, y: 600, scale: 1 },
      // Middle row
      { x: 750, y: 520, scale: 1 },
      { x: 850, y: 520, scale: 1 },
      // Top
      { x: 800, y: 440, scale: 1.3, isKing: true },
    ],
  },

  // Level 4: Double Tower
  {
    apples: 4,
    tomatoes: [
      // Left tower
      { x: 700, y: 600, scale: 1 },
      { x: 700, y: 520, scale: 1 },
      { x: 700, y: 440, scale: 1 },
      // Right tower
      { x: 900, y: 600, scale: 1 },
      { x: 900, y: 520, scale: 1 },
      { x: 900, y: 440, scale: 1 },
      // Bridge with King
      { x: 800, y: 360, scale: 1.3, isKing: true },
    ],
  },

  // Level 5: Complex Structure
  {
    apples: 5,
    tomatoes: [
      // Base
      { x: 700, y: 600, scale: 1 },
      { x: 800, y: 600, scale: 1 },
      { x: 900, y: 600, scale: 1 },
      { x: 1000, y: 600, scale: 1 },
      // Second layer
      { x: 750, y: 520, scale: 1 },
      { x: 850, y: 520, scale: 1 },
      { x: 950, y: 520, scale: 1 },
      // Third layer
      { x: 800, y: 440, scale: 1 },
      { x: 900, y: 440, scale: 1 },
      // Top - King Tomato
      { x: 850, y: 360, scale: 1.3, isKing: true },
    ],
  },
];
