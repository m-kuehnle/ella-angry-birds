import levels from "../data/levels";
import { generateTomatoHousePlan } from "../logic/tomatoHouseRules";

export default class GameScene extends Phaser.Scene {
  // ═══════════════════════════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════════════════════════
  static SLING_GRAB_RADIUS = 100;
  static SLING_MAX_PULL = 160;
  static SLING_LAUNCH_POWER = 20;
  static MIN_LAUNCH_DISTANCE = 15;

  static TOMATO_IMPACT_THRESHOLD = 8.5;
  static BLOCK_IMPACT_THRESHOLD = 12;
  static BLOCK_BREAK_THRESHOLD = 35;
  static BLOCK_BASE_HEALTH = 100;
  static COLLISION_COOLDOWN_MS = 200;
  static COLLISION_GRACE_MS = 1200;

  static BLOCK_SPACING = 55;
  static STONE_HALF_WIDTH = 40;
  static STONE_HALF_HEIGHT = 30;
  static TOMATO_RADIUS = 18;

  static APPLE_CLEANUP_DELAY = 8000;
  static SPAWN_NEXT_APPLE_DELAY = 600;
  static GAME_STATE_CHECK_DELAY = 3500;

  static GROUND_OFFSET_Y = 50; // Height of ground floor (grass + earth)
  static LEVEL_OFFSET_PERCENT = 0.18;

  constructor() {
    super({ key: "GameScene" });
    // Always use background2
    this.selectedBackground = "background2";

    // Initialize sound system
    this.initSounds();
  }

  initSounds() {
    // Create simple sound effects using Web Audio API
    this.createLaunchSound();
    this.createImpactSound();
    this.createBreakSound();
    this.createVictorySound();
  }

  createLaunchSound() {
    // Slingshot launch sound - quick ascending tone
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      this.launchSound = { oscillator, gainNode, audioContext, ready: true };
    } catch (e) {
      this.launchSound = { ready: false };
    }
  }

  createImpactSound() {
    // Impact sound - short noise burst
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = audioContext.sampleRate * 0.1;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      this.impactSound = { source, gainNode, audioContext, ready: true };
    } catch (e) {
      this.impactSound = { ready: false };
    }
  }

  createBreakSound() {
    // Breaking sound - descending tone with noise
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      this.breakSound = { oscillator, gainNode, audioContext, ready: true };
    } catch (e) {
      this.breakSound = { ready: false };
    }
  }

  createVictorySound() {
    // Victory sound - ascending melody
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

      this.victorySound = { notes: [], audioContext, ready: true };

      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(frequency * 1.5, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        this.victorySound.notes.push({ oscillator, gainNode });
      });
    } catch (e) {
      this.victorySound = { ready: false };
    }
  }

  playLaunchSound() {
    if (this.launchSound && this.launchSound.ready) {
      try {
        const { oscillator, gainNode, audioContext } = this.launchSound;
        const currentTime = audioContext.currentTime;

        oscillator.frequency.setValueAtTime(200, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.1);
      } catch (e) {
        // Sound failed, continue silently
      }
    }
  }

  playImpactSound() {
    if (this.impactSound && this.impactSound.ready) {
      try {
        const { source, gainNode, audioContext } = this.impactSound;
        const currentTime = audioContext.currentTime;

        gainNode.gain.setValueAtTime(0.3, currentTime);

        source.start(currentTime);
      } catch (e) {
        // Sound failed, continue silently
      }
    }
  }

  playBreakSound() {
    if (this.breakSound && this.breakSound.ready) {
      try {
        const { oscillator, gainNode, audioContext } = this.breakSound;
        const currentTime = audioContext.currentTime;

        oscillator.frequency.setValueAtTime(300, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.2, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.3);
      } catch (e) {
        // Sound failed, continue silently
      }
    }
  }

  playVictorySound() {
    if (this.victorySound && this.victorySound.ready) {
      try {
        const { notes, audioContext } = this.victorySound;
        let currentTime = audioContext.currentTime;

        notes.forEach((note, index) => {
          const { oscillator, gainNode } = note;

          oscillator.frequency.setValueAtTime([261.63, 329.63, 392.00, 523.25][index], currentTime);
          oscillator.frequency.setValueAtTime([261.63, 329.63, 392.00, 523.25][index] * 1.5, currentTime + 0.1);

          gainNode.gain.setValueAtTime(0.1, currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);

          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.2);

          currentTime += 0.15;
        });
      } catch (e) {
        // Sound failed, continue silently
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LIFECYCLE METHODS
  // ═══════════════════════════════════════════════════════════════
  init(data) {
    this.currentLevel = data.level || 1;
    this.applesRemaining = 0;
    this.tomatoesRemaining = 0;
    this.score = 0;
    this.hotChocolateAvailable = true;
    this.nextShotType = "apple";
    this.isAiming = false;
    this.applePreview = null;
    this.launchedApples = [];
    this.trajectoryGraphics = null;
    this.bandGraphics = null;
    this.slingshotBase = null;
    this.structureBlocks = [];
    this.canShoot = true;
    this.collisionCooldowns = new Map();
    this.collisionGraceUntil = 0;
    this.structuresReleased = false;
    this.levelOffsetX = 0;
    this.structureBlockBounds = [];
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background image
    const bg = this.add.image(width / 2, height / 2, this.selectedBackground);
    bg.setDisplaySize(width, height);

    // Visual ground floor
    this.createGroundFloor();

    // Ground physics body
    this.ground = this.matter.add.rectangle(width / 2, height - 15, width, 30, {
      isStatic: true,
      label: "ground",
    });

    // Death zone
    this.deathZone = this.matter.add.rectangle(
      width / 2,
      height + 100,
      width,
      50,
      {
        isStatic: true,
        isSensor: true,
        label: "deathZone",
      },
    );

    // Level offset (push house to the right to use more width)
    this.levelOffsetX = Math.round(width * GameScene.LEVEL_OFFSET_PERCENT);

    // Load level
    this.loadLevel(this.currentLevel);

    // Grace period to let structures settle before collisions apply
    this.collisionGraceUntil = this.time.now + GameScene.COLLISION_GRACE_MS;

    // Slingshot
    this.setupSlingshot();

    // Input
    this.setupInput();

    // UI
    this.setupUI();

    // Collisions (defer slightly to let structures settle)
    this.time.delayedCall(100, () => {
      this.setupCollisions();
    });

    // Keyboard
    this.input.keyboard.on("keydown-R", () => this.restartLevel());
    this.input.keyboard.on("keydown-ESC", () => this.scene.pause());
    this.input.keyboard.on("keydown-SPACE", () => this.useHotChocolate());
  }

  // ═══════════════════════════════════════════════════════════════
  // LEVEL LOADING & STRUCTURE BUILDING
  // ═══════════════════════════════════════════════════════════════
  createGroundFloor() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const graphics = this.add.graphics();

    // Earth/dirt layer (brown)
    graphics.fillStyle(0x8b6914, 1);
    graphics.fillRect(0, height - 40, width, 40);

    // Grass layer on top (green)
    graphics.fillStyle(0x545906, 1);
    graphics.fillRect(0, height - 50, width, 10);

    // Grass highlights for texture
    graphics.lineStyle(1, 0x3d6e1f, 0.6);
    for (let x = 0; x < width; x += 8) {
      const grassHeight = Phaser.Math.Between(3, 6);
      graphics.lineBetween(x, height - 50, x, height - 50 - grassHeight);
    }
  }

  loadLevel(levelNumber) {
    const levelData = levels[levelNumber - 1];
    if (!levelData) {
      console.error("Level not found:", levelNumber);
      return;
    }

    this.applesRemaining = levelData.apples;
    this.tomatoesRemaining = levelData.tomatoes.length;
    this.tomatoes = [];
    this.structureBlocks = [];
    this.structureBlockBounds = [];

    const offsetX = this.levelOffsetX || 0;
    const groundY = this.cameras.main.height - GameScene.GROUND_OFFSET_Y;

    // Create structure plan from dedicated rule engine
    const { blocks, tomatoPlacements } = generateTomatoHousePlan(
      levelData.tomatoes,
      {
        offsetX,
        groundY,
        segment: GameScene.BLOCK_SPACING,
      },
    );
    this.buildStructureFromPlan(blocks);

    // Create tomatoes
    let createdTomatoes = 0;
    levelData.tomatoes.forEach((tomato, index) => {
      const planned = tomatoPlacements?.get(index);
      if (!planned) return;

      const tomatoSprite = this.matter.add.sprite(
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
      tomatoSprite.setScale(planned.scale || tomato.scale || 1);
      tomatoSprite.setDepth(20);
      this.tomatoes.push(tomatoSprite);
      createdTomatoes++;
    });

    this.tomatoesRemaining = createdTomatoes;
  }

  buildStructureFromPlan(blocks) {
    blocks.forEach((block) => {
      this.createStructureBlock(block);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STRUCTURE BLOCK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  createStructureBlock({
    x,
    y,
    texture,
    scale = 1,
    scaleX = scale,
    scaleY = scale,
    angle = 0,
    density = 0.0015,
    sleeping = false,
    staticOnStart = true,
  }) {
    // --- AABB overlap prevention ---
    // Base sprite sizes (approximate for the textures we use)
    const BASE_W = texture === "woodstick" ? 80 : 60;
    const BASE_H = texture === "woodstick" ? 40 : 55;
    const hw = (BASE_W * scaleX) / 2 - 4; // half-width with small tolerance
    const hh = (BASE_H * scaleY) / 2 - 4; // half-height

    const overlaps = this.structureBlockBounds.some((b) => {
      return (
        x - hw < b.x + b.hw &&
        x + hw > b.x - b.hw &&
        y - hh < b.y + b.hh &&
        y + hh > b.y - b.hh
      );
    });
    if (overlaps) return null;

    // Register this block's bounds
    this.structureBlockBounds.push({ x, y, hw, hh });

    const block = this.matter.add.sprite(x, y, texture, null, {
      label: "structureBlock",
      restitution: 0.05,
      friction: 0.9,
      density,
      sleepThreshold: 20,
    });

    block.setScale(scaleX, scaleY);
    if (angle) {
      block.setAngle(angle);
    }

    // Start as static so blocks don't move until first shot
    if (staticOnStart) {
      block.setStatic(true);
      block.setData("staticOnStart", true);
    }

    block.setDepth(30);

    // Track health for impact-based breaking
    block.setData("health", GameScene.BLOCK_BASE_HEALTH);

    this.structureBlocks.push(block);
    return block;
  }

  releaseStructureBlocks() {
    if (this.structuresReleased) return;
    this.structuresReleased = true;

    // Wake up and release ALL structure blocks
    this.structureBlocks.forEach((block) => {
      if (!block || !block.active) return;

      // Make dynamic if it was static
      if (block.isStatic() || block.getData("staticOnStart")) {
        block.setStatic(false);
        block.setData("staticOnStart", false);
      }

      // Force wake up
      block.setAwake();
    });

    // Also wake up all tomatoes
    this.tomatoes.forEach((tomato) => {
      if (tomato && tomato.active) {
        tomato.setAwake();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SLINGSHOT & AIMING
  // ═══════════════════════════════════════════════════════════════
  setupSlingshot() {
    const slingshotX = 260;
    const groundLevel = this.cameras.main.height - 50;
    const slingshotY = groundLevel - 100; // Ella stands on ground

    // Slingshot base character (Ella)
    this.slingshotBase = this.add.image(
      slingshotX - 65,
      slingshotY + 10,
      "ella",
    );
    this.slingshotBase.setScale(1.2);

    // Wooden slingshot structure
    this.createSlingshotStructure(slingshotX, slingshotY);
    // Store slingshot anchor (where the bands attach / launch origin)
    this.slingshotAnchor = { x: slingshotX, y: slingshotY - 30 };
    this.slingshotLeftFork = { x: slingshotX - 20, y: slingshotY - 42 };
    this.slingshotRightFork = { x: slingshotX + 20, y: slingshotY - 42 };

    // Two graphics layers: bands behind apple, trajectory in front
    this.bandGraphics = this.add.graphics();
    this.trajectoryGraphics = this.add.graphics();

    // Show apple sitting on slingshot
    this.spawnReadyApple();
  }

  createSlingshotStructure(x, y) {
    const woodScaleX = 0.28;
    const woodScaleY = 0.95;

    this.add
      .image(x - 22, y - 15, "woodstick")
      .setScale(woodScaleX, woodScaleY);
    this.add
      .image(x + 22, y - 15, "woodstick")
      .setScale(woodScaleX, woodScaleY);
  }

  spawnReadyApple() {
    if (this.applePreview || this.applesRemaining <= 0) return;

    // Plain image — NO physics body while sitting/aiming
    const previewTexture =
      this.nextShotType === "hotchocolate" ? "hotchocolate" : "apple";
    this.applePreview = this.add.image(
      this.slingshotAnchor.x,
      this.slingshotAnchor.y,
      previewTexture,
    );
    this.applePreview.setScale(0.6);
    this.applePreview.setData("shotType", this.nextShotType);
    this.canShoot = true;
    this.drawBands(this.slingshotAnchor.x, this.slingshotAnchor.y);
  }

  setupInput() {
    this.input.on("pointerdown", this.startAiming, this);
    this.input.on("pointermove", this.updateAiming, this);
    this.input.on("pointerup", this.shoot, this);
    this.input.on("pointerupoutside", this.handlePointerExit, this);
    this.input.on("gameout", this.handlePointerExit, this);
  }

  handlePointerExit(pointer) {
    if (!this.isAiming || !this.applePreview) return;
    this.shoot(pointer);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEXT HELPERS
  // ═══════════════════════════════════════════════════════════════
  createText(x, y, text, options = {}) {
    const defaultStyle = {
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      fontSize: "20px",
      fontWeight: "600",
      fill: "#FFFFFF",
      align: "left",
    };
    return this.add.text(x, y, text, { ...defaultStyle, ...options });
  }

  setupUI() {
    const padding = 25;

    // UI Background panel with pink gradient
    const uiPanel = this.add.graphics();
    uiPanel.fillGradientStyle(0x330011, 0x330011, 0x110005, 0x110005, 0.92);
    uiPanel.fillRoundedRect(10, 10, 280, 140, 15);
    uiPanel.lineStyle(3, 0xff6b9d, 0.6);
    uiPanel.strokeRoundedRect(10, 10, 280, 140, 15);

    // UI elements with clean Valentine's styling
    this.applesText = this.createText(
      padding + 15,
      padding + 15,
      `Apples: ${this.applesRemaining}`,
      {
        fill: "#FFE135",
      },
    );

    this.tomatoesText = this.createText(
      padding + 15,
      padding + 45,
      `Tomatoes: ${this.tomatoesRemaining}`,
      {
        fill: "#FF6B9D",
      },
    );

    this.scoreText = this.createText(
      padding + 15,
      padding + 75,
      `Score: ${this.score.toLocaleString()}`,
      {
        fontSize: "18px",
        fill: "#FFD700",
      },
    );

    this.hotChocolateText = this.createText(
      padding + 15,
      padding + 105,
      this.hotChocolateAvailable ? "Hot Chocolate (Space)" : "Used",
      {
        fontSize: "16px",
        fontWeight: "500",
        fill: this.hotChocolateAvailable ? "#FF6B9D" : "#666666",
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // COLLISION HANDLING
  // ═══════════════════════════════════════════════════════════════
  setupCollisions() {
    this.matter.world.on("collisionstart", (event) => {
      event.pairs.forEach((pair) => {
        this.handleCollisionPair(pair);
      });
    });
  }

  handleCollisionPair(pair) {
    const { bodyA, bodyB } = pair;
    if (!bodyA || !bodyB) return;

    const labelA = bodyA.label || "";
    const labelB = bodyB.label || "";
    const labels = [labelA, labelB];

    // Early exit conditions
    if (this.shouldIgnoreCollision(labels)) return;
    if (this.isInGracePeriod()) return;

    const pairId = this.getPairId(bodyA, bodyB);
    if (this.isInCooldown(pairId)) return;

    const now = Date.now();

    // Handle special collision cases
    if (this.handleTomatoDeathZone(bodyA, bodyB, labels)) return;
    if (this.handleHotChocolateExplosion(bodyA, bodyB, labels, pairId, now))
      return;

    // Calculate impact for damage-based collisions
    const impact = this.getImpact(bodyA, bodyB);

    // Destroy falling tomatoes that hit the ground
    if (this.handleTomatoGroundCollision(bodyA, bodyB, labels, impact)) return;
    if (impact <= 0) return;

    // Handle impact-based collisions
    this.handleAppleTomatoCollision(bodyA, bodyB, labels, impact, pairId, now);
    this.handleBlockTomatoCollision(bodyA, bodyB, labels, impact, pairId, now);
    this.handleAppleBlockCollision(bodyA, bodyB, labels, impact, pairId, now);
    this.handleBlockBlockCollision(bodyA, bodyB, labels, impact, pairId, now);
  }

  shouldIgnoreCollision(labels) {
    return labels.includes("ground") || labels.includes("");
  }

  isInGracePeriod() {
    return this.time.now < this.collisionGraceUntil;
  }

  isInCooldown(pairId) {
    const now = Date.now();
    const lastHit = this.collisionCooldowns.get(pairId) || 0;
    return now - lastHit < GameScene.COLLISION_COOLDOWN_MS;
  }

  handleTomatoDeathZone(bodyA, bodyB, labels) {
    if (!labels.includes("tomato") || !labels.includes("deathZone"))
      return false;
    const tomato =
      bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (tomato && tomato.active) this.destroyTomato(tomato);
    return true;
  }

  handleTomatoGroundCollision(bodyA, bodyB, labels, impact) {
    // Destroy tomatoes that fall and hit the ground with significant impact
    if (!labels.includes("tomato") || !labels.includes("ground")) return false;

    if (impact < 2) return false; // Only destroy on hard impacts

    const tomato =
      bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (tomato && tomato.active && !tomato.getData("staticOnStart")) {
      // Only destroy if tomato is falling (not static)
      this.destroyTomato(tomato);
    }
    return true;
  }

  handleHotChocolateExplosion(bodyA, bodyB, labels, pairId, now) {
    if (!labels.includes("apple")) return false;
    const appleGo =
      bodyA.label === "apple" ? bodyA.gameObject : bodyB.gameObject;
    if (
      appleGo &&
      appleGo.active &&
      appleGo.getData("shotType") === "hotchocolate" &&
      !appleGo.getData("exploded")
    ) {
      // Explode immediately on any collision
      appleGo.setData("exploded", true);
      this.explodeHotChocolate(appleGo.x, appleGo.y);
      appleGo.destroy();
      this.collisionCooldowns.set(pairId, now);
      return true;
    }
    return false;
  }

  handleAppleTomatoCollision(bodyA, bodyB, labels, impact, pairId, now) {
    if (!labels.includes("apple") || !labels.includes("tomato")) return;
    if (impact < GameScene.TOMATO_IMPACT_THRESHOLD) return;
    const tomato =
      bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (tomato && tomato.active) {
      this.destroyTomato(tomato);
      this.collisionCooldowns.set(pairId, now);
    }
  }

  handleBlockTomatoCollision(bodyA, bodyB, labels, impact, pairId, now) {
    if (!labels.includes("structureBlock") || !labels.includes("tomato"))
      return;
    if (impact < GameScene.TOMATO_IMPACT_THRESHOLD) return;
    const tomato =
      bodyA.label === "tomato" ? bodyA.gameObject : bodyB.gameObject;
    if (tomato && tomato.active) {
      this.destroyTomato(tomato);
      this.collisionCooldowns.set(pairId, now);
    }
  }

  handleAppleBlockCollision(bodyA, bodyB, labels, impact, pairId, now) {
    if (!labels.includes("apple") || !labels.includes("structureBlock")) return;
    if (impact < GameScene.BLOCK_IMPACT_THRESHOLD) return;
    const blockGo =
      bodyA.label === "structureBlock" ? bodyA.gameObject : bodyB.gameObject;
    if (blockGo && blockGo.active) {
      this.damageStructureBlock(blockGo, impact);
      this.collisionCooldowns.set(pairId, now);
    }
  }

  handleBlockBlockCollision(bodyA, bodyB, labels, impact, pairId, now) {
    if (bodyA.label !== "structureBlock" || bodyB.label !== "structureBlock")
      return;
    if (bodyA.isStatic || bodyB.isStatic) return;
    if (impact < GameScene.BLOCK_IMPACT_THRESHOLD * 1.5) return;

    const goA = bodyA.gameObject;
    const goB = bodyB.gameObject;
    const sharedDamage = impact * 0.4;
    if (goA && goA.active) this.damageStructureBlock(goA, sharedDamage);
    if (goB && goB.active) this.damageStructureBlock(goB, sharedDamage);
    this.collisionCooldowns.set(pairId, now);
  }

  getPairId(bodyA, bodyB) {
    const idA = bodyA.id || 0;
    const idB = bodyB.id || 0;
    return idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
  }

  startAiming(pointer) {
    if (this.applesRemaining <= 0 || !this.canShoot) return;

    if (!this.applePreview) {
      this.spawnReadyApple();
    }
    if (!this.applePreview) return;

    const distToAnchor = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.slingshotAnchor.x,
      this.slingshotAnchor.y,
    );
    const distToApple = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.applePreview.x,
      this.applePreview.y,
    );

    if (
      distToAnchor <= GameScene.SLING_GRAB_RADIUS ||
      distToApple <= GameScene.SLING_GRAB_RADIUS
    ) {
      this.isAiming = true;
    }
  }

  updateAiming(pointer) {
    if (!this.isAiming || !this.applePreview) return;

    // Vector from anchor to pointer (pull is opposite)
    const dx = pointer.x - this.slingshotAnchor.x;
    const dy = pointer.y - this.slingshotAnchor.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const limited = Math.min(distance, GameScene.SLING_MAX_PULL);

    // Apple sits where the user drags (clamped to max pull radius)
    const angle = Math.atan2(dy, dx);
    const appleX = this.slingshotAnchor.x + Math.cos(angle) * limited;
    const appleY = this.slingshotAnchor.y + Math.sin(angle) * limited;

    this.applePreview.setPosition(appleX, appleY);

    // Draw rubber bands
    this.drawBands(appleX, appleY);

    // --- Trajectory preview ---
    this.trajectoryGraphics.clear();
    if (limited < GameScene.MIN_LAUNCH_DISTANCE) return; // too small to show

    const vel = this.getLaunchVelocity(appleX, appleY);
    this.trajectoryGraphics.lineStyle(2, 0xffffff, 0.6);

    const grav = this.matter.world.engine.gravity;
    const gravScale = 0.001; // Matter default gravity scale
    const gravX = grav.x * grav.scale * 60 * 60; // per-frame² → per-step²
    const gravY = grav.y * grav.scale * 60 * 60;

    let sx = appleX,
      sy = appleY;
    let svx = vel.x,
      svy = vel.y;
    const dt = 1; // one frame step

    for (let i = 0; i < 60; i++) {
      const nx = sx + svx * dt;
      const ny = sy + svy * dt;
      if (i % 2 === 0) {
        this.trajectoryGraphics.strokeLineShape(
          new Phaser.Geom.Line(sx, sy, nx, ny),
        );
      }
      sx = nx;
      sy = ny;
      svx += gravX * dt * gravScale;
      svy += gravY * dt * gravScale;
      if (sy > this.cameras.main.height || sx > this.cameras.main.width) break;
    }
  }

  shoot(pointer) {
    if (!this.isAiming || !this.applePreview) return;

    this.isAiming = false;
    this.trajectoryGraphics.clear();

    const appleX = this.applePreview.x;
    const appleY = this.applePreview.y;
    const dx = appleX - this.slingshotAnchor.x;
    const dy = appleY - this.slingshotAnchor.y;
    const pullDistance = Math.sqrt(dx * dx + dy * dy);

    // If barely pulled, snap apple back — don't waste a shot
    if (pullDistance < GameScene.MIN_LAUNCH_DISTANCE) {
      this.applePreview.setPosition(
        this.slingshotAnchor.x,
        this.slingshotAnchor.y,
      );
      this.drawBands(this.slingshotAnchor.x, this.slingshotAnchor.y);
      return;
    }

    // Calculate launch velocity (opposite of pull direction)
    const vel = this.getLaunchVelocity(appleX, appleY);

    // Release structure blocks on first shot
    this.releaseStructureBlocks();

    const shotType = this.applePreview.getData("shotType") || "apple";

    // Destroy the plain preview image
    this.applePreview.destroy();
    this.applePreview = null;
    this.canShoot = false;
    this.nextShotType = "apple";
    if (this.armGraphics) this.armGraphics.clear();

    // Reset bands to anchor
    this.drawBands(this.slingshotAnchor.x, this.slingshotAnchor.y);

    // Create a fresh DYNAMIC physics sprite at the pull position
    const launchedApple = this.matter.add.sprite(
      appleX,
      appleY,
      shotType === "hotchocolate" ? "hotchocolate" : "apple",
      null,
      {
        label: "apple",
        restitution: 0.4,
        friction: 0.3,
        density: 0.004,
        frictionAir: 0.002,
      },
    );
    launchedApple.setScale(0.6);
    launchedApple.setVelocity(vel.x, vel.y);
    launchedApple.setData("shotType", shotType);
    this.launchedApples.push(launchedApple);

    // Decrease apples
    this.applesRemaining--;
    this.updateUI();

    // Spawn next apple after a short delay
    this.time.delayedCall(GameScene.SPAWN_NEXT_APPLE_DELAY, () => {
      if (
        this.applesRemaining > 0 &&
        !this.applePreview &&
        this.scene.isActive()
      ) {
        this.spawnReadyApple();
      }
    });

    // Cleanup launched apple after timeout
    this.time.delayedCall(GameScene.APPLE_CLEANUP_DELAY, () => {
      if (launchedApple && launchedApple.active) {
        launchedApple.destroy();
      }
    });

    // Check game state after things settle
    this.time.delayedCall(GameScene.GAME_STATE_CHECK_DELAY, () => {
      this.checkGameState();
    });
  }

  /** Return the velocity vector for launch — direction is anchor→apple inverted, scaled by pull distance */
  getLaunchVelocity(appleX, appleY) {
    const dx = appleX - this.slingshotAnchor.x;
    const dy = appleY - this.slingshotAnchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const power =
      (dist / GameScene.SLING_MAX_PULL) * GameScene.SLING_LAUNCH_POWER;
    // launch in opposite direction of the pull
    return {
      x: -(dx / dist) * power,
      y: -(dy / dist) * power,
    };
  }

  /** Draw rubber-band lines from the fork tips to the target position */
  drawBands(targetX, targetY) {
    this.bandGraphics.clear();
    this.bandGraphics.lineStyle(5, 0x4a2b10, 0.95);
    this.bandGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        this.slingshotLeftFork.x,
        this.slingshotLeftFork.y,
        targetX,
        targetY,
      ),
    );
    this.bandGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        this.slingshotRightFork.x,
        this.slingshotRightFork.y,
        targetX,
        targetY,
      ),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PHYSICS & DAMAGE CALCULATIONS
  // ═══════════════════════════════════════════════════════════════
  getImpact(bodyA, bodyB) {
    if (!bodyA || !bodyB) return 0;
    const va = bodyA.velocity || { x: 0, y: 0 };
    const vb = bodyB.velocity || { x: 0, y: 0 };
    const rvx = (va.x || 0) - (vb.x || 0);
    const rvy = (va.y || 0) - (vb.y || 0);
    const relSpeed = Math.sqrt(rvx * rvx + rvy * rvy);

    // Ignore very slow collisions (settling/resting contact)
    if (relSpeed < 0.5) return 0;

    const massA = Number.isFinite(bodyA.mass) ? bodyA.mass : 1;
    const massB = Number.isFinite(bodyB.mass) ? bodyB.mass : 1;
    return relSpeed * (massA + massB) * 0.5;
  }

  damageStructureBlock(block, impact) {
    if (!block || !block.active) return;

    // Ignore tiny taps
    if (impact < GameScene.BLOCK_IMPACT_THRESHOLD) return;

    // Big impacts can instantly break
    if (impact >= GameScene.BLOCK_BREAK_THRESHOLD) {
      this.breakBlock(block);
      return;
    }

    const current = block.getData("health") ?? GameScene.BLOCK_BASE_HEALTH;
    const newHealth = current - impact * 1.4;
    block.setData("health", newHealth);

    if (newHealth <= 0) {
      this.breakBlock(block);
    } else {
      // Brief tint feedback
      block.setTint(0xd0c4b0);
      this.time.delayedCall(120, () => {
        if (block && block.active) block.clearTint();
      });
    }
  }

  breakBlock(block) {
    if (!block || !block.active) return;

    this.createParticles(block.x, block.y, 0x8b7355);

    // Remove from structureBlocks array
    const index = this.structureBlocks.indexOf(block);
    if (index > -1) {
      this.structureBlocks.splice(index, 1);
    }

    block.destroy();

    // Wake up all physics bodies so gravity can take effect.
    this.structureBlocks.forEach((b) => {
      if (b && b.active) b.setAwake();
    });
    this.tomatoes.forEach((t) => {
      if (t && t.active) t.setAwake();
    });
  }

  destroyTomato(tomato) {
    if (!tomato || !tomato.active) return;

    // Create particle effect
    this.createParticles(tomato.x, tomato.y, 0xff6347);

    // Add score (bonus for king tomatoes)
    const isKing = tomato.getData("isKing");
    this.score += isKing ? 300 : 100;

    // Remove from array
    const index = this.tomatoes.indexOf(tomato);
    if (index > -1) {
      this.tomatoes.splice(index, 1);
    }

    // Destroy tomato
    tomato.destroy();

    // Update count
    this.tomatoesRemaining--;
    this.updateUI();

    // Check win condition
    if (this.tomatoesRemaining === 0) {
      this.winLevel();
    }
  }

  createParticles(x, y, color) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.add.rectangle(x, y, 6, 6, color);
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Phaser.Math.Between(100, 200);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 500,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SPECIAL POWERS & GAME STATE
  // ═══════════════════════════════════════════════════════════════
  useHotChocolate() {
    if (!this.hotChocolateAvailable) return;

    // Queue hot chocolate as the next shot
    this.hotChocolateAvailable = false;
    this.nextShotType = "hotchocolate";

    if (this.applePreview) {
      this.applePreview.setTexture("hotchocolate");
      this.applePreview.setData("shotType", "hotchocolate");
    } else if (this.applesRemaining > 0) {
      this.spawnReadyApple();
    }

    this.updateUI();
  }

  updateUI() {
    this.applesText.setText(`Apples: ${this.applesRemaining}`);
    this.tomatoesText.setText(`Tomatoes: ${this.tomatoesRemaining}`);
    this.scoreText.setText(`Score: ${this.score}`);
    const hotChocLabel =
      this.nextShotType === "hotchocolate"
        ? "Hot Chocolate: Loaded"
        : this.hotChocolateAvailable
          ? "Hot Chocolate: Ready (Space)"
          : "Hot Chocolate: Used";
    this.hotChocolateText.setText(hotChocLabel);
    this.hotChocolateText.setFill(
      this.hotChocolateAvailable || this.nextShotType === "hotchocolate"
        ? "#ffcc00"
        : "#666666",
    );
  }

  explodeHotChocolate(x, y) {
    const explosionRadius = 300;

    const hotChocSprite = this.add.image(x, y, "hotchocolate");
    hotChocSprite.setScale(0.6);
    hotChocSprite.setAlpha(0.8);

    this.tweens.add({
      targets: hotChocSprite,
      scale: 4,
      alpha: 0,
      duration: 600,
      onComplete: () => hotChocSprite.destroy(),
    });

    // Destroy nearby tomatoes
    [...this.tomatoes].forEach((tomato) => {
      if (!tomato.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, tomato.x, tomato.y);
      if (distance < explosionRadius) {
        this.destroyTomato(tomato);
      }
    });

    // Damage nearby blocks based on distance
    [...this.structureBlocks].forEach((block) => {
      if (!block.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
      if (distance < explosionRadius) {
        const falloff = 1 - distance / explosionRadius;
        const impact = this.blockBreakThreshold * 2 * falloff;
        this.damageStructureBlock(block, impact);
      }
    });
  }

  checkGameState() {
    if (this.tomatoesRemaining === 0) {
      this.winLevel();
    } else if (
      this.applesRemaining === 0 &&
      !this.applePreview &&
      !this.isAiming
    ) {
      this.loseLevel();
    }
  }

  winLevel() {
    // Bonus for unused apples
    const bonus = this.applesRemaining * 500;
    this.score += bonus;

    // Calculate stars (1-3 based on apples remaining)
    let stars = 1;
    if (this.applesRemaining >= 2) stars = 3;
    else if (this.applesRemaining >= 1) stars = 2;

    this.time.delayedCall(1000, () => {
      this.scene.start("LevelCompleteScene", {
        level: this.currentLevel,
        score: this.score,
        stars: stars,
      });
    });
  }

  loseLevel() {
    // Dark overlay with pink tint
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x220011,
      0.85,
    );

    const loseText = this.createText(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 40,
      "LEVEL FAILED",
      {
        fontSize: "48px",
        fontWeight: "700",
        fill: "#FF1744",
        align: "center",
      },
    );
    loseText.setOrigin(0.5);

    const retryText = this.createText(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 30,
      "Press R to Retry",
      {
        fontSize: "26px",
        fontWeight: "600",
        fill: "#FFE4E9",
        align: "center",
      },
    );
    retryText.setOrigin(0.5);
  }

  restartLevel() {
    this.scene.restart({ level: this.currentLevel });
  }
}
