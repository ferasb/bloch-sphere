import { useState, type FormEvent } from "react";
import { parseComplex } from "../../format/parse";
import { NAMED_STATES, Qubit } from "../../math/qubit";
import { useApp } from "../store";
import { Popover } from "../widgets/Popover";

type Tab = "presets" | "angles" | "amplitudes";

const TABS: [Tab, string][] = [
  ["presets", "Presets"],
  ["angles", "Angles"],
  ["amplitudes", "Amplitudes"],
];

/**
 * "Set state" in the qubit strip: a popover with presets, θ/φ sliders and typed amplitudes.
 * Setting a state isn't a step: the journey starts over from it.
 */
export function SetStateButton() {
  const target = useApp((s) => (s.applyToAll ? "all qubits" : (s.sphere.qubit(s.selected)?.name ?? "")));
  const hasSteps = useApp((s) => s.sphere.canUndo);
  return (
    <Popover
      id="set-state"
      button="Set state ▾"
      buttonClassName="button-small"
      label={`Set the state of ${target}`}
      heading={
        <>
          Set state <span className="heading-detail">of {target}</span>
        </>
      }
      onClose={() => useApp.getState().setPreview(null)}
    >
      {(close) => (
        <>
          {hasSteps && <p className="hint set-state-hint">This starts a new journey from here: the steps so far are cleared.</p>}
          <SetStateTabs onDone={close} />
        </>
      )}
    </Popover>
  );
}

function SetStateTabs({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<Tab>("presets");
  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "presets" && <Presets onDone={onDone} />}
      {tab === "angles" && <AnglesFormKeyed onDone={onDone} />}
      {tab === "amplitudes" && <AmplitudesForm onDone={onDone} />}
    </>
  );
}

function Presets({ onDone }: { onDone: () => void }) {
  const { setStartState, setPreview } = useApp.getState();
  return (
    <div className="preset-grid">
      {NAMED_STATES.map(({ label, state }) => {
        const show = () => setPreview({ kind: "state", state });
        const hide = () => setPreview(null);
        return (
          <button
            key={label}
            type="button"
            className="ket-button"
            onClick={() => {
              hide();
              setStartState(state);
              onDone();
            }}
            onPointerEnter={show}
            onPointerLeave={hide}
            onFocus={show}
            onBlur={hide}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Remounts the form whenever the qubit's angles change, so the sliders start from where it is. */
function AnglesFormKeyed({ onDone }: { onDone: () => void }) {
  // A string, so the selector result is stable: "id|θ|φ" in whole degrees.
  const key = useApp((s) => {
    const [theta, phi] = (s.sphere.qubit(s.selected)?.state ?? Qubit.ZERO).blochAngles();
    return `${s.selected}|${Math.round((theta * 180) / Math.PI)}|${Math.round((phi * 180) / Math.PI) % 360}`;
  });
  const [, theta, phi] = key.split("|").map(Number);
  return <AnglesForm key={key} initialTheta={theta} initialPhi={phi} onDone={onDone} />;
}

function AnglesForm({ initialTheta, initialPhi, onDone }: { initialTheta: number; initialPhi: number; onDone: () => void }) {
  const { setStartState, setPreview } = useApp.getState();
  const [theta, setTheta] = useState(initialTheta);
  const [phi, setPhi] = useState(initialPhi);

  const stateFor = (t: number, p: number) => Qubit.fromBlochAngles((t * Math.PI) / 180, (p * Math.PI) / 180);
  const preview = (t: number, p: number) => setPreview({ kind: "state", state: stateFor(t, p) });

  function submit(e: FormEvent) {
    e.preventDefault();
    setPreview(null);
    setStartState(stateFor(theta, phi));
    onDone();
  }

  return (
    <form
      className="angles-form"
      onSubmit={submit}
      onPointerEnter={() => preview(theta, phi)}
      onPointerLeave={() => setPreview(null)}
      onFocus={() => preview(theta, phi)}
      onBlur={() => setPreview(null)}
    >
      <label className="slider">
        <span>θ</span>
        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={theta}
          onChange={(e) => {
            setTheta(+e.target.value);
            preview(+e.target.value, phi);
          }}
        />
        <output>{theta}°</output>
      </label>
      <label className="slider">
        <span>φ</span>
        <input
          type="range"
          min={0}
          max={359}
          step={1}
          value={phi}
          onChange={(e) => {
            setPhi(+e.target.value);
            preview(theta, +e.target.value);
          }}
        />
        <output>{phi}°</output>
      </label>
      <button type="submit">Set</button>
    </form>
  );
}

function AmplitudesForm({ onDone }: { onDone: () => void }) {
  const { setStartState } = useApp.getState();
  const [alpha, setAlpha] = useState("");
  const [beta, setBeta] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const a = parseComplex(alpha);
    const b = parseComplex(beta);
    if (!a || !b) {
      setError(`Can't read ${!a ? "α" : "β"}. Use numbers like 0.6, -1, 0.8i or 1+2i.`);
      return;
    }
    try {
      setStartState(new Qubit(a, b));
      setError(null);
      onDone();
    } catch (err) {
      setError(err instanceof RangeError ? err.message : "That isn't a valid state.");
    }
  }

  return (
    <form className="amplitudes-form" onSubmit={submit} noValidate>
      <label className="amplitude-field">
        <span>α</span>
        <input value={alpha} onChange={(e) => setAlpha(e.target.value)} placeholder="1" spellCheck={false} aria-invalid={error?.includes("α") || undefined} />
        <span className="ket-suffix">|0⟩</span>
      </label>
      <label className="amplitude-field">
        <span>β</span>
        <input value={beta} onChange={(e) => setBeta(e.target.value)} placeholder="i" spellCheck={false} aria-invalid={error?.includes("β") || undefined} />
        <span className="ket-suffix">|1⟩</span>
      </label>
      {error && (
        <p className="message message-danger" role="alert">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
      <p className="hint">Amplitudes are normalized for you: α = 1, β = 1 gives |+⟩.</p>
      <button type="submit">Set</button>
    </form>
  );
}
