import { describe, expect, it } from "vitest";
import { Complex } from "./complex";
import { Qubit } from "./qubit";
import { INV_SQRT2, expectAngleClose, expectVecClose, normal, rng } from "./testing";
import type { Vec3 } from "./vec3";

const c = (re: number, im = 0) => new Complex(re, im);

function expectState(q: Qubit, vector: Vec3, theta: number, phi?: number): void {
  expectVecClose(q.blochVector(), vector);
  const [actualTheta, actualPhi] = q.blochAngles();
  expect(actualTheta).toBeCloseTo(theta, 10);
  if (phi !== undefined) {
    expectAngleClose(actualPhi, phi);
  }
}

describe("Bloch vector and angles", () => {
  it.each([
    ["|0⟩", c(1), c(0), [0, 0, 1], 0, undefined],
    ["|1⟩", c(0), c(1), [0, 0, -1], Math.PI, undefined],
    ["|+⟩", c(INV_SQRT2), c(INV_SQRT2), [1, 0, 0], Math.PI / 2, 0],
    ["|−⟩", c(INV_SQRT2), c(-INV_SQRT2), [-1, 0, 0], Math.PI / 2, Math.PI],
    ["|+i⟩", c(INV_SQRT2), c(0, INV_SQRT2), [0, 1, 0], Math.PI / 2, Math.PI / 2],
    ["|−i⟩", c(INV_SQRT2), c(0, -INV_SQRT2), [0, -1, 0], Math.PI / 2, (3 * Math.PI) / 2],
  ] as const)("basis state %s", (_, a, b, vector, theta, phi) => {
    expectState(new Qubit(a, b), vector, theta, phi);
  });

  it("off-axis states", () => {
    expectState(
      new Qubit(Math.cos(Math.PI / 8), Math.sin(Math.PI / 8)),
      [Math.SQRT2 / 2, 0, Math.SQRT2 / 2],
      Math.PI / 4,
      0,
    );
    expectState(
      new Qubit(Math.sqrt(3) / 2, Complex.polar(0.5, Math.PI / 4)),
      [Math.sqrt(6) / 4, Math.sqrt(6) / 4, 0.5],
      Math.PI / 3,
      Math.PI / 4,
    );
  });

  it("normalizes amplitudes", () => {
    expectState(new Qubit(1, 1), [1, 0, 0], Math.PI / 2, 0);
    expectState(new Qubit(3, 4), [0.96, 0, -0.28], 1.8545904360032246, 0);
  });

  it("ignores global phase", () => {
    expectState(new Qubit(c(0, 1), 0), [0, 0, 1], 0);
    expectState(new Qubit(-1, 0), [0, 0, 1], 0);
    expectState(new Qubit(c(0, INV_SQRT2), c(-INV_SQRT2)), [0, 1, 0], Math.PI / 2, Math.PI / 2);
    expectState(new Qubit(c(-INV_SQRT2), c(0, INV_SQRT2)), [0, -1, 0], Math.PI / 2, (3 * Math.PI) / 2);
  });

  it("random states: unit vector, angles in range and consistent with the vector", () => {
    const rand = rng(0);
    for (let i = 0; i < 300; i++) {
      const q = new Qubit(c(normal(rand), normal(rand)), c(normal(rand), normal(rand)));
      const v = q.blochVector();
      const [theta, phi] = q.blochAngles();
      expect(Math.hypot(...v)).toBeCloseTo(1, 10);
      expect(theta).toBeGreaterThanOrEqual(0);
      expect(theta).toBeLessThanOrEqual(Math.PI);
      expect(phi).toBeGreaterThanOrEqual(0);
      expect(phi).toBeLessThan(2 * Math.PI);
      expectVecClose(v, [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)]);
    }
  });

  it("reports φ = 0 at the poles, even with rounding noise in the amplitudes", () => {
    // What Rx(π)|0⟩ produces in floating point: α ≈ 6e-17, β = −i
    expect(new Qubit(6.123e-17, c(0, -1)).blochAngles()[1]).toBe(0);
    expect(new Qubit(c(1), c(-1e-17, 1e-17)).blochAngles()[1]).toBe(0);
  });

  it("keeps φ below 2π when the relative phase is a tiny negative number", () => {
    const phi = new Qubit(INV_SQRT2, Complex.polar(INV_SQRT2, -1e-17)).blochAngles()[1];
    expect(phi).toBeGreaterThanOrEqual(0);
    expect(phi).toBeLessThan(2 * Math.PI);
  });
});

describe("constructor validation", () => {
  it.each([
    ["both zero", 0, 0],
    ["NaN", NaN, 1],
    ["Infinity", Infinity, 1],
    ["complex NaN", c(1, NaN), 0],
  ])("rejects %s", (_, a, b) => {
    expect(() => new Qubit(a, b)).toThrow(RangeError);
  });

  it("normalizes very large and very small amplitudes without overflow or precision loss", () => {
    expectState(new Qubit(1e200, 1e200), [1, 0, 0], Math.PI / 2, 0);
    expectState(new Qubit(c(1.7e308, 1.7e308), c(1.7e308, 1.7e308)), [1, 0, 0], Math.PI / 2, 0);
    expectState(new Qubit(1e-320, 1e-320), [1, 0, 0], Math.PI / 2, 0);
  });
});

describe("fromBlochAngles", () => {
  it.each([
    [0, 0, [0, 0, 1]],
    [Math.PI, 0, [0, 0, -1]],
    [Math.PI / 2, 0, [1, 0, 0]],
    [Math.PI / 2, Math.PI, [-1, 0, 0]],
    [Math.PI / 2, Math.PI / 2, [0, 1, 0]],
    [Math.PI / 2, (3 * Math.PI) / 2, [0, -1, 0]],
    [Math.PI / 4, 0, [Math.SQRT2 / 2, 0, Math.SQRT2 / 2]],
    [Math.PI / 3, Math.PI / 4, [Math.sqrt(6) / 4, Math.sqrt(6) / 4, 0.5]],
  ] as const)("θ=%f φ=%f", (theta, phi, vector) => {
    const onPole = Math.abs(Math.sin(theta)) < 1e-12;
    expectState(Qubit.fromBlochAngles(theta, phi), vector, theta, onPole ? undefined : phi);
  });

  it("round-trips random angles", () => {
    const rand = rng(1);
    for (let i = 0; i < 50; i++) {
      const theta = rand() * Math.PI;
      const phi = rand() * 2 * Math.PI;
      const [gotTheta, gotPhi] = Qubit.fromBlochAngles(theta, phi).blochAngles();
      expect(gotTheta).toBeCloseTo(theta, 10);
      expectAngleClose(gotPhi, phi);
    }
  });
});

describe("fidelity and equivalence", () => {
  it("fidelity", () => {
    expect(Qubit.ZERO.fidelity(Qubit.ONE)).toBeCloseTo(0, 10);
    expect(Qubit.ZERO.fidelity(Qubit.PLUS)).toBeCloseTo(0.5, 10);
    expect(Qubit.ZERO.fidelity(Qubit.MINUS)).toBeCloseTo(0.5, 10);
  });

  it.each([
    [Qubit.ZERO, Qubit.ZERO, true],
    [Qubit.ZERO, new Qubit(c(0, 1), 0), true],
    [Qubit.PLUS, new Qubit(-INV_SQRT2, -INV_SQRT2), true],
    [Qubit.ZERO, Qubit.ONE, false],
    [Qubit.ZERO, Qubit.PLUS, false],
    [Qubit.PLUS, Qubit.MINUS, false],
  ])("isEquivalent #%#", (q1, q2, expected) => {
    expect(q1.isEquivalent(q2)).toBe(expected);
  });
});
