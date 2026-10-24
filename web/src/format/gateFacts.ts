import type { Complex } from "../math/complex";
import type { Gate } from "../math/gate";
import { NAMED_STATES } from "../math/qubit";
import { degreesText } from "./angles";
import { complexTex, complexTexSigned } from "./exact";
import { ketTex } from "./ket";

/** Where each of the six axis states sits, as an axis direction. */
const DIRECTIONS: Record<string, string> = {
  "|0⟩": "+z",
  "|1⟩": "−z",
  "|+⟩": "+x",
  "|−⟩": "−x",
  "|+i⟩": "+y",
  "|−i⟩": "−y",
};

/** An axis state's label as LaTeX: "|+i⟩" → "|{+i}\rangle" (braced, so + and − aren't spaced as operators). */
export function labelTex(label: string): string {
  return `|{${label.slice(1, -1).replace("−", "-")}}\\rangle`;
}

/** A unit complex factor in front of something: "" for 1, "-" for −1, else "i", "e^{i\pi/4}", … */
function factorTex(c: Complex): string {
  const { negative, tex } = complexTex(c);
  return (negative ? "-" : "") + (tex === "1" ? "" : tex);
}

/**
 * A gate's matrix as LaTeX, with exact entries where it can (1/√2, e^{iπ/4}, …). Rows of fractions
 * are stretched apart; at the usual height, one row's √2 touches the next row's numerator.
 */
export function matrixTex(gate: Gate): string {
  const [[a, b], [c, d]] = gate.matrix;
  const [ta, tb, tc, td] = [a, b, c, d].map(complexTexSigned);
  const matrix = `\\begin{bmatrix} ${ta} & ${tb} \\\\ ${tc} & ${td} \\end{bmatrix}`;
  return [ta, tb, tc, td].some((t) => t.includes("frac")) ? `{\\def\\arraystretch{1.5}${matrix}}` : matrix;
}

/**
 * The factor f with gate = f · other, as LaTeX ("i", "e^{i\pi/4}"), or null when the two are different
 * rotations. Gates that differ only by such a global phase turn the sphere the same way.
 */
export function phaseFactorTex(gate: Gate, other: Gate): string | null {
  const f = other.phaseTo(gate);
  return f ? factorTex(f) : null;
}

export interface KeyStateMove {
  /** The axis state the gate acts on, as the sphere labels it: "|+⟩". */
  from: string;
  /** The axis state it lands on, or null when it lands off the axes. */
  to: string | null;
  /** The result as LaTeX, exactly, global phase included: "-|{-}\rangle", "e^{i\pi/4}|{-i}\rangle". */
  tex: string;
  /** Where the arrow goes: "+z → −z", "stays put", "to θ 90°, φ 45°". */
  motion: string;
}

/** What a gate does to each of the six axis states. */
export function keyStateMoves(gate: Gate): KeyStateMove[] {
  return NAMED_STATES.map(({ label, state }) => {
    const result = gate.apply(state);
    const named = NAMED_STATES.find((s) => s.state.isEquivalent(result, 1e-9));
    if (named) {
      const factor = factorTex(named.state.inner(result));
      const motion = named.label === label ? "stays put" : `${DIRECTIONS[label]} → ${DIRECTIONS[named.label]}`;
      return { from: label, to: named.label, tex: `${factor}${labelTex(named.label)}`, motion };
    }
    const [theta, phi] = result.blochAngles();
    return { from: label, to: null, tex: ketTex(result, true), motion: `to θ ${degreesText(theta)}, φ ${degreesText(phi)}` };
  });
}
