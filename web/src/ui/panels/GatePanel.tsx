import { gateLearnPath, gateName } from "../../format/gateNames";
import { onAxisNote, rotationText } from "../../format/rotation";
import { tileFromSpec } from "../../model/bench";
import { resolveGate } from "../../model/sphere";
import { useLab } from "../lab/labStore";
import { TOUCH, useMedia } from "../media";
import { goToRoom } from "../rooms";
import { useApp } from "../store";
import { frameOf } from "../view";
import { GateMatrix } from "../widgets/GateMatrix";
import { Term } from "../widgets/Term";

/** The gate under the pointer, or else the gate of the step on screen: matrix and rotation. */
export function GatePanel() {
  const preview = useApp((s) => s.preview);
  const stepIndex = useApp((s) => frameOf(s).step);
  const sphere = useApp((s) => s.sphere);
  const selected = useApp((s) => s.selected);
  const touch = useMedia(TOUCH);

  const step = sphere.steps[stepIndex];
  const previewing = preview?.kind === "gate";
  const spec = previewing ? preview.gate : step.action?.kind === "gate" ? step.action.gate : null;

  if (!spec) {
    return (
      <section className="panel-section" aria-labelledby="gate-heading">
        <h2 id="gate-heading">
          <Term id="matrix">Gate</Term>
        </h2>
        <p className="placeholder">
          {touch
            ? "Tap a gate to see its matrix and the rotation it performs. To preview a gate before applying it, touch and hold it."
            : "Point at a gate to see its matrix and the rotation it performs."}
        </p>
      </section>
    );
  }

  const gate = resolveGate(spec);
  const { axis, angle } = gate.axisAngle();
  // Where the selected qubit starts: now (for a preview) or before the step (for an applied gate).
  const qubit = previewing ? sphere.qubit(selected) : sphere.steps[stepIndex - 1]?.qubits.find((q) => q.id === selected);
  const targeted = previewing || (step.action?.kind === "gate" && step.action.targets.includes(selected));
  const note = qubit && targeted ? onAxisNote(qubit.name, qubit.state.blochVector(), axis, angle) : null;
  const learn = gateLearnPath(gate.name ?? "");

  return (
    <section className="panel-section" aria-labelledby="gate-heading">
      <div className="section-head">
        <h2 id="gate-heading">
          <Term id="matrix">Gate</Term> <span className="gate-name">{gate.name}</span>
          {gateName(gate.name ?? "") && <span className="heading-detail">{gateName(gate.name ?? "")}</span>}
          {previewing && <span className="badge">preview</span>}
        </h2>
        <button
          type="button"
          className="link-button wide-only"
          onClick={() => {
            useLab.getState().open([tileFromSpec(spec)]);
            goToRoom("lab");
          }}
        >
          Open in Gate Lab ▸
        </button>
      </div>
      <GateMatrix gate={gate} />
      <p className="matrix-caption">Column j is where |j⟩ goes.</p>
      <p className="rotation" aria-live="polite">
        <Term id="rotation">Rotates the sphere</Term> <strong>{rotationText(gate)}</strong>.
      </p>
      {note && <p className="note">{note}</p>}
      {learn && (
        <p className="learn-link">
          <a href={learn}>About the {gateName(gate.name ?? "")?.replace(/ gate$/, "")} gate ›</a>
        </p>
      )}
    </section>
  );
}
