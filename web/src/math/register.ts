import { Complex } from "./complex";
import type { Gate } from "./gate";
import type { Qubit } from "./qubit";
import type { Vec3 } from "./vec3";

export const MAX_REGISTER = 5;

/** A 4×4 matrix on two wires, in the basis |00⟩, |01⟩, |10⟩, |11⟩ (first wire's bit first). */
export type Matrix4 = readonly (readonly Complex[])[];

/**
 * n qubits (n ≤ 5) as one state of 2ⁿ amplitudes, the way a circuit holds them: unlike separate
 * Qubits, it can be entangled. Wire i is bit (n − 1 − i) of an amplitude's index, so a basis state's
 * bits read wire 0, wire 1, … from left to right. Immutable.
 */
export class Register {
  readonly n: number;
  readonly amplitudes: readonly Complex[];

  private constructor(n: number, amplitudes: readonly Complex[]) {
    this.n = n;
    this.amplitudes = amplitudes;
  }

  /** The unentangled state where wire i is states[i]. */
  static product(states: readonly Qubit[]): Register {
    if (states.length < 1 || states.length > MAX_REGISTER) {
      throw new RangeError(`A register holds 1 to ${MAX_REGISTER} qubits`);
    }
    let amps: Complex[] = [Complex.ONE];
    for (const q of states) {
      amps = amps.flatMap((a) => [a.mul(q.a), a.mul(q.b)]);
    }
    return new Register(states.length, amps);
  }

  private mask(wire: number): number {
    if (!Number.isInteger(wire) || wire < 0 || wire >= this.n) {
      throw new RangeError(`No wire ${wire}`);
    }
    return 1 << (this.n - 1 - wire);
  }

  /** A single-qubit gate on one wire. */
  apply(gate: Gate, wire: number): Register {
    return this.applyWhere(gate, wire, () => true);
  }

  /** The gate on `target`, only where `control` is 1: CNOT is applyControlled(X, …). */
  applyControlled(gate: Gate, control: number, target: number): Register {
    if (control === target) {
      throw new RangeError("Control and target must be different wires");
    }
    const c = this.mask(control);
    return this.applyWhere(gate, target, (i) => (i & c) !== 0);
  }

  private applyWhere(gate: Gate, wire: number, when: (index: number) => boolean): Register {
    const m = this.mask(wire);
    const [[u00, u01], [u10, u11]] = gate.matrix;
    const out = [...this.amplitudes];
    for (let i = 0; i < out.length; i++) {
      if ((i & m) === 0 && when(i)) {
        const a0 = this.amplitudes[i];
        const a1 = this.amplitudes[i | m];
        out[i] = u00.mul(a0).add(u01.mul(a1));
        out[i | m] = u10.mul(a0).add(u11.mul(a1));
      }
    }
    return new Register(this.n, out);
  }

  /** A two-qubit gate on wires a and b, given as a 4×4 matrix (see Matrix4). */
  applyTwo(matrix: Matrix4, a: number, b: number): Register {
    if (a === b) {
      throw new RangeError("Two different wires are needed");
    }
    const ma = this.mask(a);
    const mb = this.mask(b);
    const out = [...this.amplitudes];
    for (let i = 0; i < out.length; i++) {
      if ((i & ma) === 0 && (i & mb) === 0) {
        const idx = [i, i | mb, i | ma, i | ma | mb];
        const v = idx.map((j) => this.amplitudes[j]);
        idx.forEach((j, row) => {
          out[j] = matrix[row].reduce((sum, entry, col) => sum.add(entry.mul(v[col])), Complex.ZERO);
        });
      }
    }
    return new Register(this.n, out);
  }

  /** The probability of each basis state, by index. */
  probabilities(): number[] {
    return this.amplitudes.map((a) => a.abs() ** 2);
  }

  /** The probability that measuring `wire` gives 1. */
  probabilityOfOne(wire: number): number {
    const m = this.mask(wire);
    return this.amplitudes.reduce((sum, a, i) => ((i & m) !== 0 ? sum + a.abs() ** 2 : sum), 0);
  }

  /** The state after measuring `wire` and getting `outcome`. Throws if that outcome is impossible. */
  collapse(wire: number, outcome: 0 | 1): Register {
    const m = this.mask(wire);
    const p = outcome === 1 ? this.probabilityOfOne(wire) : 1 - this.probabilityOfOne(wire);
    if (p < 1e-12) {
      throw new RangeError(`Measuring wire ${wire} can't give ${outcome}`);
    }
    const scale = 1 / Math.sqrt(p);
    return new Register(
      this.n,
      this.amplitudes.map((a, i) => (((i & m) !== 0) === (outcome === 1) ? a.scale(scale) : Complex.ZERO)),
    );
  }

  /**
   * The wire's own Bloch vector: (2·Re s, 2·Im s, P(0) − P(1)) with s = Σ conj(a₀)·a₁ over the rest of
   * the register (its reduced state). Length 1 when the wire isn't entangled; shorter when it is; 0
   * when it has no direction of its own at all, as in a Bell pair.
   */
  bloch(wire: number): Vec3 {
    const m = this.mask(wire);
    let s = Complex.ZERO;
    let p0 = 0;
    let p1 = 0;
    for (let i = 0; i < this.amplitudes.length; i++) {
      if ((i & m) === 0) {
        const a0 = this.amplitudes[i];
        const a1 = this.amplitudes[i | m];
        s = s.add(a0.conj().mul(a1));
        p0 += a0.abs() ** 2;
        p1 += a1.abs() ** 2;
      }
    }
    return [2 * s.re, 2 * s.im, p0 - p1];
  }
}

/** SWAP^t: swaps two wires (t = 1), or partway, so a SWAP can be animated. */
export function swapPower(t: number): Matrix4 {
  const e = Complex.polar(1, Math.PI * t);
  const plus = Complex.ONE.add(e).scale(0.5);
  const minus = Complex.ONE.sub(e).scale(0.5);
  const O = Complex.ZERO;
  const I = Complex.ONE;
  return [
    [I, O, O, O],
    [O, plus, minus, O],
    [O, minus, plus, O],
    [O, O, O, I],
  ];
}
