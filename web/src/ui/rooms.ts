import { useSyncExternalStore } from "react";

/** The rooms of the app (design-gates.md §5). The URL hash says which one is open, so Back works. */
export type Room = "sphere" | "lab";

const HASHES: Record<Room, string> = { sphere: "#/", lab: "#/lab" };

function currentRoom(): Room {
  return window.location.hash === HASHES.lab ? "lab" : "sphere";
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
