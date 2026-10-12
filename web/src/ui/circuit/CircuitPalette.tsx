import { describeGate, gateName, gateNickname } from "../../format/gateNames";
import { tile, tileFromSpec } from "../../model/bench";
import { resolveGate } from "../../model/sphere";
import { GATE_NAMES, gateKey } from "../controls/GateToolbar";
import { MyGatesButton, savedItem } from "../controls/MyGates";
import { RotationForm } from "../controls/RotationForm";
import { useLibrary } from "../libraryStore";
import { Popover } from "../widgets/Popover";
import { useCircuit, type PaletteItem } from "./circuitStore";

const TWO_QUBIT: PaletteItem[] = (["CNOT", "CZ", "SWAP"] as const).map((label) => ({
  kind: label.toLowerCase() as "cnot" | "cz" | "swap",
  label,
  title: `${gateName(label)}${gateNickname(label) ? ` (${gateNickname(label)})` : ""}: a two-qubit gate. Drag its ends to connect other wires.${label === "CNOT" ? " · key C" : ""}`,
}));

const MEASURE: PaletteItem = { kind: "measure", label: "Measure", title: "Measure: the qubit collapses to 0 or 1, and the bit is recorded. · key M" };

function same(a: PaletteItem | null, b: PaletteItem): boolean {
  return !!a && a.kind === b.kind && a.label === b.label && a.title === b.title;
}

/** A palette button: click to pick it (then click wires to place copies), or drag it onto a wire. */
function PaletteButton({ item, className }: { item: PaletteItem; className?: string }) {
  const armed = useCircuit((s) => same(s.armed, item));
  const { arm, setDragging } = useCircuit.getState();
  return (
    <button
      type="button"
      className={className}
      title={item.title}
      aria-pressed={armed}
      draggable
      onClick={() => arm(armed ? null : item)}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.label);
        e.dataTransfer.effectAllowed = "copy";
        setDragging(item);
      }}
      onDragEnd={() => setDragging(null)}
    >
      {item.label}
    </button>
  );
}

/** A rotation about x, y or z by any angle, picked like any other palette gate. */
function RotationItem() {
  const armed = useCircuit((s) => s.armed?.kind === "gate" && /^R[xyz]\(/.test(s.armed.label));
  return (
    <Popover
      id="rotation-circuit"
      button="R(θ) ▾"
      buttonClassName={armed ? "picked" : undefined}
      buttonTitle="X-, Y- or Z-rotation (Rx, Ry, Rz) by any angle"
      label="Rotation"
      heading="Rotation"
    >
      {(close) => (
        <RotationForm
          anyAxis={false}
          submitLabel="Pick"
          onPreview={() => {}}
          onSubmit={(axis, angle) => {
            const name = axis[0] ? "Rx" : axis[1] ? "Ry" : "Rz";
            const label = `${name}(${Math.round((angle * 180) / Math.PI)}°)`;
            useCircuit.getState().arm({ kind: "gate", label, title: `${gateName(label)} by ${Math.round((angle * 180) / Math.PI)}°`, tile: () => tile({ kind: "rotation", axis, angle }) });
            close();
          }}
        />
      )}
    </Popover>
  );
}

/**
 * Along the top of the circuit (design-gates.md §4.2): single-qubit gates, two-qubit gates and
 * Measure. Below it, a line saying what clicking does now.
 */
export function CircuitPalette() {
  const pinned = useLibrary((s) => s.gates).filter((g) => g.pinned);
  const armed = useCircuit((s) => s.armed);
  return (
    <div className="circuit-palette">
      <div className="palette-row" role="group" aria-labelledby="palette-title">
        <span id="palette-title" className="strip-title">
          Palette
        </span>
        <div className="gate-buttons">
          {GATE_NAMES.map((name) => (
            <PaletteButton
              key={name}
              item={{ kind: "gate", label: name, title: `${describeGate(name, resolveGate({ name }))} · key ${gateKey(name)}`, tile: () => tileFromSpec({ name }) }}
            />
          ))}
        </div>
        <RotationItem />
        {pinned.length > 0 && <span className="toolbar-divider" aria-hidden />}
        {pinned.length > 0 && (
          <div className="gate-buttons">
            {pinned.map((g) => (
              <PaletteButton key={g.id} item={savedItem(g)} />
            ))}
          </div>
        )}
        <span className="toolbar-divider" aria-hidden />
        <div className="gate-buttons gate-buttons-wide">
          {TWO_QUBIT.map((item) => (
            <PaletteButton key={item.label} item={item} />
          ))}
        </div>
        <span className="toolbar-divider" aria-hidden />
        <div className="gate-buttons gate-buttons-wide">
          <PaletteButton item={MEASURE} />
        </div>
        <span className="spacer" />
        <MyGatesButton room="circuit" />
      </div>
      <p className="palette-hint" role="status">
        {armed ? (
          <>
            Placing <strong>{armed.label}</strong>: click a spot on a wire. Esc to stop.
          </>
        ) : (
          "Drag a gate onto a wire, or click it and then click the wires."
        )}
      </p>
    </div>
  );
}
