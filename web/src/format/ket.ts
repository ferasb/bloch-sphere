import { Complex } from "../math/complex";
import { NAMED_STATES, Qubit } from "../math/qubit";
import { degreesText } from "./angles";
import { complexTex, complexTexSigned } from "./exact";

/**
 * The same state with its global phase removed: α real and ≥ 0 (or β, when α = 0). The sphere
 * can't show global phase, so the text shows this form and the two always agree.
 */
export function canonical(q: Qubit): Qubit {
  const reference = q.a.abs() > 1e-9 ? q.a : q.b;
  const undo = Complex.polar(1, -reference.arg());
  return new Qubit(q.a.mul(undo), q.b.mul(undo));
}

/** "|+⟩" if the state is one of the six axis states, else null. */
export function stateName(q: Qubit): string | null {
  return NAMED_STATES.find(({ state }) => state.isEquivalent(q, 1e-9))?.label ?? null;
}

/** A state in a few characters: its name if it's an axis state ("|+⟩"), else its angles ("θ 45° · φ 90°"). */
export function stateText(q: Qubit): string {
  const [theta, phi] = q.blochAngles();
  return stateName(q) ?? `θ ${degreesText(theta)} · φ ${degreesText(phi)}`;
}

/** α|0⟩ + β|1⟩ as LaTeX, in canonical phase, signs folded into the operators. */
export function ketTex(q: Qubit): string {
  const { a, b } = canonical(q);
  const terms = [
    [a, "|0\\rangle"],
    [b, "|1\\rangle"],
  ] as const;
  let out = "";
  for (const [amplitude, ket] of terms) {
    const { negative, tex, compound } = complexTex(amplitude);
    if (tex === "0") {
      continue;
    }
    const coefficient = tex === "1" ? "" : compound ? `\\left(${tex}\\right)` : tex;
    const sign = out === "" ? (negative ? "-" : "") : negative ? " - " : " + ";
    out += `${sign}${coefficient}${ket}`;
  }
  return out;
}

/** [α, β] as a LaTeX column vector, in canonical phase. */
export function columnTex(q: Qubit): string {
  const { a, b } = canonical(q);
  return `\\begin{bmatrix} ${complexTexSigned(a)} \\\\ ${complexTexSigned(b)} \\end{bmatrix}`;
}
