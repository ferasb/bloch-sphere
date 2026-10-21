import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, type GlossaryId } from "../../format/glossary";
import { placeNextTo } from "./Popover";

/**
 * A label that explains itself: click it for a one-line definition and a link to the Learn page that
 * says more. The words are in format/glossary.ts, shared with the Learn pages.
 *
 * Labels sit inside headings and paragraphs, which can't hold the popover's own paragraphs, so the
 * popover is rendered at the end of the page (it shows in the top layer either way).
 */
export function Term({ id, children, align = "start" }: { id: GlossaryId; children: ReactNode; align?: "start" | "end" }) {
  const entry = GLOSSARY[id];
  const popoverId = `term-${useId()}`;
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={button} type="button" className="term" title={`What is this? ${entry.term}`} popoverTarget={popoverId} aria-expanded={open}>
        {children}
      </button>
      {createPortal(
        <div
          ref={popover}
          id={popoverId}
          popover="auto"
          role="dialog"
          aria-label={entry.term}
          className="popover term-popover"
          onBeforeToggle={(e) => {
            if ((e.nativeEvent as ToggleEvent).newState === "open") {
              // Below the label, unless it's low in the window: then above, so it isn't cut off.
              const low = button.current!.getBoundingClientRect().top > window.innerHeight / 2;
              placeNextTo(button.current!, popover.current!, low ? "above" : "below", align);
            }
          }}
          onToggle={(e) => setOpen((e.nativeEvent as ToggleEvent).newState === "open")}
        >
          <h2>{entry.term}</h2>
          <p>{entry.definition}</p>
          <a href={entry.learn}>Learn more ›</a>
        </div>,
        document.body,
      )}
    </>
  );
}
