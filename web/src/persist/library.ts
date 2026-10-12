import { loadLibrary, saveLibrary, type SavedGate } from "../model/library";

// localStorage is shared by every tab of this site, so saved gates appear in all of them.
const KEY = "bloch-sphere:gates";

export function loadGates(): SavedGate[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? loadLibrary(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveGates(gates: readonly SavedGate[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saveLibrary(gates)));
  } catch {
    // Storage full or blocked: the gates live until the tab closes.
  }
}

/** Calls back when another tab changes the saved gates. */
export function onGatesChangedElsewhere(callback: (gates: SavedGate[]) => void): void {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      callback(loadGates());
    }
  });
}
