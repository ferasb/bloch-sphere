/** The color theme the visitor picked; "system" follows the operating system. */
export type ThemeChoice = "system" | "light" | "dark";

// localStorage, so the choice holds in every tab and on the About and Privacy pages.
// public/theme-init.js reads the same key before the first paint.
const KEY = "bloch-sphere:theme";

export function loadTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function saveTheme(choice: ThemeChoice): void {
  try {
    if (choice === "system") {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, choice);
    }
  } catch {
    // Storage full or blocked: the choice lasts until the tab closes.
  }
}

/** Calls back when another tab changes the theme. */
export function onThemeChangedElsewhere(callback: (choice: ThemeChoice) => void): void {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      callback(loadTheme());
    }
  });
}
