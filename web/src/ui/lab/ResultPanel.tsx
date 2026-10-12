import { useMemo } from "react";
import { formulaTex } from "../../format/bench";
import { findEquivalent } from "../../format/equivalence";
import { gateName } from "../../format/gateNames";
import { complexTexSigned } from "../../format/exact";
import { stateText } from "../../format/ket";
import { rotationText } from "../../format/rotation";
import { NAMED_STATES } from "../../math/qubit";
import { savedGateMatrix } from "../../model/library";
import { useLibrary } from "../libraryStore";
import { GateMatrix } from "../widgets/GateMatrix";
import { Tex } from "../widgets/Tex";
import { benchGates, useLab } from "./labStore";

/** The lab's sidebar: the bench's gate as a product, a matrix, one rotation, and what it does. */
export function ResultPanel() {
  const tiles = useLab((s) => s.tiles);
  const compare = useLab((s) => s.compareReversed);
  const saved = useLibrary((s) => s.gates);
  const { gate, reversedGate } = useMemo(() => benchGates(tiles), [tiles]);
  const equivalent = useMemo(() => findEquivalent(gate, saved.map((g) => ({ name: g.name, gate: savedGateMatrix(g) }))), [gate, saved]);
  const rotation = rotationText(gate);
  const phase = equivalent && Math.abs(equivalent.phase.re - 1) > 1e-9 ? complexTexSigned(equivalent.phase) : null;

  return (
    <>
      <section className="panel-section" aria-labelledby="result-heading">
        <h2 id="result-heading">Result</h2>
        <div className="ket">
          <Tex tex={`U = ${formulaTex(tiles)}`} display />
        </div>
        {tiles.length > 1 && <p className="hint">Tiles run left to right in time, so the product reads right to left.</p>}
        <GateMatrix gate={gate} />
        <p className="rotation">
          {rotation === "no rotation" ? (
            "It doesn't turn the sphere at all."
          ) : (
            <>
              One rotation: <strong>{rotation}</strong>.
            </>
          )}
        </p>
        {tiles.length > 1 && rotation !== "no rotation" && <p className="hint">On the sphere: solid, each tile in turn; dashed, this one rotation.</p>}
        {equivalent && (
          <p className="equivalence">
            <span className="badge">≡ {equivalent.name}</span>
            {gateName(equivalent.name) && <span>{gateName(equivalent.name)}</span>}
            {equivalent.name === "I" && <span className="hint">: it does nothing</span>}
            {phase && (
              <span className="hint">
                {" "}
                up to a global phase of <Tex tex={phase} />
              </span>
            )}
          </p>
        )}
        {compare && tiles.length > 1 && (
          <p className="note">
            {reversedGate.equalsUpToPhase(gate)
              ? "In reverse order it's the same gate: these tiles commute."
              : "In reverse order it's a different gate: here, order matters."}
          </p>
        )}
      </section>
      <section className="panel-section" aria-labelledby="action-heading">
        <h2 id="action-heading">What it does</h2>
        <dl className="action-table">
          {NAMED_STATES.map(({ label, state }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>→ {stateText(gate.apply(state))}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
