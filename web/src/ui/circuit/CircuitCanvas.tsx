import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { tileText } from "../../format/bench";
import { wireStateText } from "../../format/circuit";
import { describeGate } from "../../format/gateNames";
import { NAMED_STATES } from "../../math/qubit";
import { tile, tileGate, type BenchBuiltin } from "../../model/bench";
import { blochAt, columnCount, opWires, type Circuit, type Op } from "../../model/circuit";
import { Popover } from "../widgets/Popover";
import { QubitTag } from "../widgets/QubitTag";
import { useCircuit, type PaletteItem } from "./circuitStore";

// Grid geometry, in px: a column per time step, a row per wire, labels left and states right.
export const COL_W = 56;
export const ROW_H = 52;
const LEFT = 150;
const RIGHT = 150;
const BITS_H = 44;
const MIN_COLUMNS = 8;

type Cell = { col: number; row: number };

/** The rows an operation covers (a two-qubit gate's line crosses the wires between its ends). */
function rowsOf(c: Circuit, op: Op): number[] {
  const idx = opWires(op).map((id) => c.wires.findIndex((w) => w.id === id));
  const lo = Math.min(...idx);
  const hi = Math.max(...idx);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

function opAt(c: Circuit, cell: Cell): Op | undefined {
  return c.ops.find((op) => op.col === cell.col && rowsOf(c, op).includes(cell.row));
}

const KEY_GATES: Record<string, BenchBuiltin> = { x: "X", y: "Y", z: "Z", h: "H", s: "S", t: "T" };

function builtinItem(name: BenchBuiltin, dagger: boolean): PaletteItem {
  const label = dagger ? `${name}†` : name;
  return { kind: "gate", label, title: label, tile: () => tile({ kind: "builtin", name }, dagger ? -1 : 1) };
}

/**
 * The circuit (design-gates.md §4.2–4.3): wires left to right in time. Place with a picked palette
 * item or by dragging one in; drag placed gates to move them, and a two-qubit gate's ends to
 * reconnect them; drag the playhead to scrub. Keyboard: arrows move a cursor, gate letters place.
 */
export function CircuitCanvas() {
  const circuit = useCircuit((s) => s.circuit);
  const runState = useCircuit((s) => s.run);
  const playhead = useCircuit((s) => s.playhead);
  const selected = useCircuit((s) => s.selectedOp);
  const armed = useCircuit((s) => s.armed);
  const store = useCircuit.getState();

  const grid = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [cursor, setCursor] = useState<Cell>({ col: 0, row: 0 });
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "first" | "second"; moved: boolean; x: number; y: number } | null>(null);

  const n = columnCount(circuit);
  const shown = Math.max(n + 1, MIN_COLUMNS);
  const rows = circuit.wires.length;
  const measures = circuit.ops.filter((op) => op.kind === "measure");
  const width = LEFT + shown * COL_W + RIGHT;
  const height = rows * ROW_H + (measures.length ? BITS_H : 0);
  const vectors = blochAt(runState, playhead);

  function cellAt(clientX: number, clientY: number): Cell | null {
    const r = grid.current!.getBoundingClientRect();
    const col = Math.floor((clientX - r.left - LEFT) / COL_W);
    const row = Math.floor((clientY - r.top) / ROW_H);
    return col >= 0 && col < shown && row >= 0 && row < rows ? { col, row } : null;
  }

  /** Dropping on a busy cell inserts before what's there. */
  function placeAt(item: PaletteItem, cell: Cell) {
    const busy = opAt(circuit, cell);
    store.placeItem(item, circuit.wires[cell.row].id, busy ? cell.col - 0.5 : cell.col);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const cell = cellAt(e.clientX, e.clientY);
    setHover(cell);
    store.setHoverStep(cell && cell.col < n ? cell.col + 1 : null);
    if (drag && !drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) {
      setDrag({ ...drag, moved: true });
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (!drag) {
      return;
    }
    const cell = cellAt(e.clientX, e.clientY);
    if (!drag.moved) {
      store.select(drag.id);
    } else if (cell) {
      const op = circuit.ops.find((o) => o.id === drag.id)!;
      if (drag.mode === "move") {
        const busy = opAt(circuit, cell);
        const col = busy && busy.id !== op.id ? cell.col - 0.5 : cell.col;
        store.moveOp(op.id, col, op.kind === "gate" || op.kind === "measure" ? circuit.wires[cell.row].id : undefined);
      } else {
        store.reconnect(op.id, drag.mode, circuit.wires[cell.row].id);
      }
    }
    setDrag(null);
  }

  function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const move = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
    if (move) {
      e.preventDefault();
      setCursor({ col: Math.max(0, Math.min(shown - 1, cursor.col + move[0])), row: Math.max(0, Math.min(rows - 1, cursor.row + move[1])) });
    } else if (KEY_GATES[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      placeAt(builtinItem(KEY_GATES[key], e.shiftKey && (key === "s" || key === "t")), cursor);
    } else if (key === "c" || key === "m") {
      e.preventDefault();
      placeAt(key === "c" ? { kind: "cnot", label: "CNOT", title: "CNOT" } : { kind: "measure", label: "Measure", title: "Measure" }, cursor);
    } else if (key === "delete" || key === "backspace") {
      e.preventDefault();
      const id = selected ?? opAt(circuit, cursor)?.id;
      if (id) store.removeOp(id);
    } else if (key === "enter") {
      store.select(opAt(circuit, cursor)?.id ?? null);
    } else if (key === "escape") {
      store.arm(null);
      store.select(null);
    }
  }

  const x = (col: number) => LEFT + col * COL_W;
  const y = (row: number) => row * ROW_H + ROW_H / 2;
  const indicator = (drag?.moved || armed) && hover;

  return (
    <div
      ref={grid}
      className={`circuit-grid${armed ? " armed" : ""}`}
      style={{ width, height }}
      tabIndex={0}
      role="application"
      aria-label="Circuit. Arrow keys move the cursor; gate letters, C (CNOT) and M (measure) place; Delete removes."
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        setHover(null);
        store.setHoverStep(null);
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains("wire-line")) return;
        const cell = cellAt(e.clientX, e.clientY);
        if (cell) {
          setCursor(cell);
          if (armed) placeAt(armed, cell);
          else store.select(null);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setHover(cellAt(e.clientX, e.clientY));
      }}
      onDrop={(e) => {
        e.preventDefault();
        const cell = cellAt(e.clientX, e.clientY);
        const item = useCircuit.getState().dragging;
        if (cell && item) placeAt(item, cell);
        store.setDragging(null);
      }}
    >
      {/* Wires: label and starting state on the left, the line, and the state at the playhead on the right. */}
      {circuit.wires.map((wire, row) => (
        <div key={wire.id}>
          <div className="wire-head" style={{ top: row * ROW_H, width: LEFT, height: ROW_H }}>
            <QubitTag name={wire.name} colorSlot={wire.colorSlot} />
            <Popover
              id={`start-${wire.id}`}
              button={wire.start}
              buttonClassName="button-small ket-button"
              buttonTitle={`${wire.name} starts at ${wire.start}. Click to change.`}
              label={`Starting state of ${wire.name}`}
              heading={`${wire.name} starts at`}
            >
              {(close) => (
                <div className="preset-grid">
                  {NAMED_STATES.map(({ label }) => (
                    <button
                      key={label}
                      type="button"
                      className="ket-button"
                      aria-pressed={label === wire.start}
                      onClick={() => {
                        store.setStart(wire.id, label);
                        close();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
            {rows > 1 && (
              <button type="button" className="wire-remove" aria-label={`Remove ${wire.name} and its gates`} title={`Remove ${wire.name} and its gates`} onClick={() => store.removeWire(wire.id)}>
                ×
              </button>
            )}
          </div>
          <div className="wire-line" style={{ top: y(row), left: LEFT, width: shown * COL_W }} />
          <div className="wire-end" style={{ top: row * ROW_H, left: x(shown) + 10, height: ROW_H }} title="This qubit at the playhead">
            {wireStateText(vectors[row])}
          </div>
        </div>
      ))}

      {/* The classical bits that measurements write to. */}
      {measures.length > 0 && <div className="bit-line" style={{ top: rows * ROW_H + 14, left: LEFT, width: shown * COL_W }} />}

      {indicator && <div className="drop-indicator" style={{ left: x(hover.col) + 3, top: hover.row * ROW_H + 3, width: COL_W - 6, height: ROW_H - 6 }} />}
      <div className="cursor-cell" style={{ left: x(cursor.col) + 2, top: cursor.row * ROW_H + 2, width: COL_W - 4, height: ROW_H - 4 }} />

      {circuit.ops.map((op) => (
        <OpView
          key={op.id}
          op={op}
          circuit={circuit}
          selected={op.id === selected}
          x={x(op.col) + COL_W / 2}
          y={y}
          bitsTop={rows * ROW_H + 14}
          onGrab={(mode, e) => {
            e.stopPropagation();
            setDrag({ id: op.id, mode, moved: false, x: e.clientX, y: e.clientY });
          }}
        />
      ))}

      <Playhead x={x(playhead)} height={height} onScrub={(clientX) => store.scrub((clientX - grid.current!.getBoundingClientRect().left - LEFT) / COL_W)} />
    </div>
  );
}

interface OpViewProps {
  op: Op;
  circuit: Circuit;
  selected: boolean;
  x: number;
  y: (row: number) => number;
  bitsTop: number;
  onGrab: (mode: "move" | "first" | "second", e: ReactPointerEvent) => void;
}

function OpView({ op, circuit, selected, x, y, bitsTop, onGrab }: OpViewProps) {
  const row = (id: string) => circuit.wires.findIndex((w) => w.id === id);
  const cls = selected ? " selected" : "";
  const grab = (mode: "move" | "first" | "second") => (e: ReactPointerEvent) => onGrab(mode, e);

  if (op.kind === "gate" || op.kind === "measure") {
    const r = row(op.wire);
    const label = op.kind === "gate" ? tileText(op.tile) : null;
    return (
      <>
        {op.kind === "measure" && <div className="measure-line" style={{ left: x - 2, top: y(r) + 14, height: bitsTop - y(r) - 14 }} />}
        <button
          type="button"
          className={`cgate${op.kind === "measure" ? " cmeasure" : ""}${cls}`}
          style={{ left: x - (COL_W - 12) / 2, top: y(r) - (ROW_H - 16) / 2, width: COL_W - 12, height: ROW_H - 16 }}
          onPointerDown={grab("move")}
          onClick={(e) => e.stopPropagation()}
          title={op.kind === "gate" ? `${describeGate(label!, tileGate(op.tile))}. Drag to move.` : "Measure: collapses the qubit to 0 or 1. Drag to move."}
          aria-label={op.kind === "gate" ? `${label} on ${circuit.wires[r].name}` : `Measure ${circuit.wires[r].name}`}
        >
          {op.kind === "gate" ? <span className={label!.length > 3 ? "cgate-long" : undefined}>{label}</span> : <MeterIcon />}
        </button>
      </>
    );
  }

  const [first, second] = opWires(op).map(row);
  const top = Math.min(first, second);
  const bottom = Math.max(first, second);
  const name = { cnot: "CNOT", cz: "CZ", swap: "SWAP" }[op.kind];
  const ends: [number, "first" | "second", string][] = [
    [first, "first", op.kind === "cnot" ? "control" : "end"],
    [second, "second", op.kind === "cnot" ? "target" : "end"],
  ];
  return (
    <>
      <div className={`two-line${cls}`} style={{ left: x - 1, top: y(top), height: y(bottom) - y(top) }} onPointerDown={grab("move")} onClick={(e) => e.stopPropagation()} />
      {ends.map(([r, end, role]) => (
        <button
          key={end}
          type="button"
          className={`two-end ${op.kind === "cnot" ? (role === "control" ? "control-dot" : "target-plus") : op.kind === "cz" ? "control-dot" : "swap-x"}${cls}`}
          style={{ left: x, top: y(r) }}
          onPointerDown={grab(end)}
          onClick={(e) => e.stopPropagation()}
          title={`${name} ${role} on ${circuit.wires[r].name}. Drag to another wire to reconnect.`}
          aria-label={`${name} ${role} on ${circuit.wires[r].name}`}
        >
          {op.kind === "swap" ? "×" : ""}
        </button>
      ))}
    </>
  );
}

function MeterIcon() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden>
      <path d="M2 14 A9 9 0 0 1 20 14" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 14 L16 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** The playhead: a line between columns, with a handle to drag (scrub). */
function Playhead({ x, height, onScrub }: { x: number; height: number; onScrub: (clientX: number) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="playhead" style={{ left: x, height }}>
      <span
        className={`playhead-handle${dragging ? " dragging" : ""}`}
        title="Drag to move through the circuit"
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => dragging && onScrub(e.clientX)}
        onPointerUp={(e) => {
          setDragging(false);
          onScrub(e.clientX);
        }}
      />
    </div>
  );
}
