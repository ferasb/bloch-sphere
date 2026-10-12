import { describe, expect, it } from "vitest";
import { Complex } from "./complex";
import { Gate } from "./gate";
import { Qubit } from "./qubit";
import { expectVecClose, normal, rng } from "./testing";
import { rotate, type Vec3 } from "./vec3";

const STATES: Record<string, Qubit> = {
  "0": Qubit.ZERO,
  "1": Qubit.ONE,
  "+": Qubit.PLUS,
  "-": Qubit.MINUS,
  "+i": Qubit.PLUS_I,
  "-i": Qubit.MINUS_I,
};
const INPUTS = ["0", "1", "+", "-", "+i", "-i"];

// Rows are gates, columns are the outputs for inputs |0>, |1>, |+>, |->, |+i>, |-i>
const GATE_TABLE: [Gate, string[]][] = [
  [Gate.X, ["1", "0", "+", "-", "-i", "+i"]],
  [Gate.Y, ["1", "0", "-", "+", "+i", "-i"]],
  [Gate.Z, ["0", "1", "-", "+", "-i", "+i"]],
  [Gate.H, ["+", "-", "0", "1", "-i", "+i"]],
  [Gate.S, ["0", "1", "+i", "-i", "-", "+"]],
  [Gate.S_DAG, ["0", "1", "-i", "+i", "+", "-"]],
];

describe("apply", () => {
  it.each(
    GATE_TABLE.flatMap(([gate, outputs]) =>
      INPUTS.map((input, i) => [`${gate.name}|${input}⟩`, gate, input, outputs[i]] as const),
    ),
  )("%s", (_, gate, input, expected) => {
    expect(gate.apply(STATES[input]).isEquivalent(STATES[expected])).toBe(true);
  });

  it("T rotates |+⟩ by 45° about z", () => {
    expect(Gate.T.apply(Qubit.PLUS).isEquivalent(Qubit.fromBlochAngles(Math.PI / 2, Math.PI / 4))).toBe(true);
  });
});

describe("constructor validation", () => {
  it("rejects a non-unitary matrix", () => {
    expect(
      () =>
        new Gate([
          [1, 1],
          [0, 1],
        ]),
    ).toThrow(RangeError);
  });

  it("rejects non-finite entries", () => {
    expect(
      () =>
        new Gate([
          [NaN, 0],
          [0, 1],
        ]),
    ).toThrow(RangeError);
  });
});

describe("mult", () => {
  it("applies the right-hand gate first", () => {
    // H·X|0⟩ = |−⟩, while X·H|0⟩ = |+⟩
    expect(Gate.mult(Gate.H, Gate.X).apply(Qubit.ZERO).isEquivalent(Qubit.MINUS)).toBe(true);
  });

  it("names the product, using U for unnamed gates", () => {
    expect(Gate.mult(Gate.H, Gate.T).name).toBe("H * T");
    const unnamed = new Gate([
      [1, 0],
      [0, 1],
    ]);
    expect(Gate.mult(Gate.H, unnamed).name).toBe("H * U");
  });
});

function expectSameMatrix(actual: Gate, expected: Gate) {
  actual.matrix.forEach((row, i) =>
    row.forEach((entry, j) => {
      expect(entry.re).toBeCloseTo(expected.matrix[i][j].re, 10);
      expect(entry.im).toBeCloseTo(expected.matrix[i][j].im, 10);
    }),
  );
}

const SQRT_X = new Gate([
  [new Complex(0.5, 0.5), new Complex(0.5, -0.5)],
  [new Complex(0.5, -0.5), new Complex(0.5, 0.5)],
]);

describe("decompose", () => {
  it("rebuilds the gate as phase · rotation", () => {
    const rand = rng(4);
    for (let i = 0; i < 200; i++) {
      const gate = [Gate.rz(rand() * 7), Gate.ry(rand() * 7), Gate.rz(rand() * 7)].reduce(Gate.mult, Gate.I);
      const { phase, axis, angle } = gate.decompose();
      expect(phase.abs()).toBeCloseTo(1, 12);
      expect(angle).toBeLessThanOrEqual(Math.PI + 1e-12);
      const r = Gate.rotation(axis, angle).matrix;
      expectSameMatrix(
        gate,
        new Gate([
          [r[0][0].mul(phase), r[0][1].mul(phase)],
          [r[1][0].mul(phase), r[1][1].mul(phase)],
        ]),
      );
    }
  });

  it("points half-turn axes forward", () => {
    expectVecClose(Gate.X.decompose().axis, [1, 0, 0]);
    expectVecClose(Gate.H.decompose().axis, [Math.SQRT1_2, 0, Math.SQRT1_2]);
  });
});

describe("adjoint", () => {
  it("undoes the gate", () => {
    for (const gate of [Gate.H, Gate.T, Gate.rx(1.3), Gate.mult(Gate.H, Gate.S)]) {
      expectSameMatrix(Gate.mult(gate, gate.adjoint()), Gate.I);
    }
  });

  it("gives the dagger gates, and names them", () => {
    expectSameMatrix(Gate.S.adjoint(), Gate.S_DAG);
    expect(Gate.T.adjoint().name).toBe("T†");
    expect(Gate.T_DAG.adjoint().name).toBe("T");
  });
});

describe("power", () => {
  it.each([
    ["T²", Gate.T.power(2), Gate.S],
    ["S²", Gate.S.power(2), Gate.Z],
    ["T⁸", Gate.T.power(8), Gate.I],
    ["Z^½", Gate.Z.power(0.5), Gate.S],
    ["X^½", Gate.X.power(0.5), SQRT_X],
    ["T⁻¹", Gate.T.power(-1), Gate.T_DAG],
    ["H⁰", Gate.H.power(0), Gate.I],
  ])("%s", (_, actual, expected) => {
    expectSameMatrix(actual, expected);
  });

  it("square roots square back", () => {
    for (const gate of [Gate.X, Gate.H, Gate.T, Gate.ry(2.2)]) {
      const root = gate.power(0.5);
      expectSameMatrix(Gate.mult(root, root), gate);
    }
  });

  it("turns t times as far about the same axis", () => {
    const { axis, angle } = Gate.rx(1.2).power(0.25).axisAngle();
    expectVecClose(axis, [1, 0, 0]);
    expect(angle).toBeCloseTo(0.3, 10);
  });
});

describe("phaseTo / equalsUpToPhase", () => {
  it("recognizes the same gate under a global phase", () => {
    // H·Z·H = X exactly; Z and Rz(π) differ by a phase of i.
    expect(Gate.mult(Gate.mult(Gate.H, Gate.Z), Gate.H).equalsUpToPhase(Gate.X)).toBe(true);
    const phase = Gate.rz(Math.PI).phaseTo(Gate.Z)!;
    expect(phase.re).toBeCloseTo(0, 10);
    expect(phase.im).toBeCloseTo(1, 10);
  });

  it("tells different gates apart", () => {
    expect(Gate.X.equalsUpToPhase(Gate.Y)).toBe(false);
    expect(Gate.mult(Gate.H, Gate.S).equalsUpToPhase(Gate.mult(Gate.S, Gate.H))).toBe(false);
  });
});

describe("rotation", () => {
  it.each([
    [[1, 0, 0] as Vec3, Gate.rx(1.1)],
    [[0, 1, 0] as Vec3, Gate.ry(1.1)],
    [[0, 0, 1] as Vec3, Gate.rz(1.1)],
  ])("about %s matches the named rotation gate", (axis, named) => {
    const m = Gate.rotation(axis, 1.1).matrix;
    named.matrix.forEach((row, i) =>
      row.forEach((entry, j) => {
        expect(m[i][j].re).toBeCloseTo(entry.re, 12);
        expect(m[i][j].im).toBeCloseTo(entry.im, 12);
      }),
    );
  });

  it("round-trips through axisAngle", () => {
    const axis: Vec3 = [0.48, -0.6, 0.64];
    const result = Gate.rotation(axis, 2).axisAngle();
    expectVecClose(result.axis, axis);
    expect(result.angle).toBeCloseTo(2, 10);
  });
});

describe("axisAngle", () => {
  const diagonal: Vec3 = [Math.SQRT1_2, 0, Math.SQRT1_2];
  it.each([
    [Gate.X, [1, 0, 0], 180],
    [Gate.Y, [0, 1, 0], 180],
    [Gate.Z, [0, 0, 1], 180],
    [Gate.H, diagonal, 180],
    [Gate.S, [0, 0, 1], 90],
    [Gate.T, [0, 0, 1], 45],
    [Gate.S_DAG, [0, 0, -1], 90],
    [Gate.rx(Math.PI / 3), [1, 0, 0], 60],
    [Gate.ry(Math.PI / 3), [0, 1, 0], 60],
  ] as const)("%s", (gate, axis, degrees) => {
    const result = gate.axisAngle();
    expectVecClose(result.axis, axis);
    expect(result.angle).toBeCloseTo((degrees * Math.PI) / 180, 10);
  });

  it("the identity is a zero rotation", () => {
    expect(Gate.I.axisAngle().angle).toBeCloseTo(0, 10);
  });

  it("rotating the Bloch vector by the axis and angle matches applying the gate", () => {
    const rand = rng(2);
    for (let i = 0; i < 500; i++) {
      // Every unitary is e^(iα)·Rz(β)·Ry(γ)·Rz(δ)
      const phase = Complex.polar(1, rand() * 2 * Math.PI);
      const globalPhase = new Gate([
        [phase, 0],
        [0, phase],
      ]);
      const angles = [0, 0, 0].map(() => rand() * 4 * Math.PI);
      const gate = [Gate.rz(angles[0]), Gate.ry(angles[1]), Gate.rz(angles[2])].reduce(Gate.mult, globalPhase);
      const q = new Qubit(new Complex(normal(rand), normal(rand)), new Complex(normal(rand), normal(rand)));

      const { axis, angle } = gate.axisAngle();
      expect(angle).toBeLessThanOrEqual(Math.PI + 1e-12);
      expectVecClose(rotate(q.blochVector(), axis, angle), gate.apply(q).blochVector(), 1e-9);
    }
  });
});
