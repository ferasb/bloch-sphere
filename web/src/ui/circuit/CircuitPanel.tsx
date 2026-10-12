import { useMemo, type ReactNode } from "react";
import { percentText } from "../../format/angles";
import { tileText } from "../../format/bench";
import { basisLabel, effectText } from "../../format/circuit";
import { gateName } from "../../format/gateNames";
import { rotationText } from "../../format/rotation";
import { length } from "../../math/vec3";
import { tile, tileGate } from "../../model/bench";
import { columns, isTwoQubit, opWires, registerAt, twoQubitEffect, type Op, type Run } from "../../model/circuit";
import { useLab } from "../lab/labStore";
import { goToRoom } from "../rooms";
import { Scene } from "../scene/Scene";
import { sourceFrom } from "../scene/source";
import { AmplitudeCircle } from "../widgets/AmplitudeCircle";
import { GateMatrix } from "../widgets/GateMatrix";
import { QubitTag } from "../widgets/QubitTag";
import { circuitProjector } from "./circuitTimeline";
import { useCircuit } from "./circuitStore";

/** The Circuit Lab's sphere draws the run at the playhead. */
const circuitSource = sourceFrom(useCircuit, circuitProjector());

/** Show every basis state up to this many wires; beyond, only the ones with any amplitude. */
const ALL_BASIS_UP_TO = 3;

function wireName(run: Run, id: string): string {
  return run.circuit.wires.find((w) => w.id === id)?.name ?? "";
}

function wireIndex(run: Run, id: string): number {
  return run.circuit.wires.findIndex((w) => w.id === id);
}

/** One line on what an operation does in this run, computed from the state at its column. */
export function opCaption(run: Run, op: Op): string {
  switch (op.kind) {
    case "gate": {
      const label = tileText(op.tile);
      const name = gateName(label);
      return `${name ? `${name} (${label})` : label} on ${wireName(run, op.wire)}: ${rotationText(tileGate(op.tile))}.`;
    }
    case "measure": {
      const before = run.snapshots[op.col];
      const i = wireIndex(run, op.wire);
      const p1 = before.probabilityOfOne(i);
      const outcome = run.outcomes.get(op.id) ?? 0;
      const odds = p1 > 1 - 1e-9 || p1 < 1e-9 ? "it was certain" : `a ${percentText(outcome ? p1 : 1 - p1)} chance`;
      const partner = length(before.bloch(i)) < 0.999 ? " Its entangled partner snaps at the same moment." : "";
      return `${wireName(run, op.wire)} is measured: ${outcome} this run (${odds}).${partner}`;
    }
    default: {
      const [first, second] = opWires(op);
      return effectText(twoQubitEffect(run, op), op.kind, wireName(run, first), wireName(run, second));
    }
  }
}

/**
 * The sidebar (design-gates.md §4.2): the sphere at the playhead, what the column there does, the
 * joint state, the selected gate, and the shots histogram.
 */
export function CircuitPanel() {
  return (
    <aside className="panel circuit-panel" aria-label="At the playhead">
      <div className="circuit-sphere">
        <Scene source={circuitSource} stepAxis="while-playing" />
      </div>
      <div className="circuit-details">
        <ColumnSection />
        <JointState />
        <SelectedOp />
        <Shots />
      </div>
    </aside>
  );
}

function ColumnSection() {
  const run = useCircuit((s) => s.run);
  const step = useCircuit((s) => Math.ceil(s.playhead));
  const cols = useMemo(() => columns(run.circuit), [run]);
  const column = step > 0 ? cols[step - 1] : null;
  return (
    <section className="panel-section" aria-labelledby="column-heading">
      <h2 id="column-heading">
        {step === 0 ? "The start" : "Column"}
        {step > 0 && (
          <span className="heading-detail">
            {step} of {cols.length}
          </span>
        )}
      </h2>
      {column ? (
        <ul className="captions" aria-live="polite">
          {column.map((op) => (
            <li key={op.id} className={isTwoQubit(op) ? "caption-two" : undefined}>
              {opCaption(run, op)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="placeholder">{cols.length ? "Every qubit at its starting state. Press ⏵ or step with ▶ to run the circuit." : "Place gates on the wires to build a circuit."}</p>
      )}
    </section>
  );
}

/** Every qubit together: one circle per basis state, in circle notation. */
function JointState() {
  const run = useCircuit((s) => s.run);
  const playhead = useCircuit((s) => s.playhead);
  const register = useMemo(() => registerAt(run, playhead), [run, playhead]);
  const n = register.n;
  const all = n <= ALL_BASIS_UP_TO;
  const shown = register.amplitudes.map((a, i) => ({ a, i })).filter(({ a }) => all || a.abs() > 1e-6);
  return (
    <section className="panel-section" aria-labelledby="joint-heading">
      <h2 id="joint-heading">
        Joint state
        <span className="heading-detail">{run.circuit.wires.map((w) => w.name).join(" ")}</span>
      </h2>
      <ul className="joint-state">
        {shown.map(({ a, i }) => (
          <li key={i} title={`${basisLabel(i, n)}: ${percentText(a.abs() ** 2)}`}>
            <AmplitudeCircle amplitude={a} size={34} fill="var(--primary)" label={`${basisLabel(i, n)} ${percentText(a.abs() ** 2)}`} />
            <span className="joint-label">{basisLabel(i, n)}</span>
            <span className="joint-value">{percentText(a.abs() ** 2)}</span>
          </li>
        ))}
      </ul>
      {!all && <p className="matrix-caption">The {2 ** n - shown.length} of {2 ** n} basis states with nothing in them are hidden.</p>}
    </section>
  );
}

function SelectedOp() {
  const run = useCircuit((s) => s.run);
  const id = useCircuit((s) => s.selectedOp);
  const op = run.circuit.ops.find((o) => o.id === id);
  if (!op) {
    return null;
  }
  const { removeOp, reconnect, setTile } = useCircuit.getState();
  const wire = (wid: string) => {
    const w = run.circuit.wires.find((x) => x.id === wid)!;
    return <QubitTag name={w.name} colorSlot={w.colorSlot} />;
  };
  const remove = (
    <button type="button" className="button-small" onClick={() => removeOp(op.id)} title="Remove it (Delete)">
      Remove
    </button>
  );

  if (op.kind === "gate") {
    const label = tileText(op.tile);
    const gate = tileGate(op.tile);
    const rotation = op.tile.gate.kind === "rotation" && op.tile.power === 1 ? op.tile.gate : null;
    return (
      <OpSection
        heading={
          <>
            Gate <span className="gate-name">{label}</span>
            {gateName(label) && <span className="heading-detail">{gateName(label)}</span>}
          </>
        }
        link={
          <button
            type="button"
            className="link-button"
            onClick={() => {
              useLab.getState().open([{ ...op.tile }]);
              goToRoom("lab");
            }}
          >
            Open in Gate Lab ▸
          </button>
        }
      >
        <GateMatrix gate={gate} />
        <p className="matrix-caption">Column j is where |j⟩ goes.</p>
        <p className="rotation">
          Rotates {wire(op.wire)} <strong>{rotationText(gate)}</strong>.
        </p>
        <div className="op-actions">
          {rotation && (
            <label className="field">
              Angle
              <input
                type="number"
                className="angle-input"
                value={+((rotation.angle * 180) / Math.PI).toFixed(1)}
                step={15}
                onChange={(e) => {
                  const degrees = Number(e.target.value);
                  if (Number.isFinite(degrees)) setTile(op.id, tile({ ...rotation, angle: (degrees * Math.PI) / 180 }));
                }}
              />
              °
            </label>
          )}
          <span className="spacer" />
          {remove}
        </div>
      </OpSection>
    );
  }

  if (op.kind === "measure") {
    return (
      <OpSection heading={<>Measure {wire(op.wire)}</>}>
        <p>{opCaption(run, op)}</p>
        <p className="matrix-caption">Measuring turns the qubit into a plain 0 or 1, with the odds its state gave it. Run again to see another outcome.</p>
        <div className="op-actions">
          <span className="spacer" />
          {remove}
        </div>
      </OpSection>
    );
  }

  const [first, second] = opWires(op);
  const name = { cnot: "CNOT", cz: "CZ", swap: "SWAP" }[op.kind];
  const what = {
    cnot: (
      <>
        Flips the target {wire(second)} when the control {wire(first)} is |1⟩.
      </>
    ),
    cz: (
      <>
        Applies Z to one qubit when the other is |1⟩: it treats {wire(first)} and {wire(second)} the same.
      </>
    ),
    swap: (
      <>
        Exchanges the states of {wire(first)} and {wire(second)}.
      </>
    ),
  }[op.kind];
  return (
    <OpSection
      heading={
        <>
          Gate <span className="gate-name">{name}</span>
          <span className="heading-detail">{gateName(name)}</span>
        </>
      }
    >
      <p>{what}</p>
      <p className="note">{opCaption(run, op)}</p>
      <div className="op-actions">
        {op.kind === "cnot" && (
          <button type="button" className="button-small" onClick={() => reconnect(op.id, "first", second)} title="Make the target the control and the control the target">
            Swap control and target
          </button>
        )}
        <span className="spacer" />
        {remove}
      </div>
    </OpSection>
  );
}

function OpSection({ heading, link, children }: { heading: ReactNode; link?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel-section" aria-labelledby="op-heading">
      <div className="section-head">
        <h2 id="op-heading">{heading}</h2>
        {link}
      </div>
      {children}
    </section>
  );
}

/** How often each bit string came up over many runs. */
function Shots() {
  const result = useCircuit((s) => s.shotResult);
  if (!result) {
    return null;
  }
  const most = result.counts[0]?.[1] ?? 1;
  return (
    <section className="panel-section" aria-labelledby="shots-heading">
      <h2 id="shots-heading">
        Shots
        <span className="heading-detail">
          {result.total} runs · bits {result.wires.join(" ")}
        </span>
      </h2>
      <ol className="histogram">
        {result.counts.map(([bits, count]) => (
          <li key={bits}>
            <span className="histogram-label">{bits}</span>
            <span className="histogram-track">
              <span className="histogram-fill" style={{ width: `${(count / most) * 100}%` }} />
            </span>
            <span className="histogram-value">
              {count} · {percentText(count / result.total)}
            </span>
          </li>
        ))}
      </ol>
      {result.counts.length === 1 && <p className="matrix-caption">The same result every time.</p>}
    </section>
  );
}
