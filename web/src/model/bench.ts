import { Complex } from "../math/complex";
import { Gate } from "../math/gate";
import type { Vec3 } from "../math/vec3";
import type { GateSpec } from "./sphere";

/**
 * The Gate Lab's bench (design-gates.md §3): a row of tiles in time order. Each tile is a gate
 * raised to a power: 1 as is, −1 undone (†), 2 twice, ½ half the rotation. The bench's gate is the
 * product of its tiles. Pure data; saved gates keep their tiles as their recipe.
 */

/** Built-in gates on the bench. S† and T† are S and T with power −1. */
export type BenchBuiltin = "X" | "Y" | "Z" | "H" | "S" | "T";

export type BenchGate =
  | { kind: "builtin"; name: BenchBuiltin }
  | { kind: "rotation"; axis: Vec3; angle: number }
  /** A saved gate, by value: its name, label and recipe. */
  | { kind: "saved"; name: string; label: string; tiles: readonly Tile[] }
  /** A gate known only by its matrix (e.g. a custom gate from a journey). */
  | { kind: "fixed"; label: string; gate: Gate }
  /** Several tiles taken as one, so a power applies to all of them: (H T)². */
  | { kind: "group"; tiles: readonly Tile[] };

export interface Tile {
  readonly id: string;
  readonly gate: BenchGate;
  readonly power: number;
}

/** Limits for gate names and labels (labels fit on a button). */
export const MAX_NAME = 40;
export const MAX_LABEL = 4;

const MAX_TILES = 64;
const MAX_DEPTH = 4;
const MAX_POWER = 64;

const BUILTINS: Record<BenchBuiltin, Gate> = { X: Gate.X, Y: Gate.Y, Z: Gate.Z, H: Gate.H, S: Gate.S, T: Gate.T };

let nextId = 0;

/** A fresh tile id (ids only identify tiles within the bench: selection, React keys). */
function newTileId(): string {
  return `tile-${++nextId}`;
}

export function tile(gate: BenchGate, power = 1): Tile {
  return { id: newTileId(), gate, power: tidy(power) };
}

/** Snap powers that are integers up to rounding (⅓ · 3), so they display and compute as such. */
function tidy(power: number): number {
  const round = Math.round(power);
  return Math.abs(power - round) < 1e-9 ? round : power;
}

/** The gate a tile's base stands for, before its power. */
function baseGate(g: BenchGate): Gate {
  switch (g.kind) {
    case "builtin":
      return BUILTINS[g.name];
    case "rotation":
      return Gate.rotation(g.axis, g.angle);
    case "fixed":
      return g.gate;
    case "saved":
    case "group":
      return product(g.tiles);
  }
}

export function tileGate(t: Tile): Gate {
  const base = baseGate(t.gate);
  return t.power === 1 ? base : base.power(t.power);
}

/** The bench's gate. Tiles act in time order, so U = M_n ⋯ M_2 · M_1; the empty bench is I. */
export function product(tiles: readonly Tile[]): Gate {
  return tiles.reduce((u, t) => Gate.mult(tileGate(t), u), Gate.I);
}

// --- Operations (design-gates.md §3.4) -------------------------------------------------------------

/** Undo a tile: U → U†. */
export function undoTile(t: Tile): Tile {
  return { ...t, power: -t.power };
}

/** Undo the whole bench: (A B C)† = C† B† A†, so reverse the order and undo each tile. */
export function undoBench(tiles: readonly Tile[]): Tile[] {
  return [...tiles].reverse().map(undoTile);
}

/** Raise a tile to k: Repeat (k = 2, 3, …) or Fraction (0 < k < 1). */
export function scaleTile(t: Tile, k: number): Tile {
  return { ...t, power: tidy(t.power * k) };
}

/** Raise the whole bench to k. More than one tile becomes a group, so k applies to all of them. */
export function scaleBench(tiles: readonly Tile[], k: number): Tile[] {
  if (tiles.length === 0) {
    return [];
  }
  return tiles.length === 1 ? [scaleTile(tiles[0], k)] : [tile({ kind: "group", tiles }, k)];
}

/** The same tiles in the opposite time order (for comparing A·B with B·A). */
export function reversed(tiles: readonly Tile[]): Tile[] {
  return [...tiles].reverse();
}

/** A tile for a gate the main room names: S† and T† become S and T undone; custom gates by matrix. */
export function tileFromSpec(spec: GateSpec): Tile {
  switch (spec.name) {
    case "S†":
    case "T†":
      return tile({ kind: "builtin", name: spec.name[0] as BenchBuiltin }, -1);
    case "Rx":
      return tile({ kind: "rotation", axis: [1, 0, 0], angle: spec.angle });
    case "Ry":
      return tile({ kind: "rotation", axis: [0, 1, 0], angle: spec.angle });
    case "Rz":
      return tile({ kind: "rotation", axis: [0, 0, 1], angle: spec.angle });
    case "custom":
      return tile({ kind: "fixed", label: spec.label, gate: spec.gate });
    default:
      return tile({ kind: "builtin", name: spec.name });
  }
}

// --- JSON (saved gates and the lab session; validated on load, as both can be tampered with) -------

export function saveTiles(tiles: readonly Tile[]): unknown[] {
  return tiles.map((t) => ({ gate: saveGate(t.gate), power: t.power }));
}

function saveGate(g: BenchGate): unknown {
  switch (g.kind) {
    case "fixed":
      return { kind: "fixed", label: g.label, matrix: g.gate.matrix.flatMap((row) => row.flatMap((z) => [z.re, z.im])) };
    case "saved":
      return { kind: "saved", name: g.name, label: g.label, tiles: saveTiles(g.tiles) };
    case "group":
      return { kind: "group", tiles: saveTiles(g.tiles) };
    default:
      return g;
  }
}

/** Rebuild tiles from JSON with fresh ids. Throws on anything malformed. */
export function loadTiles(data: unknown, depth = 0): Tile[] {
  if (!Array.isArray(data) || data.length > MAX_TILES || depth > MAX_DEPTH) {
    throw new Error("Invalid tiles");
  }
  return data.map((item) => {
    const t = record(item);
    if (!Number.isFinite(t.power) || Math.abs(t.power as number) > MAX_POWER) {
      throw new Error("Invalid power");
    }
    return tile(loadGate(t.gate, depth), t.power as number);
  });
}

function loadGate(data: unknown, depth: number): BenchGate {
  const g = record(data);
  switch (g.kind) {
    case "builtin":
      if (typeof g.name === "string" && g.name in BUILTINS) {
        return { kind: "builtin", name: g.name as BenchBuiltin };
      }
      break;
    case "rotation": {
      const axis = g.axis;
      if (Array.isArray(axis) && axis.length === 3 && axis.every(Number.isFinite) && Number.isFinite(g.angle)) {
        const n = Math.hypot(...(axis as number[]));
        if (Math.abs(n - 1) < 1e-6) {
          return { kind: "rotation", axis: axis as unknown as Vec3, angle: g.angle as number };
        }
      }
      break;
    }
    case "fixed": {
      const m = g.matrix;
      if (typeof g.label === "string" && g.label.length >= 1 && g.label.length <= MAX_LABEL && Array.isArray(m) && m.length === 8 && m.every(Number.isFinite)) {
        const [a, b, c, d, e, f, h, k] = m as number[];
        // The Gate constructor rejects anything that isn't unitary.
        const gate = new Gate(
          [
            [new Complex(a, b), new Complex(c, d)],
            [new Complex(e, f), new Complex(h, k)],
          ],
          g.label,
        );
        return { kind: "fixed", label: g.label, gate };
      }
      break;
    }
    case "saved":
      if (typeof g.name === "string" && g.name.length <= MAX_NAME && typeof g.label === "string" && g.label.length >= 1 && g.label.length <= MAX_LABEL) {
        return { kind: "saved", name: g.name, label: g.label, tiles: loadTiles(g.tiles, depth + 1) };
      }
      break;
    case "group":
      return { kind: "group", tiles: loadTiles(g.tiles, depth + 1) };
  }
  throw new Error("Invalid bench gate");
}

function record(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Expected an object");
  }
  return data as Record<string, unknown>;
}
