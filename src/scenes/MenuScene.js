export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  // ═══════════════════════════════════════════════════════════════
  // TEXT HELPERS
  // ═══════════════════════════════════════════════════════════════
  createText(x, y, text, options = {}) {
    const defaultStyle = {
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      fontSize: "24px",
      fontWeight: "600",
      fill: "#FFFFFF",
      align: "center",
    };
    return this.add.text(x, y, text, { ...defaultStyle, ...options });
  }

  createButton(x, y, text, bgColor, hoverColor, callback) {
    const button = this.createText(x, y, text, {
      fontSize: "32px",
      fontWeight: "700",
      backgroundColor: bgColor,
      padding: { x: 45, y: 18 },
      borderRadius: 18,
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      button.setScale(1.08);
      button.setBackgroundColor(hoverColor);
    });
    button.on("pointerout", () => {
      button.setScale(1);
      button.setBackgroundColor(bgColor);
    });
    button.on("pointerdown", callback);
    return button;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create procedural background
    this.createBackground();

    // Title with clean Valentine's styling
    const title = this.createText(width / 2, height / 3, "ELLA vs TOMATOES", {
      fontSize: "72px",
      fontWeight: "700",
      fill: "#FF1744",
    });
    title.setOrigin(0.5);

    // Start button
    this.createButton(
      width / 2,
      height / 2 + 50,
      "START GAME",
      "#FF1744",
      "#C51162",
      () => {
        this.scene.start("GameScene", { level: 1 });
      },
    );

    // Instructions
    const instructions = this.createText(
      width / 2,
      height - 100,
      "Drag to aim • Release to shoot • Space for Hot Chocolate • R to restart",
      {
        fontSize: "18px",
        fontWeight: "500",
        fill: "#FFE4E9",
        backgroundColor: "#220011",
        padding: { x: 25, y: 12 },
        borderRadius: 10,
      },
    );
    instructions.setOrigin(0.5);
  }

  createBackground() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const graphics = this.add.graphics();

    // Sky gradient (light blue to darker blue)
    for (let y = 0; y < height; y++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 135, g: 206, b: 235 },
        { r: 100, g: 180, b: 220 },
        height,
        y,
      );
      graphics.fillStyle(
        Phaser.Display.Color.GetColor(color.r, color.g, color.b),
      );
      graphics.fillRect(0, y, width, 1);
    }

    // Ground
    graphics.fillStyle(0x8b7355, 1);
    graphics.fillRect(0, height - 50, width, 50);

    // Grass on top of ground
    graphics.fillStyle(0x228b22, 1);
    graphics.fillRect(0, height - 60, width, 10);

    // Simple clouds
    this.drawCloud(graphics, 200, 100, 1);
    this.drawCloud(graphics, 600, 150, 0.8);
    this.drawCloud(graphics, 1000, 80, 1.2);
  }

  drawCloud(graphics, x, y, scale) {
    graphics.fillStyle(0xffffff, 0.8);
    const radius = 30 * scale;
    graphics.fillCircle(x, y, radius);
    graphics.fillCircle(x - radius * 0.7, y, radius * 0.8);
    graphics.fillCircle(x + radius * 0.7, y, radius * 0.8);
    graphics.fillCircle(x - radius * 0.3, y - radius * 0.5, radius * 0.6);
    graphics.fillCircle(x + radius * 0.3, y - radius * 0.5, radius * 0.6);
  }
}
