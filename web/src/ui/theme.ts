import { create } from "zustand";
import { loadTheme, onThemeChangedElsewhere, saveTheme, type Theme } from "../persist/theme";

interface ThemeState {
  /** The colors in use: the visitor's pick, or the system's until they pick one. */
  theme: Theme;
  /** Switch to the other theme, and remember it. */
  toggle(): void;
}

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
let picked = loadTheme();

function current(): Theme {
  return picked ?? (systemDark.matches ? "dark" : "light");
}

/** theme.css reads data-theme on <html>; without it, the system's theme applies. */
function apply(): void {
  if (picked) {
    document.documentElement.dataset.theme = picked;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

apply();

/** The color theme (design.md §8). data-theme changes before the state, so readers of the new state see the new colors. */
export const useTheme = create<ThemeState>((set) => ({
  theme: current(),
  toggle() {
    picked = current() === "dark" ? "light" : "dark";
    saveTheme(picked);
    apply();
    set({ theme: picked });
  },
}));

systemDark.addEventListener("change", () => useTheme.setState({ theme: current() }));
onThemeChangedElsewhere((theme) => {
  picked = theme;
  apply();
  useTheme.setState({ theme: current() });
});
