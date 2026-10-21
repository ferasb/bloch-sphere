import { create } from "zustand";
import { loadTheme, onThemeChangedElsewhere, saveTheme, type ThemeChoice } from "../persist/theme";

/** The colors in use: the visitor's choice, or the system's when they chose "system". */
export type Scheme = "light" | "dark";

interface ThemeState {
  choice: ThemeChoice;
  scheme: Scheme;
  choose(choice: ThemeChoice): void;
}

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function schemeFor(choice: ThemeChoice): Scheme {
  return choice === "system" ? (systemDark.matches ? "dark" : "light") : choice;
}

/** theme.css reads data-theme on <html>; without it, the system's scheme applies. */
function apply(choice: ThemeChoice): void {
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = choice;
  }
}

const initial = loadTheme();
apply(initial);

/** The color theme (design.md §8). Set data-theme before the state, so readers of the new state see the new colors. */
export const useTheme = create<ThemeState>((set) => ({
  choice: initial,
  scheme: schemeFor(initial),
  choose(choice) {
    saveTheme(choice);
    apply(choice);
    set({ choice, scheme: schemeFor(choice) });
  },
}));

systemDark.addEventListener("change", () => useTheme.setState((s) => ({ scheme: schemeFor(s.choice) })));
onThemeChangedElsewhere((choice) => {
  apply(choice);
  useTheme.setState({ choice, scheme: schemeFor(choice) });
});
