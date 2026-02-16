export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Load game assets
    this.load.image("background2", "assets/background2.jpg");
    this.load.image("ella", "assets/ella.png");
    this.load.image("apple", "assets/green-apple.png");
    this.load.image("tomato", "assets/tomato.png");
    this.load.image("kingtomato", "assets/king-tomato.png");
    this.load.image("hotchocolate", "assets/hot-chocolate.png");
    this.load.image("stonebrick", "assets/stone-wall-brick.png");
    this.load.image("woodstick", "assets/wooden-stick.png");

    // Loading progress display
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(
      width / 2,
      height / 2 - 50,
      "Loading Ella vs Tomatoes",
      {
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        fontSize: "24px",
        fontWeight: "700",
        fill: "#FF6B9D",
        align: "center",
      },
    );
    loadingText.setOrigin(0.5, 0.5);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
  }

  create() {
    // Add Ella to the boot scene
    const ellaImage = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 80,
      "ella"
    );
    ellaImage.setScale(1.5);

    // Move to menu once assets are loaded
    this.scene.start("MenuScene");
  }
}
