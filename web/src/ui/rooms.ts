import { useSyncExternalStore } from "react";

/** The rooms of the app (design-gates.md §5). The URL hash says which one is open, so Back works. */
export type Room = "sphere" | "lab" | "circuit";

const HASHES: Record<Room, string> = { sphere: "#/", lab: "#/lab", circuit: "#/circuit" };

function currentRoom(): Room {
  const hash = window.location.hash;
  return hash === HASHES.lab ? "lab" : hash === HASHES.circuit ? "circuit" : "sphere";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoom(): Room {
  return useSyncExternalStore(subscribe, currentRoom);
}

export function goToRoom(room: Room): void {
  if (currentRoom() !== room) {
    window.location.hash = HASHES[room];
  }
}
