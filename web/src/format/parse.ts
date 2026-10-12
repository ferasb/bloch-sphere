import { Complex } from "../math/complex";

const NUMBER = String.raw`(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const REAL = new RegExp(`^([+-]?${NUMBER})$`, "i");
const IMAGINARY = new RegExp(`^([+-]?)(${NUMBER})?[ij]$`, "i");
const BOTH = new RegExp(`^([+-]?${NUMBER})([+-])(${NUMBER})?[ij]$`, "i");

/**
 * Parses a typed amplitude: "0.6", "-1", "0.8i", "-i", "1+2i", "0.5 - 0.5i" (j also works for i).
 * Returns null for anything else, including non-finite results. Never evaluates code.
 */
export function parseComplex(text: string): Complex | null {
  const s = text.replace(/\s+/g, "").replace(/−/g, "-");
  let z: Complex | null = null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(REAL))) {
    z = new Complex(Number(m[1]), 0);
  } else if ((m = s.match(IMAGINARY))) {
    z = new Complex(0, (m[1] === "-" ? -1 : 1) * (m[2] === undefined ? 1 : Number(m[2])));
  } else if ((m = s.match(BOTH))) {
    z = new Complex(Number(m[1]), (m[2] === "-" ? -1 : 1) * (m[3] === undefined ? 1 : Number(m[3])));
  }
  return z && z.isFinite() ? z : null;
}
