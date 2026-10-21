import { deserialize, serialize } from "../model/serialize";
import type { Sphere } from "../model/sphere";

// sessionStorage is per tab, so each tab keeps its own journey across reloads (design.md §9).
const KEY = "bloch-sphere:journey";

/** The journey this tab had before a reload, or null. Storage can be empty, blocked or corrupt. */
export function loadSession(): Sphere | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? deserialize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveSession(sphere: Sphere): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(serialize(sphere)));
  } catch {
    // Storage full or blocked: the journey just won't survive a reload.
  }
}

// The challenge this tab is playing, if any (model/challenges.ts), so a reload keeps it.
const CHALLENGE_KEY = "bloch-sphere:challenge";

export function loadChallenge(): string | null {
  try {
    return sessionStorage.getItem(CHALLENGE_KEY);
  } catch {
    return null;
  }
}

export function saveChallenge(id: string | null): void {
  try {
    if (id) {
      sessionStorage.setItem(CHALLENGE_KEY, id);
    } else {
      sessionStorage.removeItem(CHALLENGE_KEY);
    }
  } catch {
    // Storage blocked: the challenge ends with a reload.
  }
}
