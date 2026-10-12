import { NAMED_STATES } from "../../math/qubit";
import { useLab } from "./labStore";

/** Down the left of the test sphere: which state to test on, and Play. */
export function TestControls() {
  const testState = useLab((s) => s.testState);
  const count = useLab((s) => s.tiles.length);
  const { setTestState, replay } = useLab.getState();
  return (
    <div className="test-controls" role="group" aria-label="Test on">
      <span className="op-label">Test on</span>
      {NAMED_STATES.map(({ label }) => (
        <button key={label} type="button" className="button-small ket-button" aria-pressed={label === testState} onClick={() => setTestState(label)}>
          {label}
        </button>
      ))}
      <button type="button" className="button-small button-accent" disabled={count === 0} onClick={replay}>
        ▶ Play
      </button>
    </div>
  );
}
