import { useEffect } from "react";
import { tile } from "../../model/bench";
import { GATE_KEYS, TYPING_FIELDS } from "../useShortcuts";
import { useLab } from "./labStore";

/**
 * Keyboard in the Gate Lab: gate letters add tiles (Shift+S and Shift+T add S† and T†);
 * Delete removes the selected tile; Alt+←/→ moves it; Escape selects the whole bench again.
 */
export function useLabShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || (e.target instanceof Element && e.target.closest(TYPING_FIELDS))) {
        return;
      }
      const lab = useLab.getState();
      const key = e.key.toLowerCase();
      const index = lab.tiles.findIndex((t) => t.id === lab.selectedTile);
      if (index >= 0 && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        lab.moveTile(lab.selectedTile!, index + (e.key === "ArrowLeft" ? -1 : 1));
      } else if (index >= 0 && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        lab.removeTile(lab.selectedTile!);
      } else if (e.key === "Escape") {
        lab.selectTile(null);
      } else if (GATE_KEYS[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const dagger = e.shiftKey && (key === "s" || key === "t");
        lab.addTile(tile({ kind: "builtin", name: GATE_KEYS[key] }, dagger ? -1 : 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
