import { PHYSICS } from "./constants";

// Collision pair cooldown tracker
const cooldowns = new Map();

function pairId(a, b) {
  return a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`;
}

function hasLabel(labels, name) {
  return labels.includes(name);
}

function getImpact(a, b) {
  const va = a.velocity || { x: 0, y: 0 };
  const vb = b.velocity || { x: 0, y: 0 };
  const rvx = (va.x || 0) - (vb.x || 0);
  const rvy = (va.y || 0) - (vb.y || 0);
  const speed = Math.sqrt(rvx * rvx + rvy * rvy);
  if (speed < 0.5) return 0;
  const ma = Number.isFinite(a.mass) ? a.mass : 1;
  const mb = Number.isFinite(b.mass) ? b.mass : 1;
  return speed * (ma + mb) * 0.5;
}

function inCooldown(pid) {
  const last = cooldowns.get(pid) || 0;
  return Date.now() - last < PHYSICS.COLLISION_COOLDOWN_MS;
}

function setCooldown(pid) {
  cooldowns.set(pid, Date.now());
}

/**
 * Wire up Matter collision events.
 * @param {Phaser.Scene} scene
 * @param {object} callbacks — { onDestroyTomato, onDamageBlock, onBreakBlock, onExplodeHotChocolate }
 */
export function setupCollisions(scene, callbacks) {
  scene.matter.world.on("collisionstart", (event) => {
    event.pairs.forEach((pair) => handlePair(scene, pair, callbacks));
  });
}

function handlePair(scene, pair, cb) {
  const { bodyA, bodyB } = pair;
  if (!bodyA || !bodyB) return;

  const labels = [bodyA.label || "", bodyB.label || ""];

  // Skip ground or unlabeled
  if (hasLabel(labels, "ground") || hasLabel(labels, "")) return;
  // Grace period
  if (scene.time.now < scene.collisionGraceUntil) return;

  const pid = pairId(bodyA, bodyB);
  if (inCooldown(pid)) return;

  // Tomato falls into death zone
  if (hasLabel(labels, "tomato") && hasLabel(labels, "deathZone")) {
    const go = bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (go?.active) cb.onDestroyTomato(go);
    return;
  }

  // Hot chocolate explosion on any collision
  if (hasLabel(labels, "apple")) {
    const appleGo =
      bodyA.label === "apple" ? bodyA.gameObject : bodyB.gameObject;
    if (
      appleGo?.active &&
      appleGo.getData("shotType") === "hotchocolate" &&
      !appleGo.getData("exploded")
    ) {
      appleGo.setData("exploded", true);
      cb.onExplodeHotChocolate(appleGo.x, appleGo.y);
      appleGo.destroy();
      setCooldown(pid);
      return;
    }
  }

  const impact = getImpact(bodyA, bodyB);

  // Tomato hits ground hard
  if (hasLabel(labels, "tomato") && hasLabel(labels, "ground") && impact >= 2) {
    const go = bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (go?.active) cb.onDestroyTomato(go);
    return;
  }

  if (impact <= 0) return;

  // Apple hits tomato
  if (
    hasLabel(labels, "apple") &&
    hasLabel(labels, "tomato") &&
    impact >= PHYSICS.TOMATO_IMPACT_THRESHOLD
  ) {
    const go = bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (go?.active) {
      cb.onDestroyTomato(go);
      setCooldown(pid);
    }
    return;
  }

  // Block hits tomato
  if (
    hasLabel(labels, "structureBlock") &&
    hasLabel(labels, "tomato") &&
    impact >= PHYSICS.TOMATO_IMPACT_THRESHOLD
  ) {
    const go = bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (go?.active) {
      cb.onDestroyTomato(go);
      setCooldown(pid);
    }
    return;
  }

  // Apple hits block
  if (
    hasLabel(labels, "apple") &&
    hasLabel(labels, "structureBlock") &&
    impact >= PHYSICS.BLOCK_IMPACT_THRESHOLD
  ) {
    const go =
      bodyA.label === "structureBlock" ? bodyA.gameObject : bodyB.gameObject;
    if (go?.active) {
      cb.onDamageBlock(go, impact);
      setCooldown(pid);
    }
    return;
  }

  // Block-block
  if (bodyA.label === "structureBlock" && bodyB.label === "structureBlock") {
    if (bodyA.isStatic || bodyB.isStatic) return;
    if (impact < PHYSICS.BLOCK_IMPACT_THRESHOLD * 1.5) return;
    const shared = impact * 0.4;
    if (bodyA.gameObject?.active) cb.onDamageBlock(bodyA.gameObject, shared);
    if (bodyB.gameObject?.active) cb.onDamageBlock(bodyB.gameObject, shared);
    setCooldown(pid);
  }
}
