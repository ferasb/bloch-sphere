import type { Complex } from "../math/complex";

const TOL = 1e-9;

/** Magnitudes that show up in single-qubit states and gates, with their exact LaTeX. */
const MAGNITUDES: ReadonlyArray<[number, string]> = [
  [1, "1"],
  [Math.SQRT1_2, "\\tfrac{1}{\\sqrt{2}}"],
  [0.5, "\\tfrac{1}{2}"],
  [Math.sqrt(3) / 2, "\\tfrac{\\sqrt{3}}{2}"],
  [1 / Math.sqrt(3), "\\tfrac{1}{\\sqrt{3}}"],
  [Math.sqrt(2 / 3), "\\sqrt{\\tfrac{2}{3}}"],
  [Math.cos(Math.PI / 8), "\\cos\\tfrac{\\pi}{8}"],
  [Math.sin(Math.PI / 8), "\\sin\\tfrac{\\pi}{8}"],
];

export interface SignedTex {
  /** True when the value is a negative real times `tex`, so a caller can fold the sign into "−". */
  negative: boolean;
  tex: string;
  /** True when `tex` is a sum (like 0.35 + 0.61i) and needs parentheses as a coefficient. */
  compound: boolean;
}

/**
 * A complex number as LaTeX: exact (1/√2, i/√2, e^{iπ/4}/√2, …) when the magnitude is a common
 * value and the phase a multiple of 7.5° (π/24, which covers the π/8 phases T gates make),
 * otherwise decimals.
 */
export function complexTex(z: Complex): SignedTex {
  const r = z.abs();
  if (r < TOL) {
    return { negative: false, tex: "0", compound: false };
  }
  const magnitude = MAGNITUDES.find(([m]) => Math.abs(r - m) < TOL)?.[1];
  const steps = Math.round((z.arg() * 24) / Math.PI); // the phase in units of π/24 = 7.5°
  const exactPhase = Math.abs(z.arg() - (steps * Math.PI) / 24) < TOL;

  if (magnitude && exactPhase) {
    const k = ((steps % 48) + 48) % 48; // 0…47
    if (k === 0) return { negative: false, tex: magnitude, compound: false };
    if (k === 24) return { negative: true, tex: magnitude, compound: false };
    const i = magnitude === "1" ? "i" : `${magnitude}\\,i`;
    if (k === 12) return { negative: false, tex: i, compound: false };
    if (k === 36) return { negative: true, tex: i, compound: false };
    const phase = `e^{${phaseTex(k > 24 ? k - 48 : k)}}`;
    return { negative: false, tex: magnitude === "1" ? phase : `${magnitude}\\,${phase}`, compound: false };
  }

  const re = Math.abs(z.re) < 5e-4 ? 0 : z.re;
  const im = Math.abs(z.im) < 5e-4 ? 0 : z.im;
  if (im === 0) {
    return { negative: re < 0, tex: decimal(Math.abs(re)), compound: false };
  }
  if (re === 0) {
    return { negative: im < 0, tex: `${decimal(Math.abs(im))}\\,i`, compound: false };
  }
  return { negative: false, tex: `${re < 0 ? "-" : ""}${decimal(Math.abs(re))} ${im < 0 ? "-" : "+"} ${decimal(Math.abs(im))}\\,i`, compound: true };
}

/** The value with its sign, ready to stand alone (a matrix entry, a vector component). */
export function complexTexSigned(z: Complex): string {
  const { negative, tex } = complexTex(z);
  return negative ? `-${tex}` : tex;
}

/** e.g. k = 6 → "i\pi/4", k = −18 → "-3i\pi/4" (k in units of π/24). */
function phaseTex(k: number): string {
  const g = gcd(Math.abs(k), 24);
  const num = Math.abs(k) / g;
  const den = 24 / g;
  return `${k < 0 ? "-" : ""}${num === 1 ? "" : num}i\\pi${den === 1 ? "" : `/${den}`}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function decimal(x: number): string {
  return x.toFixed(3);
}
