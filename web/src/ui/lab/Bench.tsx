import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { tileText } from "../../format/bench";
import { gateName } from "../../format/gateNames";
import { scaleBench, scaleTile } from "../../model/bench";
import { Popover } from "../widgets/Popover";
import { useLab } from "./labStore";

/** Fraction t by slider: the bench (or selected tile) updates live, so the arc stops partway. */
function FractionForm({ close }: { close: () => void }) {
  // What to scale: the bench as it was when the slider opened.
  const base = useMemo(() => ({ tiles: useLab.getState().tiles, selected: useLab.getState().selectedTile }), []);
  const [t, setT] = useState(1);
  const kept = useRef(false);

  // Closing without Keep puts the bench back.
  useEffect(
    () => () => {
      if (!kept.current) {
        useLab.getState().setTiles(base.tiles);
      }
    },
    [base],
  );

  function update(value: number) {
    setT(value);
    const tiles = base.selected ? base.tiles.map((x) => (x.id === base.selected ? scaleTile(x, value) : x)) : scaleBench(base.tiles, value);
    useLab.getState().setTiles(tiles);
  }

  function keep(e: FormEvent) {
    e.preventDefault();
    kept.current = true;
    close();
  }

  return (
    <form className="angles-form" onSubmit={keep}>
      <label className="slider">
        <span>t</span>
        <input type="range" min={0} max={1} step={0.01} value={t} onChange={(e) => update(+e.target.value)} />
        <output>{t.toFixed(2)}</output>
      </label>
      <p className="hint">The rotation, t of the way. t = ½ is the square root: half the turn.</p>
      <button type="submit">Keep</button>
    </form>
  );
}

const REPEATS = [2, 3, 4];
const FRACTIONS: [number, string][] = [
  [1 / 2, "½"],
  [1 / 3, "⅓"],
  [1 / 4, "¼"],
];

/**
 * Along the bottom of the test sphere: the tiles in time order (click to select, drag to reorder,
 * × to remove) and the operations, which act on the selected tile or on the whole bench.
 */
export function Bench() {
  const tiles = useLab((s) => s.tiles);
  const selected = useLab((s) => s.selectedTile);
  const compare = useLab((s) => s.compareReversed);
  const { selectTile, removeTile, moveTile, undo, scale, clear, setCompareReversed, setHoverStep } = useLab.getState();
  const [dragging, setDragging] = useState<string | null>(null);

  const selectedTile = tiles.find((t) => t.id === selected);
  const empty = tiles.length === 0;

  return (
    <div className="bench" role="group" aria-labelledby="bench-title">
      <div className="toolbar-head">
        <div id="bench-title" className="toolbar-title">
          Bench
          <span className="toolbar-target">time →</span>
        </div>
        {!empty && (
          <div className="bench-target">
            acting on <strong>{selectedTile ? tileText(selectedTile) : "the whole bench"}</strong>
            {selectedTile && (
              <button type="button" className="link-button" onClick={() => selectTile(null)}>
                use whole bench
              </button>
            )}
          </div>
        )}
      </div>

      <ol
        className="tiles"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (dragging) {
            moveTile(dragging, tiles.length);
          }
          setDragging(null);
        }}
      >
        {empty && <li className="placeholder">Click an ingredient above, or press X, Y, Z, H, S, T, to start building a gate.</li>}
        {tiles.map((t, i) => (
          <li
            key={t.id}
            draggable
            onDragStart={() => setDragging(t.id)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragging) {
                moveTile(dragging, i);
              }
              setDragging(null);
            }}
            onPointerEnter={() => setHoverStep(i + 1)}
            onPointerLeave={() => setHoverStep(null)}
            className={dragging === t.id ? "dragging" : undefined}
          >
            {i > 0 && (
              <span className="chip-arrow" aria-hidden>
                →
              </span>
            )}
            <span className={t.id === selected ? "tile selected" : "tile"}>
              <button type="button" className="tile-select" aria-pressed={t.id === selected} onClick={() => selectTile(t.id === selected ? null : t.id)} title={`${gateName(tileText(t)) ? `${gateName(tileText(t))}. ` : ""}Select it so operations act on this tile; drag to reorder.`}>
                {tileText(t)}
              </button>
              <button type="button" className="tile-remove" aria-label={`Remove ${tileText(t)}`} onClick={() => removeTile(t.id)}>
                ×
              </button>
            </span>
          </li>
        ))}
      </ol>

      <div className="bench-ops">
        <button type="button" className="button-small" disabled={empty} onClick={undo} title="U†: undo it. For the whole bench: reverse the order and undo each tile">
          Undo †
        </button>
        <span className="op-group">
          <span className="op-label">Repeat</span>
          {REPEATS.map((k) => (
            <button key={k} type="button" className="button-small" disabled={empty} onClick={() => scale(k)} title={`Do it ${k} times: U^${k}`}>
              ×{k}
            </button>
          ))}
        </span>
        <span className="op-group">
          <span className="op-label">Fraction</span>
          {FRACTIONS.map(([k, label]) => (
            <button key={label} type="button" className="button-small" disabled={empty} onClick={() => scale(k)} title={`${label} of the rotation`}>
              {label}
            </button>
          ))}
          <Popover id="fraction" button="t…" buttonClassName="button-small" buttonTitle="Any fraction, with a slider" label="Fraction" heading="Fraction" placement="above">
            {(close) => <FractionForm close={close} />}
          </Popover>
        </span>
        <label className="toggle" title="Also show the tiles in reverse order: does order matter?">
          <input type="checkbox" checked={compare} disabled={tiles.length < 2} onChange={(e) => setCompareReversed(e.target.checked)} />
          Compare reversed order
        </label>
        <span className="spacer" />
        <button type="button" className="button-small button-quiet" disabled={empty} onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  );
}
