import { create } from "zustand";
import type { Circuit } from "../../model/circuit";
import { loadCircuits, onCircuitsChangedElsewhere, saveCircuits, type SavedCircuit } from "../../persist/circuits";

const MAX_SAVED = 200;

/** My circuits: saved circuits, shared with other tabs through localStorage. */
export interface CircuitLibraryState {
  circuits: SavedCircuit[];
  deleted: { circuit: SavedCircuit; index: number } | null;
  /** Save a new circuit, or overwrite the one with this id. Returns what was stored. */
  save(entry: { id?: string; name: string; circuit: Circuit }): SavedCircuit;
  duplicate(id: string): void;
  remove(id: string): void;
  restore(): void;
  dismissDeleted(): void;
}

function newId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useCircuitLibrary = create<CircuitLibraryState>()((set, get) => ({
  circuits: loadCircuits(),
  deleted: null,

  save(entry) {
    const { circuits } = get();
    const index = entry.id ? circuits.findIndex((c) => c.id === entry.id) : -1;
    if (index < 0 && circuits.length >= MAX_SAVED) {
      throw new RangeError(`You can save up to ${MAX_SAVED} circuits`);
    }
    const stored: SavedCircuit = { id: index >= 0 ? entry.id! : newId(), name: entry.name, circuit: entry.circuit };
    set({ circuits: index >= 0 ? circuits.map((c, i) => (i === index ? stored : c)) : [...circuits, stored] });
    return stored;
  },

  duplicate(id) {
    const { circuits } = get();
    const index = circuits.findIndex((c) => c.id === id);
    if (index >= 0 && circuits.length < MAX_SAVED) {
      const copy = { ...circuits[index], id: newId(), name: `${circuits[index].name} copy`.slice(0, 40) };
      set({ circuits: [...circuits.slice(0, index + 1), copy, ...circuits.slice(index + 1)] });
    }
  },

  remove(id) {
    const { circuits } = get();
    const index = circuits.findIndex((c) => c.id === id);
    if (index >= 0) {
      set({ circuits: circuits.filter((c) => c.id !== id), deleted: { circuit: circuits[index], index } });
    }
  },

  restore() {
    const { circuits, deleted } = get();
    if (deleted) {
      set({ circuits: [...circuits.slice(0, deleted.index), deleted.circuit, ...circuits.slice(deleted.index)], deleted: null });
    }
  },

  dismissDeleted() {
    set({ deleted: null });
  },
}));

useCircuitLibrary.subscribe((state, prev) => {
  if (state.circuits !== prev.circuits) {
    saveCircuits(state.circuits);
  }
});

onCircuitsChangedElsewhere((circuits) => useCircuitLibrary.setState({ circuits }));
