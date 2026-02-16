import levels from "../src/data/levels";

describe("Levels Data", () => {
  test("levels is an array", () => {
    expect(Array.isArray(levels)).toBe(true);
  });

  test("each level has required properties", () => {
    levels.forEach((level, index) => {
      expect(level).toHaveProperty("apples");
      expect(level).toHaveProperty("tomatoes");
      expect(typeof level.apples).toBe("number");
      expect(Array.isArray(level.tomatoes)).toBe(true);
    });
  });

  test("each tomato has required properties", () => {
    levels.forEach((level) => {
      level.tomatoes.forEach((tomato) => {
        expect(tomato).toHaveProperty("x");
        expect(tomato).toHaveProperty("y");
        expect(tomato).toHaveProperty("scale");
        expect(typeof tomato.x).toBe("number");
        expect(typeof tomato.y).toBe("number");
        expect(typeof tomato.scale).toBe("number");
      });
    });
  });

  test("levels have at least one level", () => {
    expect(levels.length).toBeGreaterThan(0);
  });
});
