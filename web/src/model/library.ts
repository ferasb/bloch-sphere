import type { Gate } from "../math/gate";
import { loadTiles, MAX_LABEL, MAX_NAME, product, saveTiles, type Tile } from "./bench";

/**
 * My gates (design-gates.md §2.4): gates saved from the Gate Lab. Each keeps its tiles as its
 * recipe, so it can be reopened and edited; its matrix is computed from them.
 */
export interface SavedGate {
  readonly id: string;
  readonly name: string;
  /** ≤ 4 characters: what buttons and journey chips show. */
  readonly label: string;
  readonly tiles: readonly Tile[];
  /** Shown in the gate bar (at most MAX_PINNED). */
  readonly pinned: boolean;
}

export const MAX_PINNED = 4;
export const MAX_SAVED = 200;

export function savedGateMatrix(g: SavedGate): Gate {
  return product(g.tiles);
}

export function saveLibrary(gates: readonly SavedGate[]): unknown {
  return {
    version: 1,
    gates: gates.map((g) => ({ id: g.id, name: g.name, label: g.label, pinned: g.pinned, tiles: saveTiles(g.tiles) })),
  };
}

/**
 * Gates from JSON (browser storage or an imported file). Entries that don't validate are skipped,
 * so one bad entry doesn't cost the rest. Throws only if the whole thing isn't a library.
 */
export function loadLibrary(data: unknown): SavedGate[] {
  if (typeof data !== "object" || data === null || (data as { version?: unknown }).version !== 1 || !Array.isArray((data as { gates?: unknown }).gates)) {
    throw new Error("Not a gate library");
  }
  const out: SavedGate[] = [];
  for (const item of (data as { gates: unknown[] }).gates.slice(0, MAX_SAVED)) {
    try {
      out.push(loadSavedGate(item));
    } catch {
      // Skip it; keep the rest.
    }
  }
  return out;
}

function loadSavedGate(data: unknown): SavedGate {
  const g = data as Record<string, unknown>;
  if (
    typeof g !== "object" ||
    g === null ||
    typeof g.id !== "string" ||
    g.id.length > 64 ||
    typeof g.name !== "string" ||
    g.name.trim().length === 0 ||
    g.name.length > MAX_NAME ||
    typeof g.label !== "string" ||
    g.label.length < 1 ||
    g.label.length > MAX_LABEL
  ) {
    throw new Error("Invalid saved gate");
  }
  const tiles = loadTiles(g.tiles);
  if (tiles.length === 0) {
    throw new Error("Empty saved gate");
  }
  return { id: g.id, name: g.name, label: g.label, pinned: g.pinned === true, tiles };
}
