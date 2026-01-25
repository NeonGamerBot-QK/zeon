const { add } = require("../add");

describe("add", () => {
  describe("positive numbers", () => {
    it("should add two positive integers", () => {
      expect(add(2, 3)).toBe(5);
    });

    it("should add positive decimals", () => {
      expect(add(1.5, 2.5)).toBe(4);
    });
  });

  describe("negative numbers", () => {
    it("should add two negative numbers", () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it("should add a positive and a negative number", () => {
      expect(add(5, -3)).toBe(2);
    });

    it("should add a negative and a positive number", () => {
      expect(add(-5, 3)).toBe(-2);
    });
  });

  describe("edge cases", () => {
    it("should return the same number when adding zero", () => {
      expect(add(5, 0)).toBe(5);
      expect(add(0, 5)).toBe(5);
    });

    it("should return zero when adding two zeros", () => {
      expect(add(0, 0)).toBe(0);
    });

    it("should handle very large numbers", () => {
      expect(add(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle very small numbers", () => {
      expect(add(Number.MIN_SAFE_INTEGER, 0)).toBe(Number.MIN_SAFE_INTEGER);
    });

    it("should handle floating point precision", () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });
});
