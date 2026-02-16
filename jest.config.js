module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  moduleFileExtensions: ["js"],
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/main.js", "!src/**/*.test.js"],
  coveragePathIgnorePatterns: ["/node_modules/", "/assets/"],
};
