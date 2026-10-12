import { create } from "zustand";
import { MAX_NAME } from "../model/bench";
import { MAX_PINNED, MAX_SAVED, type SavedGate } from "../model/library";
import { loadGates, onGatesChangedElsewhere, saveGates } from "../persist/library";

/** My gates: the saved-gate library, shared with other tabs through localStorage. */
export interface LibraryState {
  gates: SavedGate[];
  /** The last deleted gate and where it was, while its Restore notice is up. */
  deleted: { gate: SavedGate; index: number } | null;

  /** Save a new gate, or overwrite the one with the same id. Returns what was stored. */
  save(gate: Omit<SavedGate, "id"> & { id?: string }): SavedGate;
  duplicate(id: string): void;
  /** False when pinning would exceed MAX_PINNED. */
  setPinned(id: string, pinned: boolean): boolean;
  remove(id: string): void;
  restore(): void;
  dismissDeleted(): void;
}

function newId(): string {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function canPin(gates: readonly SavedGate[]): boolean {
  return gates.filter((g) => g.pinned).length < MAX_PINNED;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  gates: loadGates(),
  deleted: null,

  save(gate) {
    const { gates } = get();
    const existing = gate.id ? gates.findIndex((g) => g.id === gate.id) : -1;
    if (existing < 0 && gates.length >= MAX_SAVED) {
      throw new RangeError(`You can save up to ${MAX_SAVED} gates`);
    }
    const others = gates.filter((g) => g.id !== gate.id);
    const stored: SavedGate = { ...gate, id: gate.id ?? newId(), pinned: gate.pinned && (existing >= 0 ? gates[existing].pinned || canPin(others) : canPin(gates)) };
    set({ gates: existing >= 0 ? gates.map((g, i) => (i === existing ? stored : g)) : [...gates, stored] });
    return stored;
  },

  duplicate(id) {
    const { gates } = get();
    const index = gates.findIndex((g) => g.id === id);
    if (index >= 0 && gates.length < MAX_SAVED) {
      const copy: SavedGate = { ...gates[index], id: newId(), name: `${gates[index].name} copy`.slice(0, MAX_NAME), pinned: false };
      set({ gates: [...gates.slice(0, index + 1), copy, ...gates.slice(index + 1)] });
    }
  },

  setPinned(id, pinned) {
    const { gates } = get();
    if (pinned && !canPin(gates)) {
      return false;
    }
    set({ gates: gates.map((g) => (g.id === id ? { ...g, pinned } : g)) });
    return true;
  },

  remove(id) {
    const { gates } = get();
    const index = gates.findIndex((g) => g.id === id);
    if (index >= 0) {
      set({ gates: gates.filter((g) => g.id !== id), deleted: { gate: gates[index], index } });
    }
  },

  restore() {
    const { gates, deleted } = get();
    if (deleted) {
      const gate = { ...deleted.gate, pinned: deleted.gate.pinned && canPin(gates) };
      set({ gates: [...gates.slice(0, deleted.index), gate, ...gates.slice(deleted.index)], deleted: null });
    }
  },

  dismissDeleted() {
    set({ deleted: null });
  },
}));

useLibrary.subscribe((state, prev) => {
  if (state.gates !== prev.gates) {
    saveGates(state.gates);
  }
});

onGatesChangedElsewhere((gates) => useLibrary.setState({ gates }));
