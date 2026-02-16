import { SLING, TIMING } from "./constants";

/**
 * Manages the slingshot: visual setup, aiming, trajectory preview, and launching.
 */
export default class SlingshotController {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks; // { onShoot }
    this.anchor = null;
    this.leftFork = null;
    this.rightFork = null;
    this.applePreview = null;
    this.bandGraphics = null;
    this.trajectoryGraphics = null;
    this.isAiming = false;
    this.canShoot = true;
  }

  /** Build slingshot visuals + input bindings. */
  setup() {
    const scene = this.scene;
    const groundLevel = scene.cameras.main.height - 50;
    const x = SLING.X;
    const y = groundLevel - 100;

    // Ella character
    scene.add.image(x - 65, y + 10, "ella").setScale(1.2);

    // Wooden forks
    scene.add
      .image(x - 22, y - 15, "woodstick")
      .setScale(SLING.WOOD_SCALE_X, SLING.WOOD_SCALE_Y);
    scene.add
      .image(x + 22, y - 15, "woodstick")
      .setScale(SLING.WOOD_SCALE_X, SLING.WOOD_SCALE_Y);

    this.anchor = { x, y: y - SLING.ANCHOR_OFFSET_Y };
    this.leftFork = { x: x - SLING.FORK_OFFSET_X, y: y - SLING.FORK_OFFSET_Y };
    this.rightFork = { x: x + SLING.FORK_OFFSET_X, y: y - SLING.FORK_OFFSET_Y };

    this.bandGraphics = scene.add.graphics();
    this.trajectoryGraphics = scene.add.graphics();

    // Input
    scene.input.on("pointerdown", (p) => this.startAiming(p));
    scene.input.on("pointermove", (p) => this.updateAiming(p));
    scene.input.on("pointerup", (p) => this.shoot(p));
    scene.input.on("pointerupoutside", (p) => this.shoot(p));
    scene.input.on("gameout", (p) => this.shoot(p));
  }

  /** Place a preview apple on the sling fork. */
  spawnReadyApple(shotType = "apple", applesRemaining = 1) {
    if (this.applePreview || applesRemaining <= 0) return;
    const tex = shotType === "hotchocolate" ? "hotchocolate" : "apple";
    this.applePreview = this.scene.add.image(this.anchor.x, this.anchor.y, tex);
    this.applePreview.setScale(0.6);
    this.applePreview.setData("shotType", shotType);
    this.canShoot = true;
    this.drawBands(this.anchor.x, this.anchor.y);
  }

  switchToHotChocolate() {
    if (!this.applePreview) return;
    this.applePreview.setTexture("hotchocolate");
    this.applePreview.setData("shotType", "hotchocolate");
  }

  // --- Internal ---

  startAiming(pointer) {
    if (!this.canShoot || !this.applePreview) return;
    const distAnchor = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.anchor.x,
      this.anchor.y,
    );
    const distApple = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.applePreview.x,
      this.applePreview.y,
    );
    if (distAnchor <= SLING.GRAB_RADIUS || distApple <= SLING.GRAB_RADIUS) {
      this.isAiming = true;
    }
  }

  updateAiming(pointer) {
    if (!this.isAiming || !this.applePreview) return;

    const dx = pointer.x - this.anchor.x;
    const dy = pointer.y - this.anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limited = Math.min(dist, SLING.MAX_PULL);
    const angle = Math.atan2(dy, dx);
    const ax = this.anchor.x + Math.cos(angle) * limited;
    const ay = this.anchor.y + Math.sin(angle) * limited;

    this.applePreview.setPosition(ax, ay);
    this.drawBands(ax, ay);
    this.drawTrajectory(ax, ay, limited);
  }

  shoot(pointer) {
    if (!this.isAiming || !this.applePreview) return;
    this.isAiming = false;
    this.trajectoryGraphics.clear();

    const ax = this.applePreview.x;
    const ay = this.applePreview.y;
    const dx = ax - this.anchor.x;
    const dy = ay - this.anchor.y;
    const pull = Math.sqrt(dx * dx + dy * dy);

    // Snap back if barely pulled
    if (pull < SLING.MIN_LAUNCH_DISTANCE) {
      this.applePreview.setPosition(this.anchor.x, this.anchor.y);
      this.drawBands(this.anchor.x, this.anchor.y);
      return;
    }

    const vel = this.getLaunchVelocity(ax, ay);
    const shotType = this.applePreview.getData("shotType") || "apple";

    this.applePreview.destroy();
    this.applePreview = null;
    this.canShoot = false;
    this.drawBands(this.anchor.x, this.anchor.y);

    // Delegate actual physics launch + game logic to scene
    this.callbacks.onShoot({ x: ax, y: ay, vel, shotType });
  }

  getLaunchVelocity(ax, ay) {
    const dx = ax - this.anchor.x;
    const dy = ay - this.anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const power = (dist / SLING.MAX_PULL) * SLING.LAUNCH_POWER;
    return { x: -(dx / dist) * power, y: -(dy / dist) * power };
  }

  drawBands(tx, ty) {
    this.bandGraphics.clear();
    this.bandGraphics.lineStyle(5, 0x4a2b10, 0.95);
    this.bandGraphics.strokeLineShape(
      new Phaser.Geom.Line(this.leftFork.x, this.leftFork.y, tx, ty),
    );
    this.bandGraphics.strokeLineShape(
      new Phaser.Geom.Line(this.rightFork.x, this.rightFork.y, tx, ty),
    );
  }

  drawTrajectory(ax, ay, pull) {
    this.trajectoryGraphics.clear();
    if (pull < SLING.MIN_LAUNCH_DISTANCE) return;

    const vel = this.getLaunchVelocity(ax, ay);
    this.trajectoryGraphics.lineStyle(2, 0xffffff, 0.6);

    const scene = this.scene;
    const grav = scene.matter.world.engine.gravity;
    const gs = 0.001;
    const gx = grav.x * grav.scale * 3600;
    const gy = grav.y * grav.scale * 3600;

    let sx = ax,
      sy = ay,
      vx = vel.x,
      vy = vel.y;
    for (let i = 0; i < 60; i++) {
      const nx = sx + vx,
        ny = sy + vy;
      if (i % 2 === 0) {
        this.trajectoryGraphics.strokeLineShape(
          new Phaser.Geom.Line(sx, sy, nx, ny),
        );
      }
      sx = nx;
      sy = ny;
      vx += gx * gs;
      vy += gy * gs;
      if (sy > scene.cameras.main.height || sx > scene.cameras.main.width)
        break;
    }
  }
}
