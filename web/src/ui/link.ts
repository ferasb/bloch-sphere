import { NAMED_STATES } from "../math/qubit";
import { tileFromSpec } from "../model/bench";
import { parseLink } from "../model/link";
import { useLab } from "./lab/labStore";
import { useApp } from "./store";

/** Opens a link in the URL hash (model/link.ts), then tidies the URL to the room's own hash. */
function openLink(): void {
  const link = parseLink(window.location.hash);
  if (!link) {
    return;
  }
  // Replaced, not pushed: Back leaves the page, and a reload doesn't replay the link.
  history.replaceState(null, "", link.room === "lab" ? "#/lab" : "#/");
  if (link.room === "lab") {
    const lab = useLab.getState();
    lab.setTestState(NAMED_STATES.find(({ state }) => state === link.start)!.label);
    lab.open(link.gates.map(tileFromSpec));
  } else {
    useApp.getState().openLink(link.start, link.gates);
  }
}

/**
 * Open the link the page was loaded with, and any pasted into the address bar later (that changes
 * only the hash, so the page doesn't reload). Call before the app renders: this listener then runs
 * before the room switcher's, which reads the tidied hash.
 */
export function openLinks(): void {
  openLink();
  window.addEventListener("hashchange", openLink);
}
