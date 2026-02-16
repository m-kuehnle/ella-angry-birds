# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage of the tomato house structure generation logic in the game. The tests verify that all structural rules, physics constraints, and placement algorithms work correctly.

## Running Tests

```bash
# Run all tests
npm test

# Run only tomatoHouseRules tests
npm test -- src/logic/tomatoHouseRules.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Test Structure

### 1. AABB Collision Detection Tests

Tests the Axis-Aligned Bounding Box collision detection system that prevents structure overlaps.

- **Overlap Prevention**: Verifies that blocks too close together are rejected
- **Non-Overlapping Blocks**: Confirms properly spaced blocks are accepted
- **Half-Width Calculations**: Validates accurate AABB bounds calculation

### 2. Stone Support Rules Tests

Validates that stone blocks follow structural integrity rules.

- **Ground/Stone Support**: Ensures stones are only placed on ground or other stones
- **Vertical Columns**: Verifies correct vertical stone column construction

### 3. Wood Support Rules Tests

Tests that wood beams require proper stone block support.

- **Stone Support Requirement**: Confirms wood beams must rest on stone blocks
- **Horizontal Beam Creation**: Validates beam placement between stone columns
- **Gap Threshold**: Tests that beams aren't created when tomatoes are too close (<90px)

### 4. Tomato Support Rules Tests

Ensures tomatoes follow placement rules.

- **Stone Support**: Verifies tomatoes must rest on stone blocks
- **Vertical Positioning**: Confirms tomatoes are positioned above their support (~32px)
- **Scale Preservation**: Tests that custom scales (e.g., king tomatoes) are preserved

### 5. Row Clustering Tests

Validates the tomato row grouping algorithm.

- **Vertical Clustering**: Tests that tomatoes within 40px vertically are grouped together
- **Platform Heights**: Confirms different rows get different platform heights

### 6. Rule Priority System Tests

Tests the three-level rule priority system.

- **Level 3 (Critical)**: NO_OVERLAP has highest priority
- **Level 2 (Structural)**: STONE_SUPPORT and WOOD_SUPPORT
- **Level 1 (Support)**: TOMATO_SUPPORT

### 7. Edge Cases Tests

Handles unusual or boundary conditions.

- **Empty Arrays**: Tests with no tomatoes
- **Null/Undefined**: Handles invalid input gracefully
- **Single Tomato**: Works with minimal input
- **Negative Offsets**: Supports negative X offsets
- **Custom Segments**: Allows custom spacing values

### 8. Integration Tests

Comprehensive end-to-end scenarios.

- **Multiple Tomatoes**: Complex layouts with multiple rows
- **Structural Integrity**: Verifies no overlaps in final structure

## Test Coverage

The test suite covers:

- ✅ All rule enforcement (NO_OVERLAP, STONE_SUPPORT, WOOD_SUPPORT, TOMATO_SUPPORT)
- ✅ AABB collision detection algorithm
- ✅ Row clustering and platform generation
- ✅ Bounds calculation for different block types (stone, wood, tomato)
- ✅ Edge cases and error conditions
- ✅ Integration scenarios with multiple tomatoes

## Rule Engine Architecture

The tomato house rule engine implements a priority-based system:

```
Level 3 (Critical): NO_OVERLAP
Level 2 (Structural): STONE_SUPPORT, WOOD_SUPPORT
Level 1 (Support): TOMATO_SUPPORT
```

Rules are evaluated in descending priority order. A placement is rejected on the first failed rule.

## Key Algorithms Tested

### 1. AABB Overlap Detection

```javascript
overlaps =
  x1 - hw1 < x2 + hw2 &&
  x1 + hw1 > x2 - hw2 &&
  y1 - hh1 < y2 + hh2 &&
  y1 + hh1 > y2 - hh2;
```

### 2. Stone Support Validation

- On Ground: `|y - groundY| <= tolerance`
- On Stone: Stone exists at `(x, y + segment)` within tolerance

### 3. Wood Beam Support

- All support points must have stone blocks within tolerance
- Minimum gap of 90px required between tomatoes for beam creation

### 4. Tomato Placement

- Must have stone block at support position `(supportX, supportY)`
- Positioned 32px above support stone

## Adding New Tests

When adding new tests:

1. Group related tests in `describe()` blocks
2. Use descriptive test names that explain what is being tested
3. Test both positive cases (should work) and negative cases (should fail)
4. Include edge cases and boundary conditions
5. Verify the `rejected` array for failed placements

Example:

```javascript
test("should reject overlapping blocks", () => {
  const tomatoes = [
    /* test data */
  ];
  const result = generateTomatoHousePlan(tomatoes, {
    /* config */
  });

  expect(result.rejected.length).toBeGreaterThan(0);
  const overlapFailures = result.rejected.filter(
    (r) => r.failedRule === "NO_OVERLAP",
  );
  expect(overlapFailures.length).toBeGreaterThan(0);
});
```

## Continuous Integration

These tests should be run:

- Before every commit
- On every pull request
- Before deploying to production

The test suite is designed to catch:

- Breaking changes to rule logic
- AABB calculation errors
- Structural integrity violations
- Regression bugs

## Future Test Additions

Potential areas for additional test coverage:

- Performance tests for large tomato arrays
- Stress tests with extreme values
- Visual regression tests for structure layouts
- Property-based testing for rule invariants
