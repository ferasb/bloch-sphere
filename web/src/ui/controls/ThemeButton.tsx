import type { ReactNode } from "react";
import type { Theme } from "../../persist/theme";
import { useTheme } from "../theme";

// Drawn on a 24-unit grid; stroked in the button's text color by .theme-button svg.
const ICONS: Record<Theme, ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
};

/** Light or dark (design.md §8). Shows the theme it switches to: the moon in light, the sun in dark. */
export function ThemeButton() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = `Switch to the ${next} theme`;
  return (
    <button type="button" className="theme-button" aria-label={label} title={label} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden>
        {ICONS[next]}
      </svg>
    </button>
  );
}
