import { useSyncExternalStore } from "react";

/** One scrolling column: phones, tablets held upright, small windows (design.md §5.1). styles.css repeats it. */
export const NARROW = "(max-width: 959px), (max-height: 500px)";

/** A touch screen: nothing can point at things without pressing them. */
export const TOUCH = "(hover: none)";

/** Whether a media query matches, kept up to date as the window changes (turning a tablet, say). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
