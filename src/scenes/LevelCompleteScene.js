export default class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: "LevelCompleteScene" });
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
      fontSize: "28px",
      fontWeight: "700",
      backgroundColor: bgColor,
      padding: { x: 40, y: 16 },
      borderRadius: 16,
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

  init(data) {
    this.completedLevel = data.level || 1;
    this.score = data.score || 0;
    this.stars = data.stars || 1;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create procedural background
    this.createBackground();

    // Add dark overlay with pink tint
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0010, 0.6);

    // Title with clean styling
    const title = this.createText(width / 2, 100, "LEVEL COMPLETE", {
      fontSize: "58px",
      fontWeight: "700",
      fill: "#FF6B9D",
    });
    title.setOrigin(0.5);

    // Score with gold color
    const scoreText = this.createText(
      width / 2,
      200,
      `Score: ${this.score.toLocaleString()}`,
      {
        fontSize: "38px",
        fill: "#FFD700",
      },
    );
    scoreText.setOrigin(0.5);

    // Stars display
    const starY = 280;
    for (let i = 0; i < 3; i++) {
      const star = this.createText(width / 2 - 60 + i * 60, starY, "*", {
        fontSize: "54px",
        fill: i < this.stars ? "#FFD700" : "#444444",
      });
      star.setOrigin(0.5);
    }

    // Buttons with pink/red theme
    this.createButton(
      width / 2,
      400,
      "Next Level",
      "#FF1744",
      "#C51162",
      () => {
        this.scene.start("GameScene", { level: this.completedLevel + 1 });
      },
    );

    this.createButton(
      width / 2,
      475,
      "Retry Level",
      "#FF6B9D",
      "#FF1744",
      () => {
        this.scene.start("GameScene", { level: this.completedLevel });
      },
    );

    this.createButton(width / 2, 550, "Main Menu", "#880044", "#660033", () => {
      this.scene.start("MenuScene");
    });
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
