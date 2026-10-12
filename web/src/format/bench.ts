import type { BenchGate, Tile } from "../model/bench";
import { degreesText } from "./angles";

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const FRACTIONS: ReadonlyArray<[number, string, string]> = [
  [1 / 2, "½", "1/2"],
  [1 / 3, "⅓", "1/3"],
  [2 / 3, "⅔", "2/3"],
  [1 / 4, "¼", "1/4"],
  [3 / 4, "¾", "3/4"],
  [1 / 8, "⅛", "1/8"],
];

const AXES: ReadonlyArray<[[number, number, number], string]> = [
  [[1, 0, 0], "x"],
  [[0, 1, 0], "y"],
  [[0, 0, 1], "z"],
];

function namedAxis(axis: readonly number[]): string | null {
  return AXES.find(([v]) => v.every((c, i) => Math.abs(c - axis[i]) < 1e-9))?.[1] ?? null;
}

/** Text after a tile's name for its power: "" (1), "†" (−1), "²", "½", "†²", "^0.37". */
export function powerText(p: number): string {
  if (p === 1) return "";
  if (p === -1) return "†";
  const dagger = p < 0 ? "†" : "";
  const m = Math.abs(p);
  if (Number.isInteger(m)) {
    return dagger + [...String(m)].map((d) => SUPERSCRIPT[d]).join("");
  }
  const fraction = FRACTIONS.find(([f]) => Math.abs(f - m) < 1e-9);
  return dagger + (fraction ? fraction[1] : `^${+m.toFixed(2)}`);
}

function baseText(g: BenchGate): string {
  switch (g.kind) {
    case "builtin":
      return g.name;
    case "rotation": {
      const axis = namedAxis(g.axis);
      return `R${axis ?? ""}(${degreesText(g.angle)})`;
    }
    case "saved":
    case "fixed":
      return g.label;
    case "group":
      return `(${g.tiles.map(tileText).join(" ")})`;
  }
}

/** A tile as it reads on the bench: "T", "S†", "X½", "Rx(45°)", "(H T)²". Groups list tiles in time order. */
export function tileText(t: Tile): string {
  return baseText(t.gate) + powerText(t.power);
}

function powerTex(p: number): string {
  if (p === 1) return "";
  if (p === -1) return "^{\\dagger}";
  if (Number.isInteger(p)) return `^{${p}}`;
  const sign = p < 0 ? "-" : "";
  const fraction = FRACTIONS.find(([f]) => Math.abs(f - Math.abs(p)) < 1e-9);
  return `^{${sign}${fraction ? fraction[2] : +Math.abs(p).toFixed(2)}}`;
}

function baseTex(g: BenchGate): string {
  switch (g.kind) {
    case "builtin":
      return g.name;
    case "rotation": {
      const axis = namedAxis(g.axis);
      return `R_{${axis ?? "\\hat n"}}(${+((g.angle * 180) / Math.PI).toFixed(1)}^\\circ)`;
    }
    case "saved":
    case "fixed":
      return `\\text{${g.label.replace(/[\\{}$&#^_%~]/g, "")}}`;
    case "group":
      return `\\left(${formulaTex(g.tiles)}\\right)`;
  }
}

export function tileTex(t: Tile): string {
  const base = baseTex(t.gate);
  // A power on a function-like base needs braces around the base: {R_x(45°)}^2.
  const wrapped = t.power !== 1 && t.gate.kind === "rotation" ? `{${base}}` : base;
  return wrapped + powerTex(t.power);
}

/**
 * The bench as a product in math order: the last tile first, since the rightmost factor acts first.
 * (Tiles run left to right in time; the product reads right to left.)
 */
export function formulaTex(tiles: readonly Tile[]): string {
  return tiles.length === 0 ? "I" : [...tiles].reverse().map(tileTex).join(" \\cdot ");
}

/** The same in plain text, for a saved gate's description: "H · T · H". */
export function formulaText(tiles: readonly Tile[]): string {
  return tiles.length === 0 ? "I" : [...tiles].reverse().map(tileText).join(" · ");
}
