import { useEffect, useState, type FormEvent } from "react";
import { formulaText } from "../../format/bench";
import { Gate } from "../../math/gate";
import { MAX_LABEL, MAX_NAME, product } from "../../model/bench";
import { MAX_ABOUT } from "../../model/serialize";
import { useLibrary } from "../libraryStore";
import { goToRoom } from "../rooms";
import { useApp } from "../store";
import { useLab } from "./labStore";

/** The bottom of the lab: name the gate, save it to My gates, or apply it on the sphere. */
export function SaveBar() {
  const tiles = useLab((s) => s.tiles);
  const name = useLab((s) => s.name);
  const label = useLab((s) => s.label);
  const pin = useLab((s) => s.pin);
  const editing = useLab((s) => s.editing);
  const editingGate = useLibrary((s) => s.gates.find((g) => g.id === editing));
  const target = useApp((s) => (s.applyToAll ? "all qubits" : (s.sphere.qubit(s.selected)?.name ?? "")));
  // A challenge on the sphere allows only its own gates.
  const inChallenge = useApp((s) => s.challenge !== null);
  const { setForm, setEditing } = useLab.getState();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const valid = tiles.length > 0 && name.trim().length > 0 && label.trim().length > 0;

  function save(asNew: boolean) {
    try {
      const stored = useLibrary.getState().save({ id: asNew ? undefined : editingGate?.id, name: name.trim(), label: label.trim(), tiles, pinned: pin });
      setEditing(stored.id);
      setMessage(`Saved “${stored.name}”${pin && !stored.pinned ? " (the gate bar is full, so it isn't pinned)" : ""}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  function apply() {
    const shown = label.trim() || "U";
    useApp.getState().applyGate({ name: "custom", label: shown, about: formulaText(tiles).slice(0, MAX_ABOUT), gate: new Gate(product(tiles).matrix, shown) });
    goToRoom("sphere");
  }

  return (
    <form
      className="save-bar"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save(false);
      }}
    >
      <label className="field">
        Name
        <input value={name} maxLength={MAX_NAME} onChange={(e) => setForm({ name: e.target.value })} spellCheck={false} />
      </label>
      <label className="field field-short" title="Up to 4 characters, shown on buttons and journey chips">
        Label
        <input value={label} maxLength={MAX_LABEL} onChange={(e) => setForm({ label: e.target.value })} spellCheck={false} />
      </label>
      <label className="toggle">
        <input type="checkbox" checked={pin} onChange={(e) => setForm({ pin: e.target.checked })} />
        Pin to gate bar
      </label>
      <button type="submit" disabled={!valid}>
        {editingGate ? `Save changes to “${editingGate.name}”` : "Save to My gates"}
      </button>
      {editingGate && (
        <button type="button" disabled={!valid} onClick={() => save(true)}>
          Save as new
        </button>
      )}
      {message && (
        <span className="message message-success" role="status">
          ✓ {message}
        </span>
      )}
      <span className="spacer" />
      <button
        type="button"
        className="button-accent"
        disabled={tiles.length === 0 || inChallenge}
        onClick={apply}
        title={inChallenge ? "Not during a challenge: it allows only its own gates" : "Apply this gate on the sphere"}
      >
        Apply to {target} ▸
      </button>
    </form>
  );
}
