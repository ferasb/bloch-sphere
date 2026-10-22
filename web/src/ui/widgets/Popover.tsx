import { useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  /** Unique in the page: ties the button to its popover. */
  id: string;
  /** What the opening button shows. */
  button: ReactNode;
  buttonClassName?: string;
  buttonTitle?: string;
  /** Accessible name of the popover. */
  label: string;
  /** Heading inside the popover. */
  heading?: ReactNode;
  /** Open below the button (default) or above it. */
  placement?: "below" | "above";
  /** Line up with the button's left edge (default) or right edge. */
  align?: "start" | "end";
  onClose?: () => void;
  /** Rendered only while open; `close` closes it. */
  children: (close: () => void) => ReactNode;
}

/** The room kept between a popover and the window's edge. */
const EDGE = 8;

/**
 * Put a popover (position: fixed) next to its button: below or above it, lined up with its left or
 * right edge, but never across the window's edge. It scrolls when it's taller than the room left.
 */
export function placeNextTo(button: HTMLElement, popover: HTMLElement, placement: "below" | "above", align: "start" | "end"): void {
  const r = button.getBoundingClientRect();
  const style = popover.style;
  // Still hidden, so it has no size yet: take its width from the CSS, capped as styles.css caps it.
  const width = Math.min(parseFloat(getComputedStyle(popover).width) || 0, window.innerWidth - 2 * EDGE);
  const left = align === "start" ? r.left : r.right - width;
  style.left = `${Math.max(EDGE, Math.min(left, window.innerWidth - EDGE - width))}px`;
  style.right = "auto";
  style.top = placement === "below" ? `${r.bottom + 8}px` : "auto";
  style.bottom = placement === "above" ? `${window.innerHeight - r.top + 8}px` : "auto";
  style.maxHeight = `${(placement === "below" ? window.innerHeight - r.bottom : r.top) - 8 - EDGE}px`;
}

/**
 * A button that opens a popover. Uses the browser's popover, which closes on Escape and on a click
 * outside, and positions it next to its button.
 */
export function Popover({ id, button, buttonClassName, buttonTitle, label, heading, placement = "below", align = "start", onClose, children }: PopoverProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button ref={buttonRef} type="button" className={buttonClassName} title={buttonTitle} popoverTarget={id} aria-expanded={open}>
        {button}
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        className="popover"
        onBeforeToggle={(e) => {
          if ((e.nativeEvent as ToggleEvent).newState === "open") {
            placeNextTo(buttonRef.current!, popover.current!, placement, align);
          }
        }}
        onToggle={(e) => {
          const isOpen = (e.nativeEvent as ToggleEvent).newState === "open";
          setOpen(isOpen);
          if (!isOpen) {
            onClose?.();
          }
        }}
      >
        {heading && <h2>{heading}</h2>}
        {open && children(() => popover.current?.hidePopover())}
      </div>
    </>
  );
}
