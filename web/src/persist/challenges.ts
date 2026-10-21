import { CHALLENGES } from "../model/challenges";

// localStorage, so the stars earned in challenges stay across visits, in this browser only.
const KEY = "bloch-sphere:challenges";

/** Best stars per challenge id (1–3); unknown ids and bad values are dropped. */
export function loadStars(): Record<string, number> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {};
    }
    const stars: Record<string, number> = {};
    for (const c of CHALLENGES) {
      const value = (data as Record<string, unknown>)[c.id];
      if (value === 1 || value === 2 || value === 3) {
        stars[c.id] = value;
      }
    }
    return stars;
  } catch {
    return {};
  }
}

export function saveStars(stars: Record<string, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stars));
  } catch {
    // Storage full or blocked: the stars last until the tab closes.
  }
}
