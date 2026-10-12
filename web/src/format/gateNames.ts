import type { Gate } from "../math/gate";
import { rotationText } from "./rotation";

/**
 * The standard names of gates, as students meet them in courses and textbooks. Buttons and circuit
 * boxes show the short symbol; descriptions use the name (and, for some, what it's also called).
 */
const NAMES: Record<string, { name: string; also?: string }> = {
  I: { name: "Identity", also: "does nothing" },
  X: { name: "Pauli-X", also: "the quantum NOT" },
  Y: { name: "Pauli-Y" },
  Z: { name: "Pauli-Z", also: "a phase flip" },
  H: { name: "Hadamard" },
  S: { name: "S gate", also: "the phase gate, √Z" },
  T: { name: "T gate", also: "the π/8 gate, √S" },
  "S†": { name: "S-dagger", also: "undoes S" },
  "T†": { name: "T-dagger", also: "undoes T" },
  "√X": { name: "Square root of X", also: "√NOT" },
  CNOT: { name: "Controlled-NOT", also: "CX" },
  CZ: { name: "Controlled-Z" },
  SWAP: { name: "SWAP" },
};

/** "Pauli-X" for "X", "X-rotation" for "Rx(45°)", or null for a symbol without a standard name. */
export function gateName(symbol: string): string | null {
  const rotation = symbol.match(/^R([xyz])\(/);
  if (rotation) {
    return `${rotation[1].toUpperCase()}-rotation`;
  }
  return NAMES[symbol]?.name ?? null;
}

/** What it's also called, if it has a common nickname: "the quantum NOT" for X. */
export function gateNickname(symbol: string): string | null {
  return NAMES[symbol]?.also ?? null;
}

/** A gate described for a tooltip: "Hadamard (H): 180° about the x+z diagonal". */
export function describeGate(symbol: string, gate: Gate): string {
  const name = gateName(symbol);
  const also = gateNickname(symbol);
  const title = name ? `${name} (${symbol})${also ? `, ${also}` : ""}` : symbol;
  return `${title}: ${rotationText(gate)}`;
}
