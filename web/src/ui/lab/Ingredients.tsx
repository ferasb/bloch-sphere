import { describeGate } from "../../format/gateNames";
import { Gate } from "../../math/gate";
import { tile, tileFromSpec, type Tile } from "../../model/bench";
import { resolveGate, type GateSpec } from "../../model/sphere";
import { GATE_NAMES, gateKey } from "../controls/GateToolbar";
import { MyGatesButton, savedGateTitle, savedTile } from "../controls/MyGates";
import { RotationForm } from "../controls/RotationForm";
import { savedGateSpec } from "../gates";
import { useLibrary } from "../libraryStore";
import { Popover } from "../widgets/Popover";
import { useLab } from "./labStore";

/** An ingredient: pointing previews adding it (a ghost on the test sphere); clicking adds it. */
function IngredientButton({ spec, label, title, make }: { spec: GateSpec; label: string; title: string; make: () => Tile }) {
  const { addTile, setPreview } = useLab.getState();
  const show = () => setPreview({ kind: "gate", gate: spec });
  const hide = () => setPreview(null);
  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        hide();
        addTile(make());
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

/** A rotation about any axis by any angle, previewed live on the test sphere. */
function RotationIngredient() {
  const { addTile, setPreview } = useLab.getState();
  return (
    <Popover
      id="rotation-lab"
      button="Rotation ▾"
      buttonTitle="A rotation about any axis, by any angle"
      label="Rotation"
      heading="Rotation"
      onClose={() => setPreview(null)}
    >
      {(close) => (
        <RotationForm
          anyAxis
          submitLabel="Add to bench"
          onPreview={(axis, angle) => setPreview({ kind: "gate", gate: { name: "custom", label: "R", about: "", gate: Gate.rotation(axis, angle) } })}
          onSubmit={(axis, angle) => {
            setPreview(null);
            addTile(tile({ kind: "rotation", axis, angle }));
            close();
          }}
        />
      )}
    </Popover>
  );
}

/** Along the top of the test sphere: what gates are made from. Built-ins, a rotation, and My gates. */
export function Ingredients() {
  const saved = useLibrary((s) => s.gates);
  return (
    <div className="ingredients" role="group" aria-labelledby="ingredients-title">
      <span id="ingredients-title" className="strip-title">
        Ingredients
      </span>
      <div className="gate-buttons">
        {GATE_NAMES.map((name) => (
          <IngredientButton
            key={name}
            spec={{ name }}
            label={name}
            title={`${describeGate(name, resolveGate({ name }))} · key ${gateKey(name)}`}
            make={() => tileFromSpec({ name })}
          />
        ))}
      </div>
      <span className="toolbar-divider" aria-hidden />
      <RotationIngredient />
      {saved.length > 0 && <span className="toolbar-divider" aria-hidden />}
      <div className="gate-buttons">
        {saved.map((g) => (
          <IngredientButton key={g.id} spec={savedGateSpec(g)} label={g.label} title={savedGateTitle(g)} make={() => savedTile(g)} />
        ))}
      </div>
      <span className="spacer" />
      <MyGatesButton room="lab" />
    </div>
  );
}
