import { useEffect } from "react";
import type { FixedGateName } from "../model/sphere";
import { useApp } from "./store";

/** Gate letters on the keyboard (Shift+S and Shift+T for S† and T†), in both rooms. */
export const GATE_KEYS: Record<string, "X" | "Y" | "Z" | "H" | "S" | "T"> = { x: "X", y: "Y", z: "Z", h: "H", s: "S", t: "T" };

/** Where letters are text, not shortcuts. Checkboxes and sliders don't take letters, so they don't count. */
export const TYPING_FIELDS = "input:not([type='checkbox'], [type='radio'], [type='range']), textarea, select, [contenteditable='true']";

/**
 * Keyboard: gate letters (Shift+S and Shift+T for S† and T†), Ctrl+Z to undo, 1–5 to select a
 * qubit by its number, A to toggle apply-to-all. Ignored while typing in a field.
 */
export function useShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || (e.target instanceof Element && e.target.closest(TYPING_FIELDS))) {
        return;
      }
      const s = useApp.getState();
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && key === "z") {
        e.preventDefault();
        s.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      const gate = GATE_KEYS[key];
      if (gate) {
        e.preventDefault();
        const dagger = e.shiftKey && (gate === "S" || gate === "T");
        s.applyGate({ name: dagger ? (`${gate}†` as FixedGateName) : gate });
      } else if (/^[1-5]$/.test(key)) {
        const q = s.sphere.qubits.find((entry) => entry.colorSlot === Number(key));
        if (q) {
          s.select(q.id);
        }
      } else if (key === "a" && s.sphere.qubits.length > 1) {
        s.setApplyToAll(!s.applyToAll);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
