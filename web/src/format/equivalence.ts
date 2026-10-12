import type { Complex } from "../math/complex";
import { Gate } from "../math/gate";
import { degreesText } from "./angles";

export interface Equivalence {
  /** What the gate is the same as: "X", "I", "Rx(45°)", or a saved gate's name. */
  name: string;
  /** The global phase e^(iβ) with gate = e^(iβ) · that gate. */
  phase: Complex;
}

const NAMED: ReadonlyArray<[string, Gate]> = [
  ["I", Gate.I],
  ["X", Gate.X],
  ["Y", Gate.Y],
  ["Z", Gate.Z],
  ["H", Gate.H],
  ["S", Gate.S],
  ["T", Gate.T],
  ["S†", Gate.S_DAG],
  ["T†", Gate.T_DAG],
  ["√X", Gate.X.power(0.5)],
];

const AXES: ReadonlyArray<[string, (angle: number) => Gate]> = [
  ["x", Gate.rx],
  ["y", Gate.ry],
  ["z", Gate.rz],
];

/**
 * A known gate this one equals up to global phase: a built-in, one of `saved`, or a rotation about
 * x, y or z by a multiple of 7.5°. Null when it's none of those.
 */
export function findEquivalent(gate: Gate, saved: ReadonlyArray<{ name: string; gate: Gate }> = []): Equivalence | null {
  for (const [name, known] of [...NAMED, ...saved.map((s) => [s.name, s.gate] as const)]) {
    const phase = known.phaseTo(gate);
    if (phase) {
      return { name, phase };
    }
  }
  const { angle } = gate.axisAngle();
  const step = Math.PI / 24; // 7.5°
  if (Math.abs(angle / step - Math.round(angle / step)) > 1e-9) {
    return null;
  }
  for (const [name, make] of AXES) {
    for (const sign of [1, -1]) {
      const candidate = make(sign * angle);
      const phase = candidate.phaseTo(gate);
      if (phase) {
        return { name: `R${name}(${sign < 0 ? "−" : ""}${degreesText(angle)})`, phase };
      }
    }
  }
  return null;
}
