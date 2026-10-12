import { Complex } from "./complex";
import { Qubit } from "./qubit";
import type { Vec3 } from "./vec3";

type Entry = number | Complex;
type Row<T> = readonly [T, T];
export type Matrix2 = readonly [Row<Complex>, Row<Complex>];

const UNITARY_TOL = 1e-9;

/** A single-qubit gate: a 2x2 unitary matrix. Immutable. */
export class Gate {
  readonly matrix: Matrix2;

  constructor(
    matrix: readonly [Row<Entry>, Row<Entry>],
    readonly name?: string,
  ) {
    const [[m00, m01], [m10, m11]] = matrix;
    const [u00, u01, u10, u11] = [m00, m01, m10, m11].map(Complex.from);
    if (![u00, u01, u10, u11].every((u) => u.isFinite())) {
      throw new RangeError("Matrix entries must be finite numbers");
    }
    // U†U = I: both columns have unit norm and are orthogonal.
    const col0 = u00.abs() ** 2 + u10.abs() ** 2;
    const col1 = u01.abs() ** 2 + u11.abs() ** 2;
    const overlap = u00.conj().mul(u01).add(u10.conj().mul(u11)).abs();
    if (Math.abs(col0 - 1) > UNITARY_TOL || Math.abs(col1 - 1) > UNITARY_TOL || overlap > UNITARY_TOL) {
      throw new RangeError("Matrix must be unitary");
    }
    this.matrix = [
      [u00, u01],
      [u10, u11],
    ];
  }

  apply(q: Qubit): Qubit {
    const [[u00, u01], [u10, u11]] = this.matrix;
    return new Qubit(u00.mul(q.a).add(u01.mul(q.b)), u10.mul(q.a).add(u11.mul(q.b)));
  }

  /** The matrix product a·b: applied to a state, b acts first, then a. */
  static mult(a: Gate, b: Gate): Gate {
    const [[a00, a01], [a10, a11]] = a.matrix;
    const [[b00, b01], [b10, b11]] = b.matrix;
    return new Gate(
      [
        [a00.mul(b00).add(a01.mul(b10)), a00.mul(b01).add(a01.mul(b11))],
        [a10.mul(b00).add(a11.mul(b10)), a10.mul(b01).add(a11.mul(b11))],
      ],
      `${a.name || "U"} * ${b.name || "U"}`,
    );
  }

  /**
   * The gate as a global phase times a rotation: U = phase · R_axis(angle), with `angle` in [0, π]
   * (the short way round) and |phase| = 1.
   *
   * Any 2x2 unitary is e^(iα)·(cos(θ/2)·I − i·sin(θ/2)·(nx·X + ny·Y + nz·Z)). Dividing by √det removes
   * e^(iα); the entries of what remains give θ and n directly. Of the two square roots, the one with
   * Re(u00) ≥ 0 gives θ ≤ π. For a half turn (θ = π) both are equally short, so the axis is made to
   * point "forward" (first nonzero component positive), which keeps X^½ = √X rather than its inverse.
   * The identity has no axis; z is returned.
   */
  decompose(): { phase: Complex; axis: Vec3; angle: number } {
    const [[u00, u01], [u10, u11]] = this.matrix;
    let phase = u00.mul(u11).sub(u01.mul(u10)).sqrt();
    let a = u00.div(phase);
    let b = u01.div(phase);
    // sin(θ/2)·n
    let sn: Vec3 = [-b.im, -b.re, -a.im];
    const backward = (sn.find((c) => Math.abs(c) > 1e-12) ?? 0) < 0;
    if (a.re < -1e-12 || (Math.abs(a.re) <= 1e-12 && backward)) {
      a = a.neg();
      b = b.neg();
      phase = phase.neg();
      sn = [-b.im, -b.re, -a.im];
    }
    const s = Math.hypot(...sn);
    const angle = 2 * Math.atan2(s, a.re);
    const axis: Vec3 = s < 1e-12 ? [0, 0, 1] : [sn[0] / s, sn[1] / s, sn[2] / s];
    return { phase, axis, angle };
  }

  /** The rotation this gate performs on the Bloch sphere: `angle` radians in [0, π] about the unit `axis`. */
  axisAngle(): { axis: Vec3; angle: number } {
    const { axis, angle } = this.decompose();
    return { axis, angle };
  }

  /** U†: the gate that undoes this one. */
  adjoint(name = this.name && (this.name.endsWith("†") ? this.name.slice(0, -1) : `${this.name}†`)): Gate {
    const [[a, b], [c, d]] = this.matrix;
    return new Gate(
      [
        [a.conj(), c.conj()],
        [b.conj(), d.conj()],
      ],
      name,
    );
  }

  /**
   * U^t: t times the rotation, about the same axis, with the phase raised to t as well. For whole t this
   * is U·U·…·U (t < 0 repeats U†); U^½ is the square root that turns half as far, the short way round.
   */
  power(t: number, name?: string): Gate {
    const { phase, axis, angle } = this.decompose();
    const p = Complex.polar(1, t * phase.arg());
    const r = Gate.rotation(axis, t * angle).matrix;
    return new Gate(
      [
        [r[0][0].mul(p), r[0][1].mul(p)],
        [r[1][0].mul(p), r[1][1].mul(p)],
      ],
      name,
    );
  }

  /**
   * The global phase e^(iβ) with other = e^(iβ)·this, or null when the two are different gates. Gates
   * that differ only by a global phase rotate the sphere identically.
   */
  phaseTo(other: Gate, tol = 1e-9): Complex | null {
    const [[a, b], [c, d]] = this.matrix;
    const [[e, f], [g, h]] = other.matrix;
    // tr(U†V)/2 has magnitude 1 exactly when V = e^(iβ)U, and then equals e^(iβ).
    const overlap = a.conj().mul(e).add(c.conj().mul(g)).add(b.conj().mul(f)).add(d.conj().mul(h)).scale(0.5);
    return Math.abs(overlap.abs() - 1) < tol ? overlap : null;
  }

  /** Same rotation of the sphere, ignoring global phase. */
  equalsUpToPhase(other: Gate, tol = 1e-9): boolean {
    return this.phaseTo(other, tol) !== null;
  }

  /** R_n(θ) = cos(θ/2)·I − i·sin(θ/2)·(nx·X + ny·Y + nz·Z): rotation by `angle` about the unit `axis`. */
  static rotation(axis: Vec3, angle: number, name?: string): Gate {
    const c = Math.cos(angle / 2);
    const s = Math.sin(angle / 2);
    const [nx, ny, nz] = axis;
    return new Gate(
      [
        [new Complex(c, -s * nz), new Complex(-s * ny, -s * nx)],
        [new Complex(s * ny, -s * nx), new Complex(c, s * nz)],
      ],
      name,
    );
  }

  static rx(theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    return new Gate(
      [
        [c, new Complex(0, -s)],
        [new Complex(0, -s), c],
      ],
      `Rx(${degrees(theta)})`,
    );
  }

  static ry(theta: number): Gate {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    return new Gate(
      [
        [c, -s],
        [s, c],
      ],
      `Ry(${degrees(theta)})`,
    );
  }

  static rz(theta: number): Gate {
    return new Gate(
      [
        [Complex.polar(1, -theta / 2), 0],
        [0, Complex.polar(1, theta / 2)],
      ],
      `Rz(${degrees(theta)})`,
    );
  }

  static readonly I = new Gate(
    [
      [1, 0],
      [0, 1],
    ],
    "I",
  );
  static readonly X = new Gate(
    [
      [0, 1],
      [1, 0],
    ],
    "X",
  );
  static readonly Y = new Gate(
    [
      [0, new Complex(0, -1)],
      [Complex.I, 0],
    ],
    "Y",
  );
  static readonly Z = new Gate(
    [
      [1, 0],
      [0, -1],
    ],
    "Z",
  );
  static readonly H = new Gate(
    [
      [Math.SQRT1_2, Math.SQRT1_2],
      [Math.SQRT1_2, -Math.SQRT1_2],
    ],
    "H",
  );
  static readonly S = new Gate(
    [
      [1, 0],
      [0, Complex.I],
    ],
    "S",
  );
  static readonly T = new Gate(
    [
      [1, 0],
      [0, Complex.polar(1, Math.PI / 4)],
    ],
    "T",
  );
  static readonly S_DAG = new Gate(
    [
      [1, 0],
      [0, new Complex(0, -1)],
    ],
    "S†",
  );
  static readonly T_DAG = new Gate(
    [
      [1, 0],
      [0, Complex.polar(1, -Math.PI / 4)],
    ],
    "T†",
  );
}

function degrees(theta: number): string {
  return `${+((theta * 180) / Math.PI).toFixed(1)}°`;
}
