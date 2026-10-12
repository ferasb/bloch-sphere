import { stateText } from "../../format/ket";
import { MAX_QUBITS } from "../../model/sphere";
import { useApp } from "../store";
import { QubitTag } from "../widgets/QubitTag";
import { SetStateButton } from "./SetState";

/**
 * Along the top of the sphere, everything about the qubits themselves: one chip per qubit (select,
 * remove), add one, set a state, and whether actions apply to all of them.
 */
export function QubitStrip() {
  const sphere = useApp((s) => s.sphere);
  const selected = useApp((s) => s.selected);
  const applyToAll = useApp((s) => s.applyToAll);
  const { select, addQubit, removeQubit, setApplyToAll } = useApp.getState();

  return (
    <div className="qubit-strip" role="group" aria-label="Qubits">
      {sphere.qubits.map((q) => (
        <div key={q.id} className={q.id === selected ? "qubit-chip selected" : "qubit-chip"}>
          <button type="button" className="qubit-chip-select" aria-pressed={q.id === selected} onClick={() => select(q.id)} title={`Select ${q.name} (key ${q.colorSlot})`}>
            <QubitTag name={q.name} colorSlot={q.colorSlot} />
            <span className="qubit-summary">{stateText(q.state)}</span>
          </button>
          {sphere.canRemoveQubit && (
            <button type="button" className="qubit-chip-remove" onClick={() => removeQubit(q.id)} aria-label={`Remove ${q.name}`} title={`Remove ${q.name}`}>
              ×
            </button>
          )}
        </div>
      ))}
      {sphere.canAddQubit && (
        <button type="button" className="button-small" onClick={addQubit} title={`Add a qubit (up to ${MAX_QUBITS})`}>
          + Qubit
        </button>
      )}
      <SetStateButton />
      {sphere.qubits.length > 1 && (
        <label className="toggle" title="Key A">
          <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
          Apply to all qubits
        </label>
      )}
    </div>
  );
}
