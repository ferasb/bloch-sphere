import { describe, expect, it } from "vitest";
import { expectVecClose, normal, rng } from "./testing";
import { dot, normalize, rotate, rotationBetween, type Vec3 } from "./vec3";

describe("rotationBetween", () => {
  it("rotates `from` onto `to` for random unit vectors", () => {
    const rand = rng(3);
    for (let i = 0; i < 200; i++) {
      const from = normalize([normal(rand), normal(rand), normal(rand)]);
      const to = normalize([normal(rand), normal(rand), normal(rand)]);
      const { axis, angle } = rotationBetween(from, to);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThanOrEqual(Math.PI);
      expectVecClose(rotate(from, axis, angle), to, 1e-9);
    }
  });

  it("is a zero rotation for equal vectors", () => {
    expect(rotationBetween([0, 0, 1], [0, 0, 1]).angle).toBe(0);
  });

  it.each([
    [[0, 0, 1], [0, 0, -1]],
    [[1, 0, 0], [-1, 0, 0]],
  ] as [Vec3, Vec3][])("picks a perpendicular axis for opposite vectors %s → %s", (from, to) => {
    const { axis, angle } = rotationBetween(from, to);
    expect(angle).toBeCloseTo(Math.PI, 12);
    expect(dot(axis, from)).toBeCloseTo(0, 12);
    expectVecClose(rotate(from, axis, angle), to);
  });
});
