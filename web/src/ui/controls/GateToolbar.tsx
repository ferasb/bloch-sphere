import { describeGate } from "../../format/gateNames";
import { allows, challengeById } from "../../model/challenges";
import { resolveGate, type FixedGateName, type GateSpec } from "../../model/sphere";
import { savedGateSpec } from "../gates";
import { useLibrary } from "../libraryStore";
import { goToRoom } from "../rooms";
import { useApp } from "../store";
import { Popover } from "../widgets/Popover";
import { QubitTag } from "../widgets/QubitTag";
import { MyGatesButton, savedGateTitle } from "./MyGates";
import { RotationForm } from "./RotationForm";

export const GATE_NAMES: FixedGateName[] = ["X", "Y", "Z", "H", "S", "T", "S†", "T†"];

/** Keyboard shortcut for each gate, as shown in its tooltip. */
export function gateKey(name: FixedGateName): string {
  return name.endsWith("†") ? `Shift+${name[0]}` : name;
}

/** Who the gates act on, as "to ● q1" or "to ●● all qubits". */
function GateTarget() {
  // A string, so the selector result is stable: "all|1,2" or "one|q1|1".
  const target = useApp((s) =>
    s.applyToAll
      ? `all|${s.sphere.qubits.map((q) => q.colorSlot).join(",")}`
      : `one|${s.sphere.qubit(s.selected)?.name ?? ""}|${s.sphere.qubit(s.selected)?.colorSlot ?? 1}`,
  );
  const [kind, a, b] = target.split("|");
  if (kind === "one") {
    return <QubitTag name={a} colorSlot={Number(b)} />;
  }
  return (
    <span className="qubit-tag">
      {a.split(",").map((slot) => (
        <span key={slot} className="qubit-dot" style={{ background: `var(--qubit-${slot})` }} aria-hidden />
      ))}
      all qubits
    </span>
  );
}

/** Whether a gate works right now: during a challenge, only its gates do. */
function useAllowed(spec: GateSpec): boolean {
  return useApp((s) => {
    const c = challengeById(s.challenge);
    return !c || allows(c, { kind: "gate", gate: spec, targets: [] });
  });
}

/** A gate button: points to preview, clicks to apply. */
function GateButton({ spec, label, title }: { spec: GateSpec; label: string; title: string }) {
  const { applyGate, setPreview } = useApp.getState();
  const allowed = useAllowed(spec);
  const show = () => setPreview({ kind: "gate", gate: spec });
  const hide = () => setPreview(null);
  return (
    <button
      type="button"
      title={allowed ? title : `${title} · not in this challenge`}
      disabled={!allowed}
      onClick={() => {
        // Clicking commits: drop the preview, or it would show where a second click goes.
        hide();
        applyGate(spec);
      }}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {label}
    </button>
  );
}

/** R(θ): a rotation about x, y or z by any angle, previewed live. */
function RotationButton() {
  const { applyGate, setPreview } = useApp.getState();
  const name = (axis: readonly number[]) => (axis[0] ? "Rx" : axis[1] ? "Ry" : "Rz");
  return (
    <Popover
      id="rotation-sphere"
      button="R(θ) ▾"
      buttonTitle="X-, Y- or Z-rotation (Rx, Ry, Rz) by any angle"
      label="Rotation"
      heading="Rotate"
      placement="above"
      onClose={() => setPreview(null)}
    >
      {(close) => (
        <RotationForm
          anyAxis={false}
          submitLabel="Apply"
          onPreview={(axis, angle) => setPreview({ kind: "gate", gate: { name: name(axis), angle } })}
          onSubmit={(axis, angle) => {
            setPreview(null);
            applyGate({ name: name(axis), angle });
            close();
          }}
        />
      )}
    </Popover>
  );
}

/**
 * Along the bottom of the sphere: the gates, under a heading saying what they do and to whom.
 * Built-ins, a rotation by any angle, and pinned gates from My gates.
 */
export function GateToolbar() {
  const pinned = useLibrary((s) => s.gates).filter((g) => g.pinned);
  const inChallenge = useApp((s) => s.challenge !== null);

  return (
    <div className="gate-toolbar" role="group" aria-labelledby="gate-toolbar-title">
      <div className="toolbar-head">
        <div id="gate-toolbar-title" className="toolbar-title">
          Apply a gate
          <span className="toolbar-target">
            to <GateTarget />
          </span>
        </div>
        <div className="toolbar-links">
          <MyGatesButton room="sphere" />
          <button type="button" className="button-small" onClick={() => goToRoom("lab")} title="Build your own gates">
            Gate Lab ▸
          </button>
        </div>
      </div>
      <div className="gate-buttons">
        {GATE_NAMES.map((name) => (
          <GateButton key={name} spec={{ name }} label={name} title={`${describeGate(name, resolveGate({ name }))} · key ${gateKey(name)}`} />
        ))}
        {/* A challenge allows only some of the built-ins above. */}
        {!inChallenge && (
          <>
            <span className="toolbar-divider" aria-hidden />
            <RotationButton />
            {pinned.length > 0 && <span className="toolbar-divider" aria-hidden />}
            {pinned.map((g) => (
              <GateButton key={g.id} spec={savedGateSpec(g)} label={g.label} title={savedGateTitle(g)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
