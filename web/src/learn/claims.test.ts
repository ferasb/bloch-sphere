import { describe, expect, it } from "vitest";
import { findEquivalent } from "../format/equivalence";
import { stateName } from "../format/ket";
import { rotationText } from "../format/rotation";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { expectVecClose } from "../math/testing";

/**
 * The Learn pages' prose states facts the code doesn't compute for them. Each one is checked here
 * against the app's math, so a page can't say something the sphere contradicts. Grouped by page.
 */

const DEG = Math.PI / 180;
/** Gates in time order, first applied first, as one gate. */
const seq = (...gates: Gate[]) => gates.reduce((u, g) => Gate.mult(g, u), Gate.I);
const run = (q: Qubit, ...gates: Gate[]) => seq(...gates).apply(q);
const same = (a: Gate, b: Gate) => expect(a.equalsUpToPhase(b)).toBe(true);
const exactly = (a: Gate, b: Gate) => expect(a.phaseTo(b)?.re).toBeCloseTo(1, 12);

describe("What is a qubit?", () => {
  it("H tells |+⟩ and |−⟩ apart", () => {
    expect(stateName(run(Qubit.PLUS, Gate.H))).toBe("|0⟩");
    expect(stateName(run(Qubit.MINUS, Gate.H))).toBe("|1⟩");
  });
});

describe("The Bloch sphere", () => {
  it("places the equator states as described: +x, +y, −x, −y at φ 0°, 90°, 180°, 270°", () => {
    for (const [phi, state] of [
      [0, Qubit.PLUS],
      [90, Qubit.PLUS_I],
      [180, Qubit.MINUS],
      [270, Qubit.MINUS_I],
    ] as const) {
      expect(Qubit.fromBlochAngles(90 * DEG, phi * DEG).isEquivalent(state)).toBe(true);
    }
  });

  it("gives P(0) = (1 + z)/2 for the four heights of its Try it link", () => {
    expect([0, 60, 120, 180].map((t) => Math.round(Qubit.fromBlochAngles(t * DEG, 0).probabilities()[0] * 100))).toEqual([100, 75, 25, 0]);
  });
});

describe("Measuring a qubit", () => {
  it("Ry(60°) on |0⟩ gives P(0) = 75%, and Rz keeps the odds", () => {
    expect(run(Qubit.ZERO, Gate.ry(60 * DEG)).probabilities()[0]).toBeCloseTo(0.75, 12);
    expect(run(Qubit.PLUS, Gate.rz(90 * DEG)).probabilities()[0]).toBeCloseTo(0.5, 12);
  });
});

describe("Gates are rotations", () => {
  it("S turns |+⟩ to |+i⟩, counterclockwise seen from above", () => {
    expect(stateName(run(Qubit.PLUS, Gate.S))).toBe("|+i⟩");
  });

  it("H then S differs from S then H", () => {
    expect(stateName(run(Qubit.ZERO, Gate.H, Gate.S))).toBe("|+i⟩");
    expect(stateName(run(Qubit.ZERO, Gate.S, Gate.H))).toBe("|+⟩");
  });

  it("Z = i·Rz(180°), and H·Z·H = X exactly", () => {
    expect(Gate.rz(Math.PI).phaseTo(Gate.Z)?.im).toBeCloseTo(1, 12); // Z = i·Rz(180°)
    exactly(seq(Gate.H, Gate.Z, Gate.H), Gate.X);
  });

  it("X, Y, Z and H undo themselves; S† undoes S", () => {
    for (const g of [Gate.X, Gate.Y, Gate.Z, Gate.H]) {
      exactly(seq(g, g), Gate.I);
    }
    exactly(seq(Gate.S, Gate.S_DAG), Gate.I);
  });
});

describe("Gate pages", () => {
  it("Pauli-X: (x, y, z) → (x, −y, −z), and X·X = I", () => {
    const q = Qubit.fromBlochAngles(60 * DEG, 45 * DEG);
    const [x, y, z] = q.blochVector();
    expectVecClose(run(q, Gate.X).blochVector(), [x, -y, -z]);
  });

  it("Pauli-Y: Y = i·X·Z, and it keeps |+i⟩ while swapping |+⟩ and |−⟩", () => {
    const xz = Gate.mult(Gate.X, Gate.Z);
    expect(Gate.Y.phaseTo(xz)?.im).toBeCloseTo(-1, 12); // Y = i·XZ means XZ = −i·Y
    expect(stateName(run(Qubit.PLUS_I, Gate.Y))).toBe("|+i⟩");
    expect(stateName(run(Qubit.PLUS, Gate.Y))).toBe("|−⟩");
    expect(stateName(run(Qubit.PLUS, Gate.X))).toBe("|+⟩");
    expect(stateName(run(Qubit.PLUS_I, Gate.X))).toBe("|−i⟩");
  });

  it("Pauli-Y from |0⟩ passes |+⟩ halfway", () => {
    expectVecClose(run(Qubit.ZERO, Gate.ry(90 * DEG)).blochVector(), [1, 0, 0]);
  });

  it("Hadamard: Ry(90°) also takes |0⟩ to |+⟩, but |+⟩ on to |1⟩; H takes |+⟩ back; H·X·H = Z; H swaps |±i⟩", () => {
    expect(stateName(run(Qubit.ZERO, Gate.ry(90 * DEG)))).toBe("|+⟩");
    expect(stateName(run(Qubit.PLUS, Gate.ry(90 * DEG)))).toBe("|1⟩");
    expect(stateName(run(Qubit.PLUS, Gate.H))).toBe("|0⟩");
    exactly(seq(Gate.H, Gate.X, Gate.H), Gate.Z);
    expect(stateName(run(Qubit.PLUS_I, Gate.H))).toBe("|−i⟩");
  });

  it("S and T: S·S = Z, T·T = S, T⁴ = Z, T⁸ = I, and T moves |+⟩ to φ 45°", () => {
    exactly(seq(Gate.S, Gate.S), Gate.Z);
    exactly(seq(Gate.T, Gate.T), Gate.S);
    exactly(seq(Gate.T, Gate.T, Gate.T, Gate.T), Gate.Z);
    exactly(seq(...Array<Gate>(8).fill(Gate.T)), Gate.I);
    const [theta, phi] = run(Qubit.PLUS, Gate.T).blochAngles();
    expect([theta / DEG, phi / DEG].map((a) => Math.round(a))).toEqual([90, 45]);
  });

  it("Rotation gates: Rx(90°) takes |0⟩ to |−i⟩, Rx(60°) leaves P(0) = 75%, Rx(360°) = −I, Rz(45°) turns like T", () => {
    expect(stateName(run(Qubit.ZERO, Gate.rx(90 * DEG)))).toBe("|−i⟩");
    expect(run(Qubit.ZERO, Gate.rx(60 * DEG)).probabilities()[0]).toBeCloseTo(0.75, 12);
    expect(Gate.rx(2 * Math.PI).phaseTo(Gate.I)?.re).toBeCloseTo(-1, 12);
    same(Gate.rz(45 * DEG), Gate.T);
  });
});

describe("The Gate Lab", () => {
  it("H·T·H is a 45° turn about x, and the lab says ≡ Rx(45°)", () => {
    const hth = seq(Gate.H, Gate.T, Gate.H);
    expect(rotationText(hth)).toBe("45° about x");
    expect(findEquivalent(hth)?.name).toBe("Rx(45°)");
  });

  it("S·X·S† = Y exactly, H·Z·H ≡ X, and X^½ is a quarter turn about x", () => {
    exactly(seq(Gate.S_DAG, Gate.X, Gate.S), Gate.Y);
    expect(findEquivalent(seq(Gate.H, Gate.Z, Gate.H))?.name).toBe("X");
    expect(rotationText(Gate.X.power(0.5))).toBe("90° about x");
  });
});
