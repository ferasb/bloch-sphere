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

/**
 * A button that opens a popover. Uses the browser's popover, which closes on Escape and on a click
 * outside, and positions it next to its button.
 */
export function Popover({ id, button, buttonClassName, buttonTitle, label, heading, placement = "below", align = "start", onClose, children }: PopoverProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  function place() {
    const r = buttonRef.current!.getBoundingClientRect();
    const style = popover.current!.style;
    style.top = placement === "below" ? `${r.bottom + 8}px` : "auto";
    style.bottom = placement === "above" ? `${window.innerHeight - r.top + 8}px` : "auto";
    style.left = align === "start" ? `${r.left}px` : "auto";
    style.right = align === "end" ? `${window.innerWidth - r.right}px` : "auto";
  }

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
            place();
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
