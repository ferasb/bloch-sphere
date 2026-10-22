import { useRef, type FocusEvent, type MouseEvent, type PointerEvent } from "react";

/** How long a finger holds a button before it previews. */
const HOLD_MS = 350;

/**
 * Handlers for a button that previews what it would do before doing it (design.md §6.3): a mouse
 * previews while pointing at it, a keyboard while it has focus, and a click acts and drops the
 * preview, so it never shows where a second click would go. A finger can't point, so on a touch
 * screen pressing and holding previews, and letting go after a hold doesn't act; a tap does (§5.1).
 */
export function usePreviewPress(show: () => void, hide: () => void, act: () => void) {
  const timer = useRef(0);
  const pressing = useRef(false);
  // Set when a hold previewed, so the click that may follow the hold doesn't act.
  const held = useRef(false);
  const isFinger = (e: PointerEvent) => e.pointerType !== "mouse";
  const release = () => {
    clearTimeout(timer.current);
    pressing.current = false;
    if (held.current) {
      hide();
    }
  };
  return {
    onPointerEnter: (e: PointerEvent) => !isFinger(e) && show(),
    onPointerLeave: (e: PointerEvent) => !isFinger(e) && hide(),
    onPointerDown: (e: PointerEvent) => {
      if (isFinger(e)) {
        pressing.current = true;
        held.current = false;
        timer.current = window.setTimeout(() => {
          held.current = true;
          show();
        }, HOLD_MS);
      }
    },
    onPointerUp: release,
    onPointerCancel: release,
    // A long press opens a menu on Android; while a finger is down, the hold is ours.
    onContextMenu: (e: MouseEvent) => pressing.current && e.preventDefault(),
    // Focus from the keyboard previews; focus from a click or a tap doesn't, since it's about to act.
    onFocus: (e: FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && show(),
    onBlur: hide,
    onClick: () => {
      if (held.current) {
        held.current = false;
        return;
      }
      hide();
      act();
    },
  };
}
