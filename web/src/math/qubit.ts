import { Complex } from "./complex";
import type { Vec3 } from "./vec3";

/** Below this amplitude magnitude the state sits on a pole, where φ is undefined. */
const POLE_TOL = 1e-9;

/** A single-qubit pure state α|0⟩ + β|1⟩. Immutable; amplitudes are normalized on construction. */
export class Qubit {
  readonly a: Complex;
  readonly b: Complex;

  /** Throws RangeError for non-finite amplitudes or when both are zero. */
  constructor(a: number | Complex, b: number | Complex) {
    const ca = Complex.from(a);
    const cb = Complex.from(b);
    if (!ca.isFinite() || !cb.isFinite()) {
      throw new RangeError("Amplitudes must be finite numbers");
    }
    // Divide by the largest component first, so normalizing neither overflows for
    // huge inputs nor loses precision for tiny ones.
    const m = Math.max(Math.abs(ca.re), Math.abs(ca.im), Math.abs(cb.re), Math.abs(cb.im));
    if (m === 0) {
      throw new RangeError("At least one amplitude must be non-zero");
    }
    const norm = Math.hypot(ca.re / m, ca.im / m, cb.re / m, cb.im / m);
    this.a = new Complex(ca.re / m / norm, ca.im / m / norm);
    this.b = new Complex(cb.re / m / norm, cb.im / m / norm);
  }

  static readonly ZERO = new Qubit(1, 0);
  static readonly ONE = new Qubit(0, 1);
  static readonly PLUS = new Qubit(Math.SQRT1_2, Math.SQRT1_2);
  static readonly MINUS = new Qubit(Math.SQRT1_2, -Math.SQRT1_2);
  static readonly PLUS_I = new Qubit(Math.SQRT1_2, new Complex(0, Math.SQRT1_2));
  static readonly MINUS_I = new Qubit(Math.SQRT1_2, new Complex(0, -Math.SQRT1_2));

  static fromBlochAngles(theta: number, phi: number): Qubit {
    return new Qubit(Math.cos(theta / 2), Complex.polar(Math.sin(theta / 2), phi));
  }

  /** [θ, φ] with θ in [0, π] and φ in [0, 2π). φ is undefined at the poles; it is reported as 0 there. */
  blochAngles(): [number, number] {
    const ra = this.a.abs();
    const rb = this.b.abs();
    const theta = 2 * Math.atan2(rb, ra);
    if (ra < POLE_TOL || rb < POLE_TOL) {
      return [theta, 0];
    }
    // arg(β·ᾱ) is the relative phase in (−π, π]; one angle, so no (−2π, 2π) range from subtracting two.
    const phi = this.b.mul(this.a.conj()).arg();
    return [theta, phi < 0 ? (phi + 2 * Math.PI) % (2 * Math.PI) : phi];
  }

  /** (x, y, z) = (2·Re(ᾱβ), 2·Im(ᾱβ), |α|² − |β|²). Independent of global phase. */
  blochVector(): Vec3 {
    const ab = this.a.conj().mul(this.b);
    const [p0, p1] = this.probabilities();
    return [2 * ab.re, 2 * ab.im, p0 - p1];
  }

  probabilities(): [number, number] {
    return [this.a.abs() ** 2, this.b.abs() ** 2];
  }

  /** ⟨this|other⟩ */
  inner(other: Qubit): Complex {
    return this.a.conj().mul(other.a).add(this.b.conj().mul(other.b));
  }

  fidelity(other: Qubit): number {
    return this.inner(other).abs() ** 2;
  }

  /** Same physical state, ignoring global phase. */
  isEquivalent(other: Qubit, tol = 1e-10): boolean {
    return Math.abs(this.fidelity(other) - 1) < tol;
  }
}

/** The six axis states, in preset-button order. Sphere labels are placed from these, so they can't disagree. */
export const NAMED_STATES: ReadonlyArray<{ label: string; state: Qubit }> = [
  { label: "|0⟩", state: Qubit.ZERO },
  { label: "|1⟩", state: Qubit.ONE },
  { label: "|+⟩", state: Qubit.PLUS },
  { label: "|−⟩", state: Qubit.MINUS },
  { label: "|+i⟩", state: Qubit.PLUS_I },
  { label: "|−i⟩", state: Qubit.MINUS_I },
];
