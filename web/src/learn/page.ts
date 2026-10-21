// The only script on the Learn pages: the theme button. public/theme-init.js has already applied a
// picked theme before the first paint, and CSS picks the button's icon, so this just handles clicks.
import { loadTheme, onThemeChangedElsewhere, saveTheme, type Theme } from "../persist/theme";

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
let picked = loadTheme();

function apply(): void {
  if (picked) {
    document.documentElement.dataset.theme = picked;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

document.querySelector(".theme-button")?.addEventListener("click", () => {
  const current: Theme = picked ?? (systemDark.matches ? "dark" : "light");
  picked = current === "dark" ? "light" : "dark";
  saveTheme(picked);
  apply();
});

onThemeChangedElsewhere((theme) => {
  picked = theme;
  apply();
});
