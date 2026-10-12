import { useEffect, useState, type FormEvent } from "react";
import { columnCount, emptyCircuit } from "../../model/circuit";
import { journeyFromCircuit } from "../gates";
import { goToRoom } from "../rooms";
import { useApp } from "../store";
import { Popover } from "../widgets/Popover";
import { useCircuitLibrary } from "./circuitLibrary";
import { canRunOnSphere, useCircuit } from "./circuitStore";

const SHOTS = 1000;
const MAX_NAME = 40;

/** Step and play the circuit (design-gates.md §4.4). */
function Playback() {
  const playhead = useCircuit((s) => s.playhead);
  const playing = useCircuit((s) => s.target !== s.playhead);
  const n = useCircuit((s) => s.run.snapshots.length - 1);
  const { toStart, stepBack, play, pause, stepForward, toEnd } = useCircuit.getState();
  const column = Math.ceil(playhead);
  return (
    <div className="playback" role="group" aria-label="Playback">
      <button type="button" className="button-small" onClick={toStart} disabled={playhead === 0} title="To the start (Home)" aria-label="To the start">
        ⏮
      </button>
      <button type="button" className="button-small" onClick={stepBack} disabled={playhead === 0} title="Back one column (←)" aria-label="Back one column">
        ◀
      </button>
      <button type="button" className="button-small play-button" onClick={playing ? pause : play} disabled={n === 0} title={playing ? "Pause (Space)" : "Play to the end (Space)"} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "⏸" : "⏵"}
      </button>
      <button type="button" className="button-small" onClick={stepForward} disabled={playhead >= n} title="Forward one column (→)" aria-label="Forward one column">
        ▶
      </button>
      <button type="button" className="button-small" onClick={toEnd} disabled={playhead >= n} title="To the end (End)" aria-label="To the end">
        ⏭
      </button>
      <span className="playback-position" aria-live="polite">
        {column === 0 ? "start" : `column ${column} of ${n}`}
      </span>
    </div>
  );
}

/** The list behind Open ▾: saved circuits, plus a fresh one. */
function OpenList({ close }: { close: () => void }) {
  const circuits = useCircuitLibrary((s) => s.circuits);
  const deleted = useCircuitLibrary((s) => s.deleted);
  const { duplicate, remove, restore } = useCircuitLibrary.getState();
  const { open } = useCircuit.getState();
  return (
    <>
      <button
        type="button"
        className="button-small new-circuit"
        title="An empty circuit with two qubits (Ctrl+Z brings this one back)"
        onClick={() => {
          open(emptyCircuit(), "My circuit", null);
          close();
        }}
      >
        + New circuit
      </button>
      {deleted && (
        <p className="gate-list-notice" role="status">
          Deleted {deleted.circuit.name}.
          <button type="button" className="button-small button-accent" onClick={restore}>
            Restore
          </button>
        </p>
      )}
      {circuits.length === 0 ? (
        <p className="placeholder">No saved circuits yet. Name this one and press Save.</p>
      ) : (
        <ul className="gate-list">
          {circuits.map((c) => (
            <li key={c.id} className="gate-row circuit-row">
              <span className="gate-row-info">
                <span className="gate-row-name">{c.name}</span>
                <span className="gate-row-formula">
                  {c.circuit.wires.length} qubits · {c.circuit.ops.length} gates · {columnCount(c.circuit)} columns
                </span>
              </span>
              <span className="gate-row-actions">
                <button
                  type="button"
                  className="button-small button-accent"
                  title="Open it here; Save then updates it (Ctrl+Z brings back what was here)"
                  onClick={() => {
                    open(c.circuit, c.name, c.id);
                    close();
                  }}
                >
                  Open
                </button>
                <button type="button" className="button-small" title="Make a copy" onClick={() => duplicate(c.id)}>
                  Copy
                </button>
                <button type="button" className="button-small button-quiet" aria-label={`Delete ${c.name}`} title={`Delete ${c.name}`} onClick={() => remove(c.id)}>
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Along the bottom: playback, shots, then name, save, open and Run on sphere. */
export function CircuitBar() {
  const circuit = useCircuit((s) => s.circuit);
  const name = useCircuit((s) => s.name);
  const editing = useCircuit((s) => s.editing);
  const editingCircuit = useCircuitLibrary((s) => s.circuits.find((c) => c.id === editing));
  const measured = circuit.ops.some((op) => op.kind === "measure");
  const { runShots, rerun, setName, setEditing } = useCircuit.getState();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const valid = name.trim().length > 0 && circuit.ops.length > 0;
  const runnable = canRunOnSphere(circuit);

  function save(asNew: boolean) {
    try {
      const stored = useCircuitLibrary.getState().save({ id: asNew ? undefined : editingCircuit?.id, name: name.trim(), circuit });
      setEditing(stored.id);
      setMessage(`Saved “${stored.name}”`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  function runOnSphere() {
    useApp.getState().loadJourney(journeyFromCircuit(circuit), `Replaced your journey with “${name.trim() || "the circuit"}”.`);
    goToRoom("sphere");
  }

  return (
    <form
      className="save-bar circuit-bar"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (valid) save(false);
      }}
    >
      <Playback />
      <span className="toolbar-divider" aria-hidden />
      <button type="button" className="button-small" disabled={circuit.ops.length === 0} onClick={() => runShots(SHOTS)} title={`Run the circuit ${SHOTS} times and count the results${measured ? "" : " (with no Measure, every qubit is measured at the end)"}`}>
        Run {SHOTS} shots
      </button>
      {measured && (
        <button type="button" className="button-small" onClick={rerun} title="Run once more: measurements may come out differently">
          Run again
        </button>
      )}
      <span className="spacer" />
      <label className="field">
        Name
        <input value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} spellCheck={false} />
      </label>
      <button type="submit" disabled={!valid} title={circuit.ops.length === 0 ? "Place a gate first" : undefined}>
        {editingCircuit ? "Save changes" : "Save"}
      </button>
      {editingCircuit && (
        <button type="button" disabled={!valid} onClick={() => save(true)}>
          Save as new
        </button>
      )}
      <OpenButton />
      {message && (
        <span className="message message-success" role="status">
          ✓ {message}
        </span>
      )}
      <button
        type="button"
        className="button-accent"
        disabled={!runnable}
        onClick={runOnSphere}
        title={runnable ? "Play this circuit in the Sphere room, one step per gate" : circuit.ops.length === 0 ? "Place a gate first" : "The Sphere room can't show two-qubit gates or measurements yet"}
      >
        Run on sphere ▸
      </button>
    </form>
  );
}

function OpenButton() {
  const count = useCircuitLibrary((s) => s.circuits.length);
  return (
    <Popover id="my-circuits" button={`Open (${count}) ▾`} label="My circuits" heading="My circuits" placement="above" align="end">
      {(close) => <OpenList close={close} />}
    </Popover>
  );
}
