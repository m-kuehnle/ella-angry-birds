import levels from "../data/levels";
import { generateTomatoHousePlan } from "./tomatoHouseRules";
import { STRUCTURE, PHYSICS, SPRITE_SIZES } from "./constants";

/**
 * Resolve level data — use preset if available, otherwise generate random.
 */
export function getLevelData(levelNumber, groundY) {
  const preset = levels[levelNumber - 1];
  if (preset) return preset;
  return generateRandomLevel(levelNumber, groundY);
}

function generateRandomLevel(levelNumber, groundY) {
  const minT = Math.min(3 + Math.floor(levelNumber / 5), 6);
  const maxT = Math.min(5 + Math.floor(levelNumber / 3), 10);
  const count = Phaser.Math.Between(minT, maxT);

  const startX = 700;
  const endX = 950;
  const clusters = Array.from({ length: Phaser.Math.Between(1, 3) }, () =>
    Phaser.Math.Between(startX, endX),
  );

  const tomatoes = [];
  for (let i = 0; i < count; i++) {
    const cx = Phaser.Math.RND.pick(clusters) + Phaser.Math.Between(-40, 40);
    const floor = Phaser.Math.Between(0, 3);
    tomatoes.push({
      x: cx,
      y: groundY - floor * 80,
      scale: i === 0 ? 1.3 : 1.0,
      isKing: i === 0,
    });
  }
  tomatoes.sort((a, b) => b.y - a.y);

  return {
    apples: Math.min(3 + Math.floor(count / 2), 6),
    tomatoes,
  };
}

/**
 * Build the full structure + tomatoes into the scene.
 * @returns {{ structureBlocks: [], tomatoes: [], tomatoesRemaining: number }}
 */
export function buildLevel(scene, levelData, offsetX, groundY) {
  const { blocks, tomatoPlacements } = generateTomatoHousePlan(
    levelData.tomatoes,
    { offsetX, groundY, segment: STRUCTURE.BLOCK_SPACING },
  );

  const structureBlocks = [];
  const bounds = [];

  blocks.forEach((def) => {
    const block = createStructureBlock(scene, def, bounds);
    if (block) structureBlocks.push(block);
  });

  const tomatoes = [];
  levelData.tomatoes.forEach((tomato, index) => {
    const planned = tomatoPlacements?.get(index);
    if (!planned) return;

    const sprite = scene.matter.add.sprite(
      planned.x,
      planned.y,
      "tomato",
      null,
      {
        label: "tomato",
        restitution: 0.3,
        friction: 0.5,
        density: 0.001,
      },
    );
    sprite.setScale(planned.scale || tomato.scale || 1);
    sprite.setDepth(20);
    if (tomato.isKing) {
      sprite.setData("isKing", true);
      sprite.setTint(0xffd700);
    }
    tomatoes.push(sprite);
  });

  return { structureBlocks, tomatoes, tomatoesRemaining: tomatoes.length };
}

/** Create a single physics block with AABB overlap prevention. */
function createStructureBlock(scene, def, bounds) {
  const {
    x,
    y,
    texture,
    scale = 1,
    scaleX = scale,
    scaleY = scale,
    angle = 0,
    density = 0.0015,
    staticOnStart = true,
  } = def;

  const size = SPRITE_SIZES[texture] || { w: 60, h: 55 };
  const hw = (size.w * scaleX) / 2 - 4;
  const hh = (size.h * scaleY) / 2 - 4;

  // Reject overlapping placement
  if (
    bounds.some(
      (b) =>
        x - hw < b.x + b.hw &&
        x + hw > b.x - b.hw &&
        y - hh < b.y + b.hh &&
        y + hh > b.y - b.hh,
    )
  )
    return null;

  bounds.push({ x, y, hw, hh });

  const block = scene.matter.add.sprite(x, y, texture, null, {
    label: "structureBlock",
    restitution: 0.05,
    friction: 0.9,
    density,
    sleepThreshold: 20,
  });
  block.setScale(scaleX, scaleY);
  if (angle) block.setAngle(angle);
  if (staticOnStart) {
    block.setStatic(true);
    block.setData("staticOnStart", true);
  }
  block.setDepth(30);
  block.setData("health", PHYSICS.BLOCK_BASE_HEALTH);
  return block;
}

/** Release all static blocks and wake everything for physics. */
export function releaseStructureBlocks(structureBlocks, tomatoes) {
  structureBlocks.forEach((block) => {
    if (!block?.active) return;
    if (block.isStatic() || block.getData("staticOnStart")) {
      block.setStatic(false);
      block.setData("staticOnStart", false);
    }
    block.setAwake();
  });
  tomatoes.forEach((t) => {
    if (t?.active) t.setAwake();
  });
}

/** Wake all bodies after a block is destroyed. */
export function wakeAll(structureBlocks, tomatoes) {
  structureBlocks.forEach((b) => {
    if (b?.active) b.setAwake();
  });
  tomatoes.forEach((t) => {
    if (t?.active) t.setAwake();
  });
}
