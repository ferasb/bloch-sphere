import { expect } from "vitest";
import type { Vec3 } from "./vec3";

export const INV_SQRT2 = Math.SQRT1_2;

export function expectVecClose(actual: Vec3, expected: Vec3, tol = 1e-10): void {
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(actual[i] - expected[i]), `component ${i}: ${actual} vs ${expected}`).toBeLessThan(tol);
  }
}

/** Compare angles on the circle, so 0 ≡ 2π. */
export function expectAngleClose(actual: number, expected: number, tol = 1e-10): void {
  expect(Math.abs(Math.cos(actual) - Math.cos(expected))).toBeLessThan(tol);
  expect(Math.abs(Math.sin(actual) - Math.sin(expected))).toBeLessThan(tol);
}

/** Seeded PRNG (mulberry32), so random tests are reproducible. */
export function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample (Box–Muller). */
export function normal(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}
