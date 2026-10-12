import { describe, expect, it } from "vitest";
import { Gate } from "./gate";
import { Qubit } from "./qubit";
import { Register, swapPower } from "./register";
import { expectVecClose } from "./testing";
import { length } from "./vec3";

const zeros = (n: number) => Register.product(Array.from({ length: n }, () => Qubit.ZERO));

describe("Register", () => {
  it("is the product of its qubits, wire 0 first", () => {
    const r = Register.product([Qubit.ONE, Qubit.ZERO]);
    expect(r.probabilities()).toEqual([0, 0, 1, 0]); // |10⟩
    expectVecClose(r.bloch(0), [0, 0, -1]);
    expectVecClose(r.bloch(1), [0, 0, 1]);
  });

  it("applies single-qubit gates to one wire", () => {
    const r = zeros(3).apply(Gate.H, 1).apply(Gate.S, 1);
    expectVecClose(r.bloch(1), Qubit.PLUS_I.blochVector());
    expectVecClose(r.bloch(0), [0, 0, 1]);
  });

  it("makes a Bell pair: H then CNOT, and both arrows vanish", () => {
    const bell = zeros(2).apply(Gate.H, 0).applyControlled(Gate.X, 0, 1);
    const p = bell.probabilities();
    expect(p[0]).toBeCloseTo(0.5, 12); // |00⟩
    expect(p[3]).toBeCloseTo(0.5, 12); // |11⟩
    expect(length(bell.bloch(0))).toBeCloseTo(0, 12);
    expect(length(bell.bloch(1))).toBeCloseTo(0, 12);
  });

  it("a CNOT whose control is |0⟩ does nothing; |1⟩ just flips the target", () => {
    expect(zeros(2).applyControlled(Gate.X, 0, 1).probabilities()).toEqual([1, 0, 0, 0]);
    const flipped = Register.product([Qubit.ONE, Qubit.ZERO]).applyControlled(Gate.X, 0, 1);
    expect(flipped.probabilities()).toEqual([0, 0, 0, 1]);
    expect(length(flipped.bloch(1))).toBeCloseTo(1, 12);
  });

  it("a second CNOT undoes the entanglement", () => {
    const r = zeros(2).apply(Gate.H, 0).applyControlled(Gate.X, 0, 1).applyControlled(Gate.X, 0, 1);
    expect(length(r.bloch(0))).toBeCloseTo(1, 12);
    expect(length(r.bloch(1))).toBeCloseTo(1, 12);
  });

  it("the example circuit never entangles and ends at |00000⟩", () => {
    // q3 controls q2, around a middle block that undoes itself.
    let r = zeros(5).applyControlled(Gate.X, 2, 1);
    for (const [gate, wire] of [[Gate.X, 1], [Gate.H, 2], [Gate.S, 3], [Gate.Y, 4], [Gate.T, 2], [Gate.Z, 3], [Gate.T_DAG, 2], [Gate.Z, 3], [Gate.X, 1], [Gate.H, 2], [Gate.S_DAG, 3], [Gate.Y, 4]] as const) {
      r = r.apply(gate, wire);
      [0, 1, 2, 3, 4].forEach((w) => expect(length(r.bloch(w))).toBeCloseTo(1, 10));
    }
    r = r.applyControlled(Gate.X, 2, 1);
    expect(r.probabilities()[0]).toBeCloseTo(1, 10);
  });

  it("swaps two wires, and SWAP^½ twice is SWAP", () => {
    const start = Register.product([Qubit.PLUS, Qubit.ONE, Qubit.MINUS_I]);
    const swapped = start.applyTwo(swapPower(1), 0, 2);
    expectVecClose(swapped.bloch(0), Qubit.MINUS_I.blochVector());
    expectVecClose(swapped.bloch(2), Qubit.PLUS.blochVector());
    const halves = start.applyTwo(swapPower(0.5), 0, 2).applyTwo(swapPower(0.5), 0, 2);
    swapped.amplitudes.forEach((a, i) => {
      expect(halves.amplitudes[i].re).toBeCloseTo(a.re, 10);
      expect(halves.amplitudes[i].im).toBeCloseTo(a.im, 10);
    });
  });

  it("measures: collapse picks one outcome, and a Bell partner follows", () => {
    const bell = zeros(2).apply(Gate.H, 0).applyControlled(Gate.X, 0, 1);
    expect(bell.probabilityOfOne(0)).toBeCloseTo(0.5, 12);
    const one = bell.collapse(0, 1);
    expectVecClose(one.bloch(0), [0, 0, -1]);
    expectVecClose(one.bloch(1), [0, 0, -1]);
    expect(() => zeros(1).collapse(0, 1)).toThrow(RangeError);
  });

  it("CNOT^t moves smoothly from nothing to fully entangled", () => {
    const start = zeros(2).apply(Gate.H, 0);
    const lengths = [0, 0.25, 0.5, 0.75, 1].map((t) => length(start.applyControlled(Gate.X.power(t), 0, 1).bloch(0)));
    expect(lengths[0]).toBeCloseTo(1, 10);
    expect(lengths[4]).toBeCloseTo(0, 10);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeLessThan(lengths[i - 1]);
    }
  });

  it("rejects bad wires", () => {
    expect(() => zeros(2).apply(Gate.X, 2)).toThrow(RangeError);
    expect(() => zeros(2).applyControlled(Gate.X, 1, 1)).toThrow(RangeError);
    expect(() => Register.product([])).toThrow(RangeError);
  });
});
