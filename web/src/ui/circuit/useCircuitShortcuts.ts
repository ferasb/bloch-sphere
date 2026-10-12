import { useEffect } from "react";
import { TYPING_FIELDS } from "../useShortcuts";
import { useCircuit } from "./circuitStore";

/**
 * Keyboard for the room (the circuit itself handles arrows and gate letters while it has focus):
 * Space plays or pauses, ← → step, Home and End jump, Ctrl+Z undoes, Delete removes the selected
 * gate, Escape stops placing. Ignored while typing in a field.
 */
export function useCircuitShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target instanceof Element ? e.target : null;
      if (e.defaultPrevented || target?.closest(TYPING_FIELDS)) {
        return;
      }
      const s = useCircuit.getState();
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && key === "z") {
        e.preventDefault();
        s.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      // Space on a focused button presses the button; leave it be.
      if (key === " " && !target?.closest("button, a, [role='button']")) {
        e.preventDefault();
        if (s.target !== s.playhead) s.pause();
        else s.play();
      } else if (key === "arrowleft") {
        e.preventDefault();
        s.stepBack();
      } else if (key === "arrowright") {
        e.preventDefault();
        s.stepForward();
      } else if (key === "home") {
        e.preventDefault();
        s.toStart();
      } else if (key === "end") {
        e.preventDefault();
        s.toEnd();
      } else if ((key === "delete" || key === "backspace") && s.selectedOp) {
        e.preventDefault();
        s.removeOp(s.selectedOp);
      } else if (key === "escape") {
        s.arm(null);
        s.select(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
