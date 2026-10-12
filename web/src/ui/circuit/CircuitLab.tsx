import { CircuitBar } from "./CircuitBar";
import { CircuitCanvas } from "./CircuitCanvas";
import { CircuitPalette } from "./CircuitPalette";
import { CircuitPanel } from "./CircuitPanel";
import { useCircuit } from "./circuitStore";
import { useCircuitShortcuts } from "./useCircuitShortcuts";
import { MAX_WIRES } from "../../model/circuit";

/**
 * The Circuit Lab (design-gates.md §4.2): the palette above, the circuit in the middle, one sidebar
 * with the sphere and what it shows, and playback and saving along the bottom.
 */
export function CircuitLab() {
  useCircuitShortcuts();
  const wires = useCircuit((s) => s.circuit.wires.length);
  const message = useCircuit((s) => s.message);
  const { addWire, setMessage } = useCircuit.getState();
  return (
    <>
      <main className="scene circuit-room" aria-label="Circuit Lab">
        <CircuitPalette />
        <div className="circuit-area">
          <CircuitCanvas />
          <button type="button" className="button-small add-wire" onClick={addWire} disabled={wires >= MAX_WIRES} title={wires >= MAX_WIRES ? `Up to ${MAX_WIRES} qubits` : "Add a qubit (a new wire)"}>
            + qubit
          </button>
        </div>
        {message && (
          <div className="notice circuit-notice" role="status">
            {message}
            <button type="button" className="button-small" onClick={() => setMessage(null)}>
              OK
            </button>
          </div>
        )}
      </main>
      <CircuitPanel />
      <CircuitBar />
    </>
  );
}
