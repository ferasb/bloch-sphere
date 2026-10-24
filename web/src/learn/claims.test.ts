import { describe, expect, it } from "vitest";
import { percentText } from "../format/angles";
import { findEquivalent } from "../format/equivalence";
import { canonical, stateName } from "../format/ket";
import { rotationText } from "../format/rotation";
import { Complex } from "../math/complex";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { expectVecClose } from "../math/testing";
import { dot, normalize, type Vec3 } from "../math/vec3";

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
/** The state whose Bloch vector is `v`. */
const at = (v: Vec3) => Qubit.fromBlochAngles(Math.acos(Math.max(-1, Math.min(1, v[2]))), Math.atan2(v[1], v[0]));
const SQRT_X = Gate.X.power(0.5);

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

  it("measuring along the line between two tips names each state right with (1 + sin(Θ/2))/2, Helstrom's limit", () => {
    const pairs: [Qubit, Qubit][] = [
      [Qubit.ZERO, Qubit.PLUS],
      [Qubit.fromBlochAngles(60 * DEG, 45 * DEG), Qubit.fromBlochAngles(100 * DEG, 200 * DEG)],
      [Qubit.PLUS_I, Qubit.fromBlochAngles(20 * DEG, 300 * DEG)],
    ];
    for (const [s1, s2] of pairs) {
      const [a, b] = [s1.blochVector(), s2.blochVector()];
      const angle = Math.acos(dot(a, b));
      const axis = normalize([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
      // The coordinates along that axis are ±sin(Θ/2).
      expect(dot(a, axis)).toBeCloseTo(Math.sin(angle / 2), 12);
      expect(dot(b, axis)).toBeCloseTo(-Math.sin(angle / 2), 12);
      const right = (1 + Math.sin(angle / 2)) / 2;
      // Helstrom's limit for two equally likely pure states: (1 + √(1 − |⟨a|b⟩|²)) / 2.
      expect((1 + Math.sqrt(1 - s1.fidelity(s2))) / 2).toBeCloseTo(right, 12);
    }
  });

  it("|0⟩ and |+⟩ are 90° apart, told apart about 85% of the time; opposite states 100%, the same state 50%", () => {
    const helstrom = (a: Qubit, b: Qubit) => (1 + Math.sqrt(1 - a.fidelity(b))) / 2;
    expect(Math.acos(dot(Qubit.ZERO.blochVector(), Qubit.PLUS.blochVector())) / DEG).toBeCloseTo(90, 9);
    expect(Math.round(helstrom(Qubit.ZERO, Qubit.PLUS) * 100)).toBe(85);
    expect(helstrom(Qubit.ZERO, Qubit.ONE)).toBeCloseTo(1, 12);
    // √(1 − F) magnifies rounding when F ≈ 1, hence the looser check.
    expect(helstrom(Qubit.PLUS, Qubit.PLUS)).toBeCloseTo(0.5, 6);
  });

  it("Ry(45°) brings the best axis for |0⟩ and |+⟩ onto z, where they show P(0) = 85.4% and P(1) = 85.4%", () => {
    const [a, b] = [Qubit.ZERO.blochVector(), Qubit.PLUS.blochVector()];
    const axis = normalize([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
    expectVecClose(run(at(axis), Gate.ry(45 * DEG)).blochVector(), [0, 0, 1]);
    expect(percentText(run(Qubit.ZERO, Gate.ry(45 * DEG)).probabilities()[0])).toBe("85.4%");
    expect(percentText(run(Qubit.PLUS, Gate.ry(45 * DEG)).probabilities()[1])).toBe("85.4%");
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

  it("a gate leaves the states on its axis alone, and the angle between their factors is the turn", () => {
    const off = Qubit.fromBlochAngles(70 * DEG, 200 * DEG);
    for (const g of [Gate.X, Gate.Y, Gate.Z, Gate.H, Gate.S, Gate.T, Gate.S_DAG, Gate.T_DAG, Gate.rx(60 * DEG), Gate.ry(150 * DEG)]) {
      const { axis, angle } = g.axisAngle();
      const ends = [at(axis), at([-axis[0], -axis[1], -axis[2]])];
      const factors = ends.map((q) => q.inner(g.apply(q)));
      for (const [i, q] of ends.entries()) {
        expect(g.apply(q).isEquivalent(q)).toBe(true);
        expect(factors[i].abs()).toBeCloseTo(1, 12);
      }
      expect(Math.abs(factors[0].div(factors[1]).arg())).toBeCloseTo(angle, 9);
      expect(g.apply(off).isEquivalent(off)).toBe(false);
    }
  });

  it("X keeps |±⟩ with factors 1 and −1; Z, S and T keep |0⟩ and |1⟩; S|1⟩ = i|1⟩", () => {
    expect(Qubit.PLUS.inner(Gate.X.apply(Qubit.PLUS)).re).toBeCloseTo(1, 12);
    expect(Qubit.MINUS.inner(Gate.X.apply(Qubit.MINUS)).re).toBeCloseTo(-1, 12);
    for (const g of [Gate.Z, Gate.S, Gate.T]) {
      expect(stateName(g.apply(Qubit.ZERO))).toBe("|0⟩");
      expect(stateName(g.apply(Qubit.ONE))).toBe("|1⟩");
    }
    expect(Qubit.ZERO.inner(Gate.S.apply(Qubit.ZERO)).re).toBeCloseTo(1, 12);
    expect(Qubit.ONE.inner(Gate.S.apply(Qubit.ONE)).im).toBeCloseTo(1, 12);
  });
});

describe("Gate pages", () => {
  it("Pauli-X: (x, y, z) → (x, −y, −z), and X·X = I", () => {
    const q = Qubit.fromBlochAngles(60 * DEG, 45 * DEG);
    const [x, y, z] = q.blochVector();
    expectVecClose(run(q, Gate.X).blochVector(), [x, -y, -z]);
  });

  it("Pauli-X: no one-bit gate done twice is NOT", () => {
    const oneBitGates = [(b: number) => b, (b: number) => 1 - b, () => 0, () => 1];
    for (const f of oneBitGates) {
      expect([0, 1].map((b) => f(f(b)))).not.toEqual([1, 0]);
    }
  });

  it("Pauli-X: √X twice is X; one √X takes |0⟩ to |−i⟩ at 50/50, the second to |1⟩; two quarter turns about x make X", () => {
    exactly(seq(SQRT_X, SQRT_X), Gate.X);
    expect(rotationText(SQRT_X)).toBe("90° about x");
    expect(stateName(run(Qubit.ZERO, SQRT_X))).toBe("|−i⟩");
    expect(run(Qubit.ZERO, SQRT_X).probabilities()[0]).toBeCloseTo(0.5, 12);
    expect(stateName(run(Qubit.ZERO, SQRT_X, SQRT_X))).toBe("|1⟩");
    same(seq(Gate.rx(90 * DEG), Gate.rx(90 * DEG)), Gate.X);
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

describe("Interference", () => {
  const PHIS = [0, 30, 45, 60, 90, 120, 180, 250].map((d) => d * DEG);

  it("after H and a turn by φ about z, the state is (|0⟩ + e^{iφ}|1⟩)/√2, still 50/50, and circle notation's |1⟩ line points φ around", () => {
    for (const phi of PHIS) {
      const mid = run(Qubit.ZERO, Gate.H, Gate.rz(phi));
      expect(mid.isEquivalent(new Qubit(Math.SQRT1_2, Complex.polar(Math.SQRT1_2, phi)))).toBe(true);
      expect(mid.probabilities()[0]).toBeCloseTo(0.5, 12);
      if (phi > 0) {
        expect((canonical(mid).b.arg() + 2 * Math.PI) % (2 * Math.PI)).toBeCloseTo(phi, 9);
      }
    }
  });

  it("the second H leaves amplitudes (1 ± e^{iφ})/2, so P(0) = cos²(φ/2) = (1 + cos φ)/2", () => {
    for (const phi of PHIS) {
      const end = run(Qubit.ZERO, Gate.H, Gate.rz(phi), Gate.H);
      const sum = new Complex((1 + Math.cos(phi)) / 2, Math.sin(phi) / 2);
      const difference = new Complex((1 - Math.cos(phi)) / 2, -Math.sin(phi) / 2);
      expect(end.isEquivalent(new Qubit(sum, difference))).toBe(true);
      expect(end.probabilities()[0]).toBeCloseTo(Math.cos(phi / 2) ** 2, 12);
      expect(end.probabilities()[0]).toBeCloseTo((1 + Math.cos(phi)) / 2, 12);
      expect(end.blochVector()[2]).toBeCloseTo(Math.cos(phi), 12);
    }
  });

  it("φ = 0 ends at |0⟩ and φ = 180° at |1⟩, with nothing or Z in the middle", () => {
    expect(stateName(run(Qubit.ZERO, Gate.H, Gate.H))).toBe("|0⟩");
    expect(stateName(run(Qubit.ZERO, Gate.H, Gate.Z, Gate.H))).toBe("|1⟩");
  });

  it("H·Rz(φ)·H = Rx(φ) exactly, and the lab calls H, Rz(60°), H ≡ Rx(60°)", () => {
    for (const phi of PHIS) {
      exactly(seq(Gate.H, Gate.rz(phi), Gate.H), Gate.rx(phi));
    }
    expect(findEquivalent(seq(Gate.H, Gate.rz(60 * DEG), Gate.H))?.name).toBe("Rx(60°)");
  });

  it("its Try it links: a 60° turn gives P(0) = 75%, and one H on four phases gives 100%, 75%, 25%, 0%", () => {
    expect(percentText(run(Qubit.ZERO, Gate.H, Gate.rz(60 * DEG), Gate.H).probabilities()[0])).toBe("75%");
    const fourPhases = [0, 60, 120, 180].map((phi) => percentText(run(Qubit.fromBlochAngles(90 * DEG, phi * DEG), Gate.H).probabilities()[0]));
    expect(fourPhases).toEqual(["100%", "75%", "25%", "0%"]);
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
