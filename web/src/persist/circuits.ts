import { loadCircuit, saveCircuit, type Circuit } from "../model/circuit";

// The circuit being built lives per tab (sessionStorage); saved circuits are shared by every tab
// of this site (localStorage), like saved gates.
const SESSION_KEY = "bloch-sphere:circuit";
const LIBRARY_KEY = "bloch-sphere:circuits";

export interface CircuitSession {
  circuit: Circuit;
  name: string;
  editing: string | null;
}

export function loadCircuitSession(): CircuitSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      circuit: loadCircuit(data.circuit),
      name: typeof data.name === "string" ? data.name.slice(0, 40) : "My circuit",
      editing: typeof data.editing === "string" ? data.editing : null,
    };
  } catch {
    return null;
  }
}

export function saveCircuitSession(s: CircuitSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ circuit: saveCircuit(s.circuit), name: s.name, editing: s.editing }));
  } catch {
    // Storage full or blocked: the circuit just won't survive a reload.
  }
}

export interface SavedCircuit {
  id: string;
  name: string;
  circuit: Circuit;
}

export function loadCircuits(): SavedCircuit[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || data.version !== 1 || !Array.isArray(data.circuits)) return [];
    const out: SavedCircuit[] = [];
    for (const item of data.circuits.slice(0, 200)) {
      try {
        if (typeof item.id === "string" && item.id.length <= 64 && typeof item.name === "string" && item.name.trim() && item.name.length <= 40) {
          out.push({ id: item.id, name: item.name, circuit: loadCircuit(item.circuit) });
        }
      } catch {
        // Skip a bad entry; keep the rest.
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function saveCircuits(circuits: readonly SavedCircuit[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify({ version: 1, circuits: circuits.map((c) => ({ id: c.id, name: c.name, circuit: saveCircuit(c.circuit) })) }));
  } catch {
    // Storage full or blocked.
  }
}

/** Calls back when another tab changes the saved circuits. */
export function onCircuitsChangedElsewhere(callback: (circuits: SavedCircuit[]) => void): void {
  window.addEventListener("storage", (e) => {
    if (e.key === LIBRARY_KEY) callback(loadCircuits());
  });
}
