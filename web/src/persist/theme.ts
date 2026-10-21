export type Theme = "light" | "dark";

// localStorage, so a picked theme holds in every tab and on the About and Privacy pages.
// public/theme-init.js reads the same key before the first paint.
const KEY = "bloch-sphere:theme";

/** The theme the visitor picked, or null if they haven't: then the system's applies. */
export function loadTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage full or blocked: the pick lasts until the tab closes.
  }
}

/** Calls back when another tab picks a theme. */
export function onThemeChangedElsewhere(callback: (theme: Theme | null) => void): void {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      callback(loadTheme());
    }
  });
}
