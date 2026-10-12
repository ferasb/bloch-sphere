import { create } from "zustand";
import { tileGate, type Tile } from "../../model/bench";
import {
  addWire,
  columns,
  emptyCircuit,
  isTwoQubit,
  moveOp,
  newOpId,
  place,
  reconnect,
  removeOp,
  removeWire,
  run,
  setStart,
  shots,
  shotWires,
  type Circuit,
  type Op,
  type Run,
} from "../../model/circuit";
import { loadCircuitSession, saveCircuitSession } from "../../persist/circuits";
import { makePlayer, rotationDuration } from "../playhead";

/** Something from the palette that can be placed on a wire. */
export type PaletteItem = { kind: "gate"; label: string; title: string; tile: () => Tile } | { kind: "cnot" | "cz" | "swap" | "measure"; label: string; title: string };

export interface ShotResult {
  /** Bit strings and how often they came up, most common first. */
  counts: [string, number][];
  total: number;
  /** The wires the bits belong to, in order. */
  wires: string[];
}

/** What Undo brings back: the circuit, and which saved circuit it was (so Save doesn't overwrite the wrong one). */
interface Snapshot {
  circuit: Circuit;
  name: string;
  editing: string | null;
}

export interface CircuitState {
  circuit: Circuit;
  /** The circuit run on screen: states after each column, measurement outcomes chosen once. */
  run: Run;
  /** Time in columns. Animates toward `target`. */
  playhead: number;
  target: number;
  selectedOp: string | null;
  /** The palette item that clicks on the circuit place, if any. */
  armed: PaletteItem | null;
  /** What is being dragged from the palette (drag data can't carry it). */
  dragging: PaletteItem | null;
  shotResult: ShotResult | null;
  /** The column under the pointer: its step is highlighted on the sphere. */
  hoverStep: number | null;
  name: string;
  /** The saved circuit being edited, if any: Save overwrites it. */
  editing: string | null;
  /** A short note for the user (e.g. why something couldn't be placed). */
  message: string | null;
  /** Earlier circuits with their names, for Undo (most recent last). */
  history: Snapshot[];

  /** Replace the circuit (Undo can bring it back); with `animateCol`, play that column if it's the last one. */
  edit(next: Circuit, animateCol?: number): void;
  undo(): void;
  placeItem(item: PaletteItem, wire: string, col: number): void;
  moveOp(id: string, col: number, wire?: string): void;
  reconnect(id: string, end: "first" | "second", wire: string): void;
  removeOp(id: string): void;
  /** Change a single-qubit gate (e.g. a rotation's angle). */
  setTile(id: string, tile: Tile): void;
  addWire(): void;
  removeWire(id: string): void;
  setStart(id: string, label: string): void;
  select(id: string | null): void;
  arm(item: PaletteItem | null): void;
  setDragging(item: PaletteItem | null): void;
  setHoverStep(step: number | null): void;
  setMessage(message: string | null): void;
  toStart(): void;
  toEnd(): void;
  stepBack(): void;
  stepForward(): void;
  play(): void;
  pause(): void;
  scrub(t: number): void;
  /** Run again: new measurement outcomes. */
  rerun(): void;
  runShots(count: number): void;
  open(circuit: Circuit, name: string, editing: string | null): void;
  setName(name: string): void;
  setEditing(id: string | null): void;
}

/** How long a column plays: its slowest operation. */
function columnDuration(c: Circuit, step: number): number {
  const column = columns(c)[step - 1] ?? [];
  return column.reduce((ms, op) => {
    if (op.kind === "gate") return Math.max(ms, rotationDuration(tileGate(op.tile).axisAngle().angle));
    if (op.kind === "measure") return Math.max(ms, 500);
    return Math.max(ms, 900);
  }, 300);
}

const MAX_HISTORY = 100;

const session = loadCircuitSession();
const initialCircuit = session?.circuit ?? emptyCircuit();
const initialRun = run(initialCircuit, Math.random);

export const useCircuit = create<CircuitState>()((set, get) => ({
  circuit: initialCircuit,
  run: initialRun,
  playhead: initialRun.snapshots.length - 1,
  target: initialRun.snapshots.length - 1,
  selectedOp: null,
  armed: null,
  dragging: null,
  shotResult: null,
  hoverStep: null,
  name: session?.name ?? "My circuit",
  editing: session?.editing ?? null,
  message: null,
  history: [],

  edit(next, animateCol) {
    const { circuit, name, editing, history } = get();
    if (next !== circuit) {
      set({ history: [...history.slice(1 - MAX_HISTORY), { circuit, name, editing }] });
    }
    show(next, animateCol);
  },

  undo() {
    const { history } = get();
    const last = history[history.length - 1];
    if (last) {
      set({ history: history.slice(0, -1), name: last.name, editing: last.editing });
      show(last.circuit);
    }
  },


  placeItem(item, wire, col) {
    const { circuit, edit } = get();
    const index = circuit.wires.findIndex((w) => w.id === wire);
    let op: Op;
    if (item.kind === "gate") {
      op = { id: newOpId(), col, kind: "gate", wire, tile: item.tile() };
    } else if (item.kind === "measure") {
      op = { id: newOpId(), col, kind: "measure", wire };
    } else {
      if (circuit.wires.length < 2) {
        set({ message: `${item.label} needs two wires. Add a qubit first.` });
        return;
      }
      // The other end goes on the next wire (or the one above, from the last wire).
      const other = circuit.wires[index + 1 < circuit.wires.length ? index + 1 : index - 1].id;
      op = item.kind === "cnot" ? { id: newOpId(), col, kind: "cnot", control: wire, target: other } : { id: newOpId(), col, kind: item.kind, a: wire, b: other };
    }
    try {
      const next = place(circuit, op);
      edit(next, next.ops.find((o) => o.id === op.id)!.col);
      set({ selectedOp: op.id });
    } catch (err) {
      set({ message: err instanceof Error ? err.message : "Couldn't place that" });
    }
  },

  moveOp(id, col, wire) {
    get().edit(moveOp(get().circuit, id, col, wire));
  },

  reconnect(id, end, wire) {
    get().edit(reconnect(get().circuit, id, end, wire));
  },

  removeOp(id) {
    get().edit(removeOp(get().circuit, id));
  },

  setTile(id, tile) {
    const { circuit, edit } = get();
    edit({ ...circuit, ops: circuit.ops.map((op) => (op.id === id && op.kind === "gate" ? { ...op, tile } : op)) });
  },

  addWire() {
    try {
      get().edit(addWire(get().circuit));
    } catch (err) {
      set({ message: err instanceof Error ? err.message : "Couldn't add a wire" });
    }
  },

  removeWire(id) {
    try {
      get().edit(removeWire(get().circuit, id));
    } catch (err) {
      set({ message: err instanceof Error ? err.message : "Couldn't remove the wire" });
    }
  },

  setStart(id, label) {
    get().edit(setStart(get().circuit, id, label));
  },

  select(id) {
    set({ selectedOp: id });
  },

  arm(item) {
    set({ armed: item, message: null });
  },

  setDragging(item) {
    set({ dragging: item });
  },

  setHoverStep(step) {
    set({ hoverStep: step });
  },

  setMessage(message) {
    set({ message });
  },

  toStart() {
    player.stop();
    set({ playhead: 0, target: 0 });
  },

  toEnd() {
    const end = get().run.snapshots.length - 1;
    player.stop();
    set({ playhead: end, target: end });
  },

  stepBack() {
    player.stop();
    const t = Math.max(0, Math.ceil(get().playhead) - 1);
    set({ playhead: t, target: t });
  },

  stepForward() {
    const end = get().run.snapshots.length - 1;
    set({ target: Math.min(end, Math.floor(get().playhead) + 1) });
    player.play();
  },

  play() {
    const end = get().run.snapshots.length - 1;
    if (get().playhead >= end) {
      set({ playhead: 0 });
    }
    set({ target: end });
    player.play();
  },

  pause() {
    player.stop();
    set({ target: get().playhead });
  },

  scrub(t) {
    const end = get().run.snapshots.length - 1;
    player.stop();
    const time = Math.min(Math.max(t, 0), end);
    set({ playhead: time, target: time });
  },

  rerun() {
    show(get().circuit);
  },

  runShots(count) {
    const { circuit } = get();
    const counts = [...shots(circuit, count, Math.random)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    set({ shotResult: { counts, total: count, wires: shotWires(circuit).map((w) => w.name) } });
  },

  open(circuit, name, editing) {
    get().edit(circuit);
    set({ name, editing, selectedOp: null });
  },

  setName(name) {
    set({ name });
  },

  setEditing(id) {
    set({ editing: id });
  },
}));

/** Show a circuit: run it (new measurement outcomes) and put the playhead at its end. */
function show(next: Circuit, animateCol?: number): void {
  const r = run(next, Math.random);
  const end = r.snapshots.length - 1;
  const animate = animateCol !== undefined && animateCol === end - 1;
  player.stop();
  const selected = useCircuit.getState().selectedOp;
  useCircuit.setState({
    circuit: next,
    run: r,
    playhead: animate ? end - 1 : end,
    target: end,
    shotResult: null,
    message: null,
    selectedOp: next.ops.some((op) => op.id === selected) ? selected : null,
  });
  if (animate) {
    player.play();
  }
}

const player = makePlayer({
  playhead: () => useCircuit.getState().playhead,
  target: () => useCircuit.getState().target,
  duration: (step) => columnDuration(useCircuit.getState().circuit, step),
  setPlayhead: (t) => useCircuit.setState({ playhead: t }),
});

useCircuit.subscribe((s, prev) => {
  if (s.circuit !== prev.circuit || s.name !== prev.name || s.editing !== prev.editing) {
    saveCircuitSession({ circuit: s.circuit, name: s.name, editing: s.editing });
  }
});

/** Whether a circuit can become a journey in the Sphere room: only single-qubit gates (no CNOT, no measurement). */
export function canRunOnSphere(c: Circuit): boolean {
  return c.ops.length > 0 && c.ops.every((op) => !isTwoQubit(op) && op.kind !== "measure");
}
