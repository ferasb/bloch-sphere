import { NAMED_STATES } from "../math/qubit";
import { dot, length, type Vec3 } from "../math/vec3";
import type { TwoQubitEffect, TwoQubitOp } from "../model/circuit";
import { degreesText } from "./angles";

const OP_NAMES: Record<TwoQubitOp["kind"], string> = { cnot: "CNOT", cz: "CZ", swap: "SWAP" };

/**
 * A two-qubit gate's caption (design-gates.md §4.5): what it does at its column, and why.
 * `first` and `second` are its wires' names (a CNOT's control, then target).
 */
export function effectText(effect: TwoQubitEffect, kind: TwoQubitOp["kind"], first: string, second: string): string {
  const gate = OP_NAMES[kind];
  switch (effect.kind) {
    case "nothing":
      return `${effect.because} is |0⟩ here, so this ${gate} does nothing.`;
    case "flip":
      return kind === "cnot"
        ? `${effect.because} is |1⟩ here, so this CNOT just flips ${effect.on}.`
        : `${effect.because} is |1⟩ here, so this CZ just applies Z to ${effect.on}.`;
    case "entangles":
      return kind === "cnot"
        ? `${first} is in a superposition, so this CNOT entangles ${first} and ${second}.`
        : `Both are in superpositions, so this CZ entangles ${first} and ${second}.`;
    case "untangles":
      return `This ${gate} undoes the entanglement between ${first} and ${second}.`;
    case "unchanged":
      return `This ${gate} doesn't change how entangled ${first} and ${second} are.`;
    case "swap":
      return `Swaps the states of ${first} and ${second}.`;
  }
}

/** A wire's state at a moment, from its Bloch vector: "|+⟩", "θ 45° · φ 90°", or "entangled". */
export function wireStateText(v: Vec3): string {
  const size = length(v);
  if (size < 0.999) {
    return size < 0.001 ? "entangled" : `entangled · ${Math.round(size * 100)}%`;
  }
  const named = NAMED_STATES.find(({ state }) => dot(state.blochVector(), v) > 1 - 1e-9);
  if (named) {
    return named.label;
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, v[2] / size)));
  const phi = Math.atan2(v[1], v[0]);
  return `θ ${degreesText(theta)} · φ ${degreesText(phi < 0 ? phi + 2 * Math.PI : phi)}`;
}

/** The basis state with this index in an n-wire register, as "|0110⟩" (wire q1's bit first). */
export function basisLabel(index: number, n: number): string {
  return `|${index.toString(2).padStart(n, "0")}⟩`;
}
