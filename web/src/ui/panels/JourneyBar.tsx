import { useEffect, useRef } from "react";
import { gateLabel } from "../../format/gateLabel";
import { gateName } from "../../format/gateNames";
import { stateText } from "../../format/ket";
import type { Step } from "../../model/sphere";
import { useApp } from "../store";

/** A step as a short label plus the qubits it touched. */
function describe(step: Step, before: Step): { label: string; qubits: { name: string; colorSlot: number }[] } {
  const touched = [...step.motions.keys()].map((id) => step.qubits.find((q) => q.id === id) ?? before.qubits.find((q) => q.id === id)!);
  const action = step.action!;
  switch (action.kind) {
    case "gate":
      return { label: gateLabel(action.gate), qubits: touched };
    case "addQubit":
      return { label: "added", qubits: touched };
    case "removeQubit":
      return { label: "removed", qubits: touched };
  }
}

/** The journey: one chip per step. Clicking a chip replays to it; Undo and Reset edit it. */
export function JourneyBar() {
  const sphere = useApp((s) => s.sphere);
  const current = useApp((s) => Math.ceil(s.playhead));
  const live = useApp((s) => s.live);
  const { goToStep, backToLive, setHoverStep, undo, reset } = useApp.getState();
  const strip = useRef<HTMLOListElement>(null);

  // Keep the newest step in view.
  useEffect(() => {
    strip.current?.scrollTo({ left: strip.current.scrollWidth });
  }, [sphere.lastIndex]);

  return (
    <nav className="journey" aria-label="Journey">
      <h2>Journey</h2>
      <ol className="chips" ref={strip}>
        {sphere.steps.map((step, i) => {
          const info = i === 0 ? { label: "Start", qubits: [] } : describe(step, sphere.steps[i - 1]);
          const state = i === current ? "current" : i > current ? "ahead" : "";
          return (
            <li key={i}>
              {i > 0 && <span className="chip-arrow" aria-hidden>→</span>}
              <button
                type="button"
                className={`chip ${state}`}
                aria-current={i === current ? "step" : undefined}
                onClick={() => goToStep(i)}
                onPointerEnter={() => setHoverStep(i)}
                onPointerLeave={() => setHoverStep(null)}
                title={i === 0 ? `The start: ${step.qubits.map((q) => `${q.name} at ${stateText(q.state)}`).join(", ")}. Set state changes it.` : `Step ${i}: ${gateName(info.label) ?? info.label}${info.qubits.length ? ` on ${info.qubits.map((q) => q.name).join(", ")}` : ""}. Click to replay to here.`}
              >
                {info.qubits.map((q) => (
                  <span key={q.name} className="qubit-dot" style={{ background: `var(--qubit-${q.colorSlot})` }} aria-hidden />
                ))}
                <span className="chip-label">{info.label}</span>
                {info.qubits.length > 0 && <span className="visually-hidden"> on {info.qubits.map((q) => q.name).join(", ")}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="journey-actions">
        {!live && (
          <button type="button" className="button-small button-accent" onClick={backToLive}>
            Back to now
          </button>
        )}
        <button type="button" className="button-small" onClick={undo} disabled={!sphere.canUndo} title="Undo the last step (Ctrl+Z)">
          Undo
        </button>
        <button type="button" className="button-small" onClick={reset} title="All qubits back to |0⟩, journey cleared">
          Reset
        </button>
      </div>
    </nav>
  );
}
