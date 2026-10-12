import { formulaText } from "../../format/bench";
import { rotationText } from "../../format/rotation";
import { tile } from "../../model/bench";
import { MAX_PINNED, savedGateMatrix, type SavedGate } from "../../model/library";
import { useCircuit, type PaletteItem } from "../circuit/circuitStore";
import { savedGateSpec } from "../gates";
import { useLab } from "../lab/labStore";
import { canPin, useLibrary } from "../libraryStore";
import { goToRoom } from "../rooms";
import { useApp } from "../store";
import { Popover } from "../widgets/Popover";

/** A saved gate as a bench tile: by value, with its recipe. */
export function savedTile(g: SavedGate) {
  return tile({ kind: "saved", name: g.name, label: g.label, tiles: g.tiles });
}

/** A saved gate as a Circuit Lab palette item. */
export function savedItem(g: SavedGate): PaletteItem {
  return { kind: "gate", label: g.label, title: savedGateTitle(g), tile: () => savedTile(g) };
}

export function savedGateTitle(g: SavedGate): string {
  return `${g.name} = ${formulaText(g.tiles)} · ${rotationText(savedGateMatrix(g))}`;
}

/**
 * My gates as a popover: every saved gate, with Apply (Add in the lab, Pick in the Circuit Lab), Edit,
 * Pin, Copy and Delete. `room` decides what the main action does.
 */
export function MyGatesButton({ room }: { room: "sphere" | "lab" | "circuit" }) {
  const count = useLibrary((s) => s.gates.length);
  return (
    <Popover
      id={`my-gates-${room}`}
      button={`My gates (${count}) ▾`}
      buttonClassName="button-small"
      label="My gates"
      heading="My gates"
      placement={room === "sphere" ? "above" : "below"}
      align="end"
    >
      {(close) => <MyGatesList room={room} close={close} />}
    </Popover>
  );
}

function MyGatesList({ room, close }: { room: "sphere" | "lab" | "circuit"; close: () => void }) {
  const gates = useLibrary((s) => s.gates);
  const deleted = useLibrary((s) => s.deleted);
  const { setPinned, duplicate, remove, restore } = useLibrary.getState();

  // The page's Restore notice would sit under this popover, so offer it here too.
  const restoreRow = deleted && (
    <p className="gate-list-notice" role="status">
      Deleted {deleted.gate.name}.
      <button type="button" className="button-small button-accent" onClick={restore}>
        Restore
      </button>
    </p>
  );
  if (gates.length === 0) {
    return (
      <>
        {restoreRow}
        <p className="placeholder">No saved gates yet. Build one in the Gate Lab, then save it.</p>
      </>
    );
  }
  return (
    <>
    {restoreRow}
    <ul className="gate-list">
      {gates.map((g) => (
        <li key={g.id} className="gate-row">
          <span className="gate-badge">{g.label}</span>
          <span className="gate-row-info" title={savedGateTitle(g)}>
            <span className="gate-row-name">{g.name}</span>
            <span className="gate-row-formula">{formulaText(g.tiles)}</span>
          </span>
          <span className="gate-row-actions">
            {room === "sphere" ? (
              <button
                type="button"
                className="button-small button-accent"
                onClick={() => {
                  useApp.getState().applyGate(savedGateSpec(g));
                  close();
                }}
              >
                Apply
              </button>
            ) : room === "lab" ? (
              <button
                type="button"
                className="button-small button-accent"
                onClick={() => {
                  useLab.getState().addTile(savedTile(g));
                  close();
                }}
              >
                Add
              </button>
            ) : (
              <button
                type="button"
                className="button-small button-accent"
                title="Pick it, then click the wires to place it"
                onClick={() => {
                  useCircuit.getState().arm(savedItem(g));
                  close();
                }}
              >
                Pick
              </button>
            )}
            <button
              type="button"
              className="button-small"
              title="Open its recipe in the Gate Lab; Save there updates it"
              onClick={() => {
                useLab.getState().open([...g.tiles], g);
                goToRoom("lab");
                close();
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="button-small"
              aria-pressed={g.pinned}
              disabled={!g.pinned && !canPin(gates)}
              title={g.pinned ? "Remove from the gate bar" : canPin(gates) ? "Show in the gate bar" : `The gate bar holds ${MAX_PINNED}; unpin one first`}
              onClick={() => setPinned(g.id, !g.pinned)}
            >
              {g.pinned ? "Unpin" : "Pin"}
            </button>
            <button type="button" className="button-small" title="Make a copy" onClick={() => duplicate(g.id)}>
              Copy
            </button>
            <button type="button" className="button-small button-quiet" aria-label={`Delete ${g.name}`} title={`Delete ${g.name}`} onClick={() => remove(g.id)}>
              ×
            </button>
          </span>
        </li>
      ))}
    </ul>
    </>
  );
}
