import type { ReactNode } from "react";
import type { ThemeChoice } from "../../persist/theme";
import { useTheme } from "../theme";

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: "light", light: "dark", dark: "system" };
const NAMES: Record<ThemeChoice, string> = { system: "match the system", light: "light", dark: "dark" };

// Drawn on a 24-unit grid; stroked in the button's text color by .theme-button svg.
const ICONS: Record<ThemeChoice, ReactNode> = {
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
};

/**
 * The color theme (design.md §8): shows the current choice and steps through match the system,
 * light and dark. One button, so it fits beside the room switcher and the links.
 */
export function ThemeButton() {
  const choice = useTheme((s) => s.choice);
  const choose = useTheme((s) => s.choose);
  const label = `Theme: ${NAMES[choice]}. Click for ${NAMES[NEXT[choice]]}.`;
  return (
    <button type="button" className="theme-button" aria-label={label} title={label} onClick={() => choose(NEXT[choice])}>
      <svg viewBox="0 0 24 24" aria-hidden>
        {ICONS[choice]}
      </svg>
    </button>
  );
}
