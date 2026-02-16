import { generateTomatoHousePlan } from "./tomatoHouseRules.js";

describe("TomatoHouseRules - AABB Collision Detection", () => {
  test("should prevent overlapping stone blocks", () => {
    const tomatoes = [
      { x: 0, y: 0, scale: 1 },
      { x: 10, y: 0, scale: 1 }, // Too close to first tomato
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Should reject some placements due to overlap
    expect(result.rejected.length).toBeGreaterThan(0);
    const overlapRejections = result.rejected.filter(
      (r) => r.failedRule === "NO_OVERLAP",
    );
    expect(overlapRejections.length).toBeGreaterThan(0);
  });

  test("should allow non-overlapping blocks", () => {
    const tomatoes = [
      { x: 0, y: 0, scale: 1 },
      { x: 200, y: 0, scale: 1 }, // Far enough apart
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Both tomatoes should be placed successfully
    expect(result.tomatoPlacements.size).toBe(2);
    expect(result.tomatoPlacements.has(0)).toBe(true);
    expect(result.tomatoPlacements.has(1)).toBe(true);
  });

  test("should detect AABB overlap with correct half-width calculations", () => {
    const tomatoes = [{ x: 0, y: 0, scale: 1 }];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Check that blocks were created with proper spacing
    expect(result.blocks.length).toBeGreaterThan(0);

    // Verify no overlapping blocks in the final structure
    for (let i = 0; i < result.blocks.length; i++) {
      for (let j = i + 1; j < result.blocks.length; j++) {
        const blockA = result.blocks[i];
        const blockB = result.blocks[j];

        // Calculate bounds
        const getBounds = (block) => {
          const baseW = block.texture === "woodstick" ? 80 : 60;
          const baseH = block.texture === "woodstick" ? 40 : 55;
          const scaleX = block.scaleX || block.scale || 1;
          const scaleY = block.scaleY || block.scale || 1;
          return {
            hw: (baseW * scaleX) / 2 - 4,
            hh: (baseH * scaleY) / 2 - 4,
          };
        };

        const boundsA = getBounds(blockA);
        const boundsB = getBounds(blockB);

        const overlapping =
          blockA.x - boundsA.hw < blockB.x + boundsB.hw &&
          blockA.x + boundsA.hw > blockB.x - boundsB.hw &&
          blockA.y - boundsA.hh < blockB.y + boundsB.hh &&
          blockA.y + boundsA.hh > blockB.y - boundsB.hh;

        expect(overlapping).toBe(false);
      }
    }
  });
});

describe("TomatoHouseRules - Stone Support Rules", () => {
  test("stones must be placed on ground or on other stones", () => {
    const tomatoes = [{ x: 0, y: 100, scale: 1 }];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Check all stone blocks have proper support
    const stoneBlocks = result.blocks.filter((b) => b.texture === "stonebrick");

    stoneBlocks.forEach((stone) => {
      const isOnGround = Math.abs(stone.y - 500) <= 10;
      const hasStoneBelow = stoneBlocks.some(
        (other) =>
          other !== stone &&
          Math.abs(other.x - stone.x) <= 10 &&
          Math.abs(other.y - (stone.y + 60)) <= 10,
      );

      expect(isOnGround || hasStoneBelow).toBe(true);
    });
  });

  test("should build vertical stone columns", () => {
    const tomatoes = [{ x: 0, y: 200, scale: 1 }];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Should create a vertical stack of stones
    const stoneBlocks = result.blocks.filter((b) => b.texture === "stonebrick");
    expect(stoneBlocks.length).toBeGreaterThanOrEqual(2); // At least 2 stones in the column

    // Verify vertical alignment
    const xPositions = stoneBlocks.map((s) => s.x);
    const uniqueX = [...new Set(xPositions)];
    expect(uniqueX.length).toBe(1); // All stones should have same x position
  });
});

describe("TomatoHouseRules - Wood Support Rules", () => {
  test("wood beams must rest on stone blocks", () => {
    const tomatoes = [
      { x: 0, y: 100, scale: 1 },
      { x: 150, y: 100, scale: 1 },
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    const woodBlocks = result.blocks.filter((b) => b.texture === "woodstick");
    const stoneBlocks = result.blocks.filter((b) => b.texture === "stonebrick");

    // Each wood block should have support points on stones
    woodBlocks.forEach((wood) => {
      if (wood.supports && wood.supports.length > 0) {
        wood.supports.forEach((support) => {
          const hasStone = stoneBlocks.some(
            (stone) =>
              Math.abs(stone.x - support.x) <= 10 &&
              Math.abs(stone.y - support.y) <= 10,
          );
          expect(hasStone).toBe(true);
        });
      }
    });
  });

  test("should create horizontal beams between stone columns", () => {
    const tomatoes = [
      { x: 0, y: 100, scale: 1 },
      { x: 150, y: 100, scale: 1 },
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    const woodBlocks = result.blocks.filter((b) => b.texture === "woodstick");

    // Should have at least one horizontal beam
    expect(woodBlocks.length).toBeGreaterThan(0);

    // Wood beams should be horizontal (scaleX > scaleY)
    woodBlocks.forEach((wood) => {
      const scaleX = wood.scaleX || wood.scale || 1;
      const scaleY = wood.scaleY || wood.scale || 1;
      expect(scaleX).toBeGreaterThanOrEqual(scaleY);
    });
  });

  test("should not create beams when tomatoes are too close", () => {
    const tomatoes = [
      { x: 0, y: 100, scale: 1 },
      { x: 50, y: 100, scale: 1 }, // Only 50px apart, gap < 90
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Should not create beam for too-close tomatoes
    const woodBlocks = result.blocks.filter((b) => b.texture === "woodstick");
    expect(woodBlocks.length).toBe(0);
  });
});

describe("TomatoHouseRules - Tomato Support Rules", () => {
  test("tomatoes must rest on stone blocks", () => {
    const tomatoes = [{ x: 0, y: 100, scale: 1 }];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Tomato should be placed
    expect(result.tomatoPlacements.size).toBe(1);

    const tomatoPlacement = result.tomatoPlacements.get(0);
    expect(tomatoPlacement).toBeDefined();

    // Verify there's a stone at the tomato's support position
    const stoneBlocks = result.blocks.filter((b) => b.texture === "stonebrick");
    const supportY = result.tomatoSupports.get(0);

    const hasSupport = stoneBlocks.some(
      (stone) =>
        Math.abs(stone.x - tomatoPlacement.x) <= 10 &&
        Math.abs(stone.y - supportY) <= 10,
    );

    expect(hasSupport).toBe(true);
  });

  test("tomatoes should be positioned above their support stones", () => {
    const tomatoes = [{ x: 0, y: 100, scale: 1 }];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    const tomatoPlacement = result.tomatoPlacements.get(0);
    const supportY = result.tomatoSupports.get(0);

    // Tomato should be above the support stone (negative y direction)
    expect(tomatoPlacement.y).toBeLessThan(supportY);

    // Should be approximately 32px above
    expect(Math.abs(supportY - tomatoPlacement.y - 32)).toBeLessThan(5);
  });

  test("tomatoes should preserve scale information from input", () => {
    const tomatoes = [
      { x: 0, y: 150, scale: 1.0, isKing: false }, // Standard tomato
      { x: 200, y: 150, scale: 1.3, isKing: true }, // King tomato far away to avoid overlap
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // At least one should be placed
    expect(result.tomatoPlacements.size).toBeGreaterThanOrEqual(1);

    // Check that placed tomatoes have the correct scale
    result.tomatoPlacements.forEach((placement, index) => {
      const originalTomato = tomatoes[index];
      if (placement && originalTomato) {
        expect(placement.scale).toBe(originalTomato.scale || 1);
      }
    });
  });
});

describe("TomatoHouseRules - Row Clustering", () => {
  test("should cluster tomatoes by vertical position", () => {
    const tomatoes = [
      { x: 0, y: 100, scale: 1 },
      { x: 100, y: 105, scale: 1 }, // Same row (within 40px threshold)
      { x: 200, y: 200, scale: 1 }, // Different row
    ];

    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // All tomatoes should be placed
    expect(result.tomatoPlacements.size).toBe(3);

    // First two should be at similar height, third should be different
    const placement0 = result.tomatoPlacements.get(0);
    const placement1 = result.tomatoPlacements.get(1);
    const placement2 = result.tomatoPlacements.get(2);

    expect(Math.abs(placement0.y - placement1.y)).toBeLessThan(10);
    expect(Math.abs(placement0.y - placement2.y)).toBeGreaterThan(50);
  });
});

describe("TomatoPhysics - Logic Verification", () => {
  // Since we cannot easily mock the full Phaser/Matter physics engine here,
  // we are testing the logic principles that will be used in GameScene.js

  test("Structure blocks should be marked for static start", () => {
    const tomatoes = [{ x: 0, y: 100 }];
    const result = generateTomatoHousePlan(tomatoes, {
      offsetX: 0,
      groundY: 500,
      segment: 60,
    });

    // Verification: The plan generator doesn't set physics properties directly,
    // but the consumer (GameScene) will use this plan.
    // We verify the plan produces blocks that GameScene will convert to static bodies.
    expect(result.blocks.length).toBeGreaterThan(0);
    result.blocks.forEach((block) => {
      // Just verify basic properties exist
      expect(block.x).toBeDefined();
      expect(block.y).toBeDefined();
      expect(block.texture).toBeDefined();
    });
  });
});
