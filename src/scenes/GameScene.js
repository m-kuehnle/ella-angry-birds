import { playSound } from "../audio/SoundManager";
import { setupCollisions } from "../logic/CollisionHandler";
import {
  getLevelData,
  buildLevel,
  releaseStructureBlocks,
  wakeAll,
} from "../logic/LevelLoader";
import SlingshotController from "../logic/SlingshotController";
import {
  PHYSICS,
  STRUCTURE,
  TIMING,
  SCORE,
  HOT_CHOCOLATE_RADIUS,
} from "../logic/constants";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.selectedBackground = "background2";
  }

  // --- Lifecycle ---

  init(data) {
    this.currentLevel = data.level || 1;
    this.score = 0;
    this.applesRemaining = 0;
    this.tomatoesRemaining = 0;
    this.tomatoes = [];
    this.structureBlocks = [];
    this.launchedApples = [];
    this.hotChocolateAvailable = true;
    this.nextShotType = "apple";
    this.collisionGraceUntil = 0;
    this.structuresReleased = false;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add
      .image(width / 2, height / 2, this.selectedBackground)
      .setDisplaySize(width, height);
    this.createGroundFloor(width, height);

    // Physics boundaries
    this.matter.add.rectangle(width / 2, height - 15, width, 30, {
      isStatic: true,
      label: "ground",
    });
    this.matter.add.rectangle(width / 2, height + 100, width, 50, {
      isStatic: true,
      isSensor: true,
      label: "deathZone",
    });

    // Level
    const offsetX = Math.round(width * STRUCTURE.LEVEL_OFFSET_PERCENT);
    const groundY = height - STRUCTURE.GROUND_OFFSET_Y;
    this.loadLevel(this.currentLevel, offsetX, groundY);

    // Grace period
    this.collisionGraceUntil = this.time.now + PHYSICS.COLLISION_GRACE_MS;

    // Slingshot
    this.sling = new SlingshotController(this, {
      onShoot: (data) => this.onShoot(data),
    });
    this.sling.setup();
    this.sling.spawnReadyApple(this.nextShotType, this.applesRemaining);

    // UI
    this.setupUI();

    // Collisions (defer to let structure settle)
    this.time.delayedCall(100, () => {
      setupCollisions(this, {
        onDestroyTomato: (t) => this.destroyTomato(t),
        onDamageBlock: (b, imp) => this.damageBlock(b, imp),
        onExplodeHotChocolate: (x, y) => this.explodeHotChocolate(x, y),
      });
    });

    // Keyboard shortcuts
    this.input.keyboard.on("keydown-R", () =>
      this.scene.restart({ level: this.currentLevel }),
    );
    this.input.keyboard.on("keydown-ESC", () => this.scene.pause());
    this.input.keyboard.on("keydown-SPACE", () => this.useHotChocolate());
  }

  // --- Level ---

  loadLevel(levelNumber, offsetX, groundY) {
    // Cleanup previous
    this.tomatoes.forEach((t) => {
      if (t?.destroy) t.destroy();
    });
    this.structureBlocks.forEach((b) => {
      if (b?.destroy) b.destroy();
    });

    const levelData = getLevelData(levelNumber, groundY);
    this.applesRemaining = levelData.apples;

    const result = buildLevel(this, levelData, offsetX, groundY);
    this.structureBlocks = result.structureBlocks;
    this.tomatoes = result.tomatoes;
    this.tomatoesRemaining = result.tomatoesRemaining;

    // Retry if generation placed nothing
    if (this.tomatoesRemaining === 0) {
      this.time.delayedCall(10, () =>
        this.loadLevel(levelNumber, offsetX, groundY),
      );
    }
  }

  // --- Slingshot callback ---

  onShoot({ x, y, vel, shotType }) {
    // Release static blocks on first shot
    if (!this.structuresReleased) {
      this.structuresReleased = true;
      releaseStructureBlocks(this.structureBlocks, this.tomatoes);
    }

    // Create physics projectile
    const tex = shotType === "hotchocolate" ? "hotchocolate" : "apple";
    const apple = this.matter.add.sprite(x, y, tex, null, {
      label: "apple",
      restitution: 0.4,
      friction: 0.3,
      density: 0.004,
      frictionAir: 0.002,
    });
    apple.setScale(0.6);
    apple.setVelocity(vel.x, vel.y);
    apple.setData("shotType", shotType);
    this.launchedApples.push(apple);

    this.applesRemaining--;
    this.nextShotType = "apple";
    this.updateUI();
    playSound("launch");

    // Spawn next apple
    this.time.delayedCall(TIMING.SPAWN_NEXT_APPLE_DELAY, () => {
      if (
        this.applesRemaining > 0 &&
        !this.sling.applePreview &&
        this.scene.isActive()
      ) {
        this.sling.spawnReadyApple(this.nextShotType, this.applesRemaining);
      }
    });

    // Auto-destroy after timeout
    this.time.delayedCall(TIMING.APPLE_CLEANUP_DELAY, () => {
      if (apple?.active) apple.destroy();
    });

    // Deferred game-state check
    this.time.delayedCall(TIMING.GAME_STATE_CHECK_DELAY, () =>
      this.checkGameState(),
    );
  }

  // --- Damage & destruction ---

  damageBlock(block, impact) {
    if (!block?.active || impact < PHYSICS.BLOCK_IMPACT_THRESHOLD) return;

    if (impact >= PHYSICS.BLOCK_BREAK_THRESHOLD) {
      this.breakBlock(block);
      return;
    }

    const hp =
      (block.getData("health") ?? PHYSICS.BLOCK_BASE_HEALTH) - impact * 1.4;
    block.setData("health", hp);

    if (hp <= 0) {
      this.breakBlock(block);
    } else {
      block.setTint(0xd0c4b0);
      this.time.delayedCall(120, () => {
        if (block?.active) block.clearTint();
      });
    }
  }

  breakBlock(block) {
    if (!block?.active) return;
    this.createParticles(block.x, block.y, 0x8b7355);
    const idx = this.structureBlocks.indexOf(block);
    if (idx > -1) this.structureBlocks.splice(idx, 1);
    block.destroy();
    playSound("break");
    wakeAll(this.structureBlocks, this.tomatoes);
  }

  destroyTomato(tomato) {
    if (!tomato?.active) return;
    this.createParticles(tomato.x, tomato.y, 0xff6347);
    this.score += tomato.getData("isKing") ? SCORE.KING_TOMATO : SCORE.TOMATO;
    const idx = this.tomatoes.indexOf(tomato);
    if (idx > -1) this.tomatoes.splice(idx, 1);
    tomato.destroy();
    this.tomatoesRemaining--;
    this.updateUI();
    if (this.tomatoesRemaining === 0) this.winLevel();
  }

  // --- Hot chocolate ---

  useHotChocolate() {
    if (!this.hotChocolateAvailable) return;
    this.hotChocolateAvailable = false;
    this.nextShotType = "hotchocolate";

    if (this.sling.applePreview) {
      this.sling.switchToHotChocolate();
    } else if (this.applesRemaining > 0) {
      this.sling.spawnReadyApple("hotchocolate", this.applesRemaining);
    }
    this.updateUI();
  }

  explodeHotChocolate(x, y) {
    const sprite = this.add
      .image(x, y, "hotchocolate")
      .setScale(0.6)
      .setAlpha(0.8);
    this.tweens.add({
      targets: sprite,
      scale: 4,
      alpha: 0,
      duration: 600,
      onComplete: () => sprite.destroy(),
    });

    [...this.tomatoes].forEach((t) => {
      if (
        t.active &&
        Phaser.Math.Distance.Between(x, y, t.x, t.y) < HOT_CHOCOLATE_RADIUS
      ) {
        this.destroyTomato(t);
      }
    });

    [...this.structureBlocks].forEach((b) => {
      if (!b.active) return;
      const d = Phaser.Math.Distance.Between(x, y, b.x, b.y);
      if (d < HOT_CHOCOLATE_RADIUS) {
        this.damageBlock(
          b,
          PHYSICS.BLOCK_BREAK_THRESHOLD * 2 * (1 - d / HOT_CHOCOLATE_RADIUS),
        );
      }
    });
    playSound("impact");
  }

  // --- Game state ---

  checkGameState() {
    if (this.tomatoesRemaining === 0) {
      this.winLevel();
    } else if (
      this.applesRemaining === 0 &&
      !this.sling.applePreview &&
      !this.sling.isAiming
    ) {
      this.loseLevel();
    }
  }

  winLevel() {
    this.score += this.applesRemaining * SCORE.APPLE_BONUS;
    const stars =
      this.applesRemaining >= 2 ? 3 : this.applesRemaining >= 1 ? 2 : 1;
    playSound("victory");
    this.time.delayedCall(1000, () => {
      this.scene.start("LevelCompleteScene", {
        level: this.currentLevel,
        score: this.score,
        stars,
      });
    });
  }

  loseLevel() {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x220011, 0.85);
    this.createText(width / 2, height / 2 - 40, "LEVEL FAILED", {
      fontSize: "48px",
      fontWeight: "700",
      fill: "#FF1744",
      align: "center",
    }).setOrigin(0.5);
    this.createText(width / 2, height / 2 + 30, "Press R to Retry", {
      fontSize: "26px",
      fontWeight: "600",
      fill: "#FFE4E9",
      align: "center",
    }).setOrigin(0.5);
  }

  // --- Visuals ---

  createGroundFloor(width, height) {
    const g = this.add.graphics();
    g.fillStyle(0x8b6914, 1);
    g.fillRect(0, height - 40, width, 40);
    g.fillStyle(0x545906, 1);
    g.fillRect(0, height - 50, width, 10);
    g.lineStyle(1, 0x3d6e1f, 0.6);
    for (let x = 0; x < width; x += 8) {
      const h = Phaser.Math.Between(3, 6);
      g.lineBetween(x, height - 50, x, height - 50 - h);
    }
  }

  createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const p = this.add.rectangle(x, y, 6, 6, color);
      const angle = (Math.PI * 2 * i) / count;
      const speed = Phaser.Math.Between(100, 200);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 500,
        onComplete: () => p.destroy(),
      });
    }
  }

  // --- UI ---

  createText(x, y, text, opts = {}) {
    return this.add.text(x, y, text, {
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      fontSize: "20px",
      fontWeight: "600",
      fill: "#FFFFFF",
      align: "left",
      ...opts,
    });
  }

  setupUI() {
    const pad = 25;
    const panel = this.add.graphics();
    panel.fillGradientStyle(0x330011, 0x330011, 0x110005, 0x110005, 0.92);
    panel.fillRoundedRect(10, 10, 280, 140, 15);
    panel.lineStyle(3, 0xff6b9d, 0.6);
    panel.strokeRoundedRect(10, 10, 280, 140, 15);

    const ox = pad + 15;
    this.applesText = this.createText(ox, pad + 15, "", { fill: "#FFE135" });
    this.tomatoesText = this.createText(ox, pad + 45, "", { fill: "#FF6B9D" });
    this.scoreText = this.createText(ox, pad + 75, "", {
      fontSize: "18px",
      fill: "#FFD700",
    });
    this.hotChocolateText = this.createText(ox, pad + 105, "", {
      fontSize: "16px",
      fontWeight: "500",
    });
    this.updateUI();
  }

  updateUI() {
    this.applesText.setText(`Apples: ${this.applesRemaining}`);
    this.tomatoesText.setText(`Tomatoes: ${this.tomatoesRemaining}`);
    this.scoreText.setText(`Score: ${this.score}`);
    const hcLabel =
      this.nextShotType === "hotchocolate"
        ? "Hot Chocolate: Loaded"
        : this.hotChocolateAvailable
          ? "Hot Chocolate: Ready (Space)"
          : "Hot Chocolate: Used";
    this.hotChocolateText.setText(hcLabel);
    this.hotChocolateText.setFill(
      this.hotChocolateAvailable || this.nextShotType === "hotchocolate"
        ? "#ffcc00"
        : "#666666",
    );
  }
}
