// sessionStorage is per tab: the bench survives a reload, and each tab has its own (design.md §9).
const KEY = "bloch-sphere:lab";

export function loadLabSession(): unknown {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLabSession(data: unknown): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the bench just won't survive a reload.
  }
}
