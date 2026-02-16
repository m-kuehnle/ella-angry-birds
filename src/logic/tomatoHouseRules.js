const STONE_BASE_SIZE = { w: 60, h: 55 };
const WOOD_BASE_SIZE = { w: 80, h: 40 };
const TOMATO_BASE_SIZE = { w: 36, h: 36 };
const ROW_CLUSTER_THRESHOLD = 40;
const STONE_SUPPORT_TOLERANCE = 10;

// Rule levels (higher number = higher priority)
const RULE_LEVELS = {
  LEVEL_3_CRITICAL: 3,
  LEVEL_2_STRUCTURAL: 2,
  LEVEL_1_SUPPORT: 1,
};

const INITIALIZATION_RULES = {
  NO_OVERLAP: {
    id: "NO_OVERLAP",
    level: RULE_LEVELS.LEVEL_3_CRITICAL,
  },
  STONE_SUPPORT: {
    id: "STONE_SUPPORT",
    level: RULE_LEVELS.LEVEL_2_STRUCTURAL,
  },
  WOOD_SUPPORT: {
    id: "WOOD_SUPPORT",
    level: RULE_LEVELS.LEVEL_2_STRUCTURAL,
  },
  TOMATO_SUPPORT: {
    id: "TOMATO_SUPPORT",
    level: RULE_LEVELS.LEVEL_1_SUPPORT,
  },
};

function getBounds({
  texture,
  x,
  y,
  scale = 1,
  scaleX = scale,
  scaleY = scale,
}) {
  const base =
    texture === "woodstick"
      ? WOOD_BASE_SIZE
      : texture === "tomato"
        ? TOMATO_BASE_SIZE
        : STONE_BASE_SIZE;
  const hw = (base.w * scaleX) / 2 - 4;
  const hh = (base.h * scaleY) / 2 - 4;
  return { x, y, hw, hh };
}

function overlaps(bounds, occupied) {
  return occupied.some(
    (b) =>
      bounds.x - bounds.hw < b.x + b.hw &&
      bounds.x + bounds.hw > b.x - b.hw &&
      bounds.y - bounds.hh < b.y + b.hh &&
      bounds.y + bounds.hh > b.y - b.hh,
  );
}

function hasStoneAt(stones, x, y, tolerance = STONE_SUPPORT_TOLERANCE) {
  return stones.some(
    (s) => Math.abs(s.x - x) <= tolerance && Math.abs(s.y - y) <= tolerance,
  );
}

function canPlaceStone(stones, x, y, groundY, segment) {
  if (Math.abs(y - groundY) <= STONE_SUPPORT_TOLERANCE) return true;
  return hasStoneAt(stones, x, y + segment);
}

function canPlaceWoodOnStone(stones, supportPoints) {
  if (!supportPoints || supportPoints.length === 0) return false;
  return supportPoints.every((p) => hasStoneAt(stones, p.x, p.y));
}

function evaluatePlacementRules(candidate, context) {
  const orderedRules = [
    INITIALIZATION_RULES.NO_OVERLAP,
    INITIALIZATION_RULES.STONE_SUPPORT,
    INITIALIZATION_RULES.WOOD_SUPPORT,
  ].sort((a, b) => b.level - a.level);

  for (const rule of orderedRules) {
    if (rule.id === "NO_OVERLAP") {
      const bounds = getBounds(candidate);
      if (overlaps(bounds, context.occupiedBounds)) {
        return { ok: false, failedRule: rule.id, level: rule.level };
      }
      continue;
    }

    if (rule.id === "STONE_SUPPORT" && candidate.texture === "stonebrick") {
      if (
        !canPlaceStone(
          context.stones,
          candidate.x,
          candidate.y,
          context.groundY,
          context.segment,
        )
      ) {
        return { ok: false, failedRule: rule.id, level: rule.level };
      }
      continue;
    }

    if (rule.id === "WOOD_SUPPORT" && candidate.texture === "woodstick") {
      if (!canPlaceWoodOnStone(context.stones, candidate.supports)) {
        return { ok: false, failedRule: rule.id, level: rule.level };
      }
      continue;
    }

    if (rule.id === "TOMATO_SUPPORT" && candidate.texture === "tomato") {
      if (!hasStoneAt(context.stones, candidate.supportX, candidate.supportY)) {
        return { ok: false, failedRule: rule.id, level: rule.level };
      }
    }
  }

  return { ok: true, failedRule: null, level: null };
}

function hasTomatoStoneSupport(stones, x, y) {
  return hasStoneAt(stones, x, y);
}

function clusterTomatoRows(tomatoes, offsetX) {
  const tomatoInfos = tomatoes.map((t, index) => ({
    index,
    x: t.x + offsetX,
    y: t.y,
    scale: t.scale || 1,
    isKing: t.isKing || false,
  }));

  tomatoInfos.sort((a, b) => b.y - a.y);

  const rows = [];
  tomatoInfos.forEach((tomato) => {
    const row = rows.find(
      (r) => Math.abs(r.y - tomato.y) <= ROW_CLUSTER_THRESHOLD,
    );
    if (row) {
      row.items.push(tomato);
    } else {
      rows.push({ y: tomato.y, items: [tomato] });
    }
  });

  rows.forEach((row) => row.items.sort((a, b) => a.x - b.x));
  return rows;
}

export function generateTomatoHousePlan(
  tomatoes,
  { offsetX = 0, groundY, segment = 60 } = {},
) {
  if (!tomatoes || tomatoes.length === 0) {
    return {
      blocks: [],
      tomatoSupports: new Map(),
      tomatoPlacements: new Map(),
      rejected: [],
    };
  }

  const rows = clusterTomatoRows(tomatoes, offsetX);
  const blocks = [];
  const occupiedBounds = [];
  const stones = [];
  const tomatoSupports = new Map();
  const tomatoPlacements = new Map();
  const rejected = [];

  const context = {
    occupiedBounds,
    stones,
    groundY,
    segment,
  };

  const tryPlaceStone = ({ x, y, scale = 0.6 }) => {
    const block = {
      x,
      y,
      texture: "stonebrick",
      scale,
      density: 0.0025,
      staticOnStart: true,
    };

    const ruleCheck = evaluatePlacementRules(block, context);
    if (!ruleCheck.ok) {
      rejected.push({ block, failedRule: ruleCheck.failedRule });
      return false;
    }

    const bounds = getBounds(block);

    blocks.push(block);
    occupiedBounds.push(bounds);
    stones.push({ x, y });
    return true;
  };

  const tryPlaceWood = ({ x, y, scaleX, scaleY, supports }) => {
    const block = {
      x,
      y,
      texture: "woodstick",
      scaleX,
      scaleY,
      density: 0.0012,
      staticOnStart: true,
      supports,
    };

    const ruleCheck = evaluatePlacementRules(block, context);
    if (!ruleCheck.ok) {
      rejected.push({ block, failedRule: ruleCheck.failedRule });
      return false;
    }

    const bounds = getBounds(block);

    blocks.push(block);
    occupiedBounds.push(bounds);
    return true;
  };

  const tryPlaceTomato = ({ index, x, y, scale = 1, supportY }) => {
    const tomatoCandidate = {
      index,
      x,
      y,
      texture: "tomato",
      scale,
      supportX: x,
      supportY,
    };

    const ruleCheck = evaluatePlacementRules(tomatoCandidate, context);
    if (!ruleCheck.ok) {
      rejected.push({
        block: tomatoCandidate,
        failedRule: ruleCheck.failedRule,
      });
      return false;
    }

    const bounds = getBounds(tomatoCandidate);
    occupiedBounds.push(bounds);
    tomatoPlacements.set(index, { x, y, scale });
    return true;
  };

  rows.forEach((row, rowIndex) => {
    const platformY = groundY - segment * (rowIndex + 1);

    row.items.forEach((tomato) => {
      for (let y = groundY; y > platformY; y -= segment) {
        tryPlaceStone({ x: tomato.x, y, scale: 0.6 });
      }

      const placedTopStone = tryPlaceStone({
        x: tomato.x,
        y: platformY,
        scale: 0.65,
      });

      // Level 1 support rule: tomato must rest on stone
      if (
        placedTopStone &&
        hasTomatoStoneSupport(stones, tomato.x, platformY)
      ) {
        const tomatoY = platformY - 32;
        const tomatoPlaced = tryPlaceTomato({
          index: tomato.index,
          x: tomato.x,
          y: tomatoY,
          scale: tomato.scale || 1,
          supportY: platformY,
        });

        if (tomatoPlaced) {
          tomatoSupports.set(tomato.index, platformY);
        } else {
          rejected.push({
            tomato,
            failedRule: INITIALIZATION_RULES.NO_OVERLAP.id,
          });
        }
      } else {
        rejected.push({
          tomato,
          failedRule: INITIALIZATION_RULES.TOMATO_SUPPORT.id,
        });
      }
    });

    for (let i = 0; i < row.items.length - 1; i++) {
      const left = row.items[i];
      const right = row.items[i + 1];
      const gap = right.x - left.x;
      if (gap < 90) continue;

      const beamX = (left.x + right.x) / 2;
      const beamY = platformY - 30;
      const beamScaleX = Math.min(1.2, gap / 80);

      tryPlaceWood({
        x: beamX,
        y: beamY,
        scaleX: beamScaleX,
        scaleY: 0.45,
        supports: [
          { x: left.x, y: platformY },
          { x: right.x, y: platformY },
        ],
      });
    }
  });

  return { blocks, tomatoSupports, tomatoPlacements, rejected };
}
