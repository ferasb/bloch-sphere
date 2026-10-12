import { Gate } from "../math/gate";
import { NAMED_STATES } from "../math/qubit";
import { Register, swapPower } from "../math/register";
import { length, type Vec3 } from "../math/vec3";
import { loadTiles, saveTiles, tileGate, type Tile } from "./bench";

/**
 * A circuit (design-gates.md §4): wires (qubits) and operations placed in time columns. Pure data;
 * runs are simulated on a Register, so two-qubit gates can entangle wires.
 */
export const MAX_WIRES = 5;
export const MAX_OPS = 200;

export interface Wire {
  readonly id: string;
  /** "q1"…"q5", from the color slot, as in the Sphere room. */
  readonly name: string;
  readonly colorSlot: number;
  /** The starting state: one of the six axis states, by label (NAMED_STATES). */
  readonly start: string;
}

export type Op =
  | { readonly id: string; readonly col: number; readonly kind: "gate"; readonly wire: string; readonly tile: Tile }
  | { readonly id: string; readonly col: number; readonly kind: "cnot"; readonly control: string; readonly target: string }
  | { readonly id: string; readonly col: number; readonly kind: "cz"; readonly a: string; readonly b: string }
  | { readonly id: string; readonly col: number; readonly kind: "swap"; readonly a: string; readonly b: string }
  | { readonly id: string; readonly col: number; readonly kind: "measure"; readonly wire: string };

export type TwoQubitOp = Extract<Op, { kind: "cnot" | "cz" | "swap" }>;

export interface Circuit {
  readonly wires: readonly Wire[];
  readonly ops: readonly Op[];
}

let nextId = 0;
export function newOpId(): string {
  return `op-${++nextId}`;
}

/** The wires an operation touches. */
export function opWires(op: Op): string[] {
  switch (op.kind) {
    case "gate":
    case "measure":
      return [op.wire];
    case "cnot":
      return [op.control, op.target];
    default:
      return [op.a, op.b];
  }
}

export function isTwoQubit(op: Op): op is TwoQubitOp {
  return op.kind === "cnot" || op.kind === "cz" || op.kind === "swap";
}

/** Two wires: q1 and q2, both at |0⟩. */
export function emptyCircuit(): Circuit {
  return {
    wires: [1, 2].map((slot) => ({ id: `w${slot}`, name: `q${slot}`, colorSlot: slot, start: "|0⟩" })),
    ops: [],
  };
}

/** Number of columns (the last one in use, plus one). */
export function columnCount(c: Circuit): number {
  return c.ops.reduce((n, op) => Math.max(n, op.col + 1), 0);
}

/** The rows an operation covers: a two-qubit gate's line crosses every wire between its ends. */
function rows(c: Circuit, op: Op): number[] {
  const idx = opWires(op).map((id) => c.wires.findIndex((w) => w.id === id));
  const lo = Math.min(...idx);
  const hi = Math.max(...idx);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/**
 * Slide every operation left into the earliest column free on all its rows, keeping their order
 * (by column, then by position in the list). Operations may carry fractional columns before this:
 * dropping at col − ½ inserts before whatever is at col.
 */
export function compact(c: Circuit): Circuit {
  const order = c.ops.map((op, i) => ({ op, i })).sort((x, y) => x.op.col - y.op.col || x.i - y.i);
  const free = c.wires.map(() => 0);
  const ops = order.map(({ op }) => {
    const r = rows(c, op);
    const col = Math.max(...r.map((row) => free[row]));
    r.forEach((row) => (free[row] = col + 1));
    return { ...op, col };
  });
  return { ...c, ops };
}

/** Operations grouped by column. */
export function columns(c: Circuit): Op[][] {
  const out: Op[][] = Array.from({ length: columnCount(c) }, () => []);
  c.ops.forEach((op) => out[op.col].push(op));
  return out;
}

// --- Editing (each returns a compacted circuit) --------------------------------------------------

export function place(c: Circuit, op: Op): Circuit {
  if (c.ops.length >= MAX_OPS) {
    throw new RangeError(`A circuit holds at most ${MAX_OPS} operations`);
  }
  checkWires(c, op);
  return compact({ ...c, ops: [...c.ops, op] });
}

export function removeOp(c: Circuit, id: string): Circuit {
  return compact({ ...c, ops: c.ops.filter((op) => op.id !== id) });
}

/** Move a single-wire operation to another wire and column (two-qubit gates keep their wires). */
export function moveOp(c: Circuit, id: string, col: number, wire?: string): Circuit {
  return compact({
    ...c,
    ops: c.ops.map((op) => {
      if (op.id !== id) return op;
      const moved = { ...op, col };
      return wire && (moved.kind === "gate" || moved.kind === "measure") ? { ...moved, wire } : moved;
    }),
  });
}

/** Reconnect one end of a two-qubit gate to another wire. Choosing the other end's wire swaps the ends. */
export function reconnect(c: Circuit, id: string, end: "first" | "second", wire: string): Circuit {
  return compact({
    ...c,
    ops: c.ops.map((op) => {
      if (op.id !== id || !isTwoQubit(op)) return op;
      const [first, second] = opWires(op);
      const ends = end === "first" ? [wire, second === wire ? first : second] : [first === wire ? second : first, wire];
      return op.kind === "cnot" ? { ...op, control: ends[0], target: ends[1] } : { ...op, a: ends[0], b: ends[1] };
    }),
  });
}

export function addWire(c: Circuit): Circuit {
  if (c.wires.length >= MAX_WIRES) {
    throw new RangeError(`A circuit holds at most ${MAX_WIRES} wires`);
  }
  const used = new Set(c.wires.map((w) => w.colorSlot));
  const slot = [1, 2, 3, 4, 5].find((s) => !used.has(s))!;
  const wire: Wire = { id: `w${slot}-${newOpId()}`, name: `q${slot}`, colorSlot: slot, start: "|0⟩" };
  return { ...c, wires: [...c.wires, wire].sort((a, b) => a.colorSlot - b.colorSlot) };
}

/** Remove a wire and every operation that touches it. */
export function removeWire(c: Circuit, id: string): Circuit {
  if (c.wires.length <= 1) {
    throw new RangeError("A circuit needs at least one wire");
  }
  return compact({ wires: c.wires.filter((w) => w.id !== id), ops: c.ops.filter((op) => !opWires(op).includes(id)) });
}

export function setStart(c: Circuit, id: string, start: string): Circuit {
  if (!NAMED_STATES.some((s) => s.label === start)) {
    throw new RangeError("Unknown starting state");
  }
  return { ...c, wires: c.wires.map((w) => (w.id === id ? { ...w, start } : w)) };
}

function checkWires(c: Circuit, op: Op) {
  const ids = opWires(op);
  if (!ids.every((id) => c.wires.some((w) => w.id === id)) || new Set(ids).size !== ids.length) {
    throw new RangeError("An operation needs existing, different wires");
  }
}

// --- Running ------------------------------------------------------------------------------------

/** A run of a circuit: the state after each column, with measurement outcomes chosen once. */
export interface Run {
  readonly circuit: Circuit;
  /** snapshots[k] is the register after k columns; snapshots[0] is the start. */
  readonly snapshots: readonly Register[];
  /** Each measurement's outcome, by operation id. */
  readonly outcomes: ReadonlyMap<string, 0 | 1>;
}

function startRegister(c: Circuit): Register {
  return Register.product(c.wires.map((w) => (NAMED_STATES.find((s) => s.label === w.start) ?? NAMED_STATES[0]).state));
}

/** One operation on a register, a fraction `s` of the way (s = 1 is the whole operation). */
function applyOp(c: Circuit, r: Register, op: Op, s: number, outcomes: ReadonlyMap<string, 0 | 1>): Register {
  const w = (id: string) => c.wires.findIndex((wire) => wire.id === id);
  switch (op.kind) {
    case "gate": {
      const gate = tileGate(op.tile);
      return r.apply(s >= 1 ? gate : gate.power(s), w(op.wire));
    }
    case "cnot":
      return r.applyControlled(s >= 1 ? Gate.X : Gate.X.power(s), w(op.control), w(op.target));
    case "cz":
      return r.applyControlled(s >= 1 ? Gate.Z : Gate.Z.power(s), w(op.a), w(op.b));
    case "swap":
      return r.applyTwo(swapPower(Math.min(s, 1)), w(op.a), w(op.b));
    case "measure": {
      const outcome = outcomes.get(op.id);
      // A measurement is instant: the state snaps halfway through its step.
      return s >= 0.5 && outcome !== undefined ? r.collapse(w(op.wire), outcome) : r;
    }
  }
}

/** Run a circuit, choosing each measurement's outcome with `random` (0 ≤ random() < 1). */
export function run(c: Circuit, random: () => number): Run {
  const outcomes = new Map<string, 0 | 1>();
  const snapshots = [startRegister(c)];
  for (const column of columns(c)) {
    let r = snapshots[snapshots.length - 1];
    for (const op of column) {
      if (op.kind === "measure") {
        const wire = c.wires.findIndex((x) => x.id === op.wire);
        outcomes.set(op.id, random() < r.probabilityOfOne(wire) ? 1 : 0);
      }
      r = applyOp(c, r, op, 1, outcomes);
    }
    snapshots.push(r);
  }
  return { circuit: c, snapshots, outcomes };
}

/** The register at time t (in columns, 0 to the number of columns), exact partway through a column too. */
export function registerAt(run: Run, t: number): Register {
  const last = run.snapshots.length - 1;
  const time = Math.min(Math.max(t, 0), last);
  const k = Math.ceil(time);
  const s = k === 0 ? 1 : time - (k - 1);
  if (s >= 1) {
    return run.snapshots[k];
  }
  return columns(run.circuit)[k - 1].reduce((r, op) => applyOp(run.circuit, r, op, s, run.outcomes), run.snapshots[k - 1]);
}

/** Each wire's Bloch vector at time t (shorter than 1 when the wire is entangled). */
export function blochAt(run: Run, t: number): Vec3[] {
  const r = registerAt(run, t);
  return run.circuit.wires.map((_, i) => r.bloch(i));
}

/** What a two-qubit gate does at its column (design-gates.md §4.5), for its caption. */
export type TwoQubitEffect =
  | { kind: "nothing"; because: string } // a control (or CZ end) is |0⟩
  | { kind: "flip"; because: string; on: string } // a control is |1⟩: X on the target (CNOT) or Z on the other (CZ)
  | { kind: "entangles" }
  | { kind: "untangles" }
  | { kind: "unchanged" } // in a superposition, but entanglement doesn't change
  | { kind: "swap" };

const certain = 1e-9;

export function twoQubitEffect(run: Run, op: TwoQubitOp): TwoQubitEffect {
  const c = run.circuit;
  const name = (id: string) => c.wires.find((w) => w.id === id)!.name;
  const index = (id: string) => c.wires.findIndex((w) => w.id === id);
  if (op.kind === "swap") {
    return { kind: "swap" };
  }
  const before = run.snapshots[op.col];
  const after = run.snapshots[op.col + 1];
  const [first, second] = opWires(op);
  // A CNOT is controlled by its first wire; a CZ by either.
  const controls = op.kind === "cnot" ? [first] : [first, second];
  for (const control of controls) {
    const p1 = before.probabilityOfOne(index(control));
    if (p1 < certain) {
      return { kind: "nothing", because: name(control) };
    }
  }
  for (const control of controls) {
    if (before.probabilityOfOne(index(control)) > 1 - certain) {
      const other = control === first ? second : first;
      return { kind: "flip", because: name(control), on: name(other) };
    }
  }
  const lengths = (r: Register) => [first, second].map((id) => length(r.bloch(index(id))));
  const [b1, b2] = lengths(before);
  const [a1, a2] = lengths(after);
  if (a1 < b1 - 1e-6 || a2 < b2 - 1e-6) {
    return { kind: "entangles" };
  }
  if (a1 > b1 + 1e-6 || a2 > b2 + 1e-6) {
    return { kind: "untangles" };
  }
  return { kind: "unchanged" };
}

/**
 * Many runs, counting the measured bit strings (wires in order). Without any measurement, every wire
 * is measured at the end.
 */
export function shots(c: Circuit, count: number, random: () => number): Map<string, number> {
  const measured = c.wires.filter((w) => c.ops.some((op) => op.kind === "measure" && op.wire === w.id));
  const counts = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const r = run(c, random);
    let bits: string;
    if (measured.length > 0) {
      bits = measured
        .map((w) => {
          const last = [...c.ops].reverse().find((op) => op.kind === "measure" && op.wire === w.id)!;
          return String(r.outcomes.get(last.id));
        })
        .join("");
    } else {
      const p = r.snapshots[r.snapshots.length - 1].probabilities();
      let x = random();
      let index = p.findIndex((v) => (x -= v) < 0);
      if (index < 0) index = p.length - 1;
      bits = index.toString(2).padStart(c.wires.length, "0");
    }
    counts.set(bits, (counts.get(bits) ?? 0) + 1);
  }
  return counts;
}

/** The wires a shot reports, in order. */
export function shotWires(c: Circuit): Wire[] {
  const measured = c.wires.filter((w) => c.ops.some((op) => op.kind === "measure" && op.wire === w.id));
  return measured.length > 0 ? measured : [...c.wires];
}

// --- JSON (session and saved circuits; validated on load) ---------------------------------------

export function saveCircuit(c: Circuit): unknown {
  return {
    version: 1,
    wires: c.wires,
    ops: c.ops.map((op) => (op.kind === "gate" ? { ...op, tile: saveTiles([op.tile])[0] } : op)),
  };
}

export function loadCircuit(data: unknown): Circuit {
  const d = data as Record<string, unknown>;
  if (typeof d !== "object" || d === null || d.version !== 1 || !Array.isArray(d.wires) || !Array.isArray(d.ops)) {
    throw new Error("Not a circuit");
  }
  const wires = (d.wires as unknown[]).map((x) => {
    const w = x as Record<string, unknown>;
    const slot = w.colorSlot;
    if (
      typeof w.id !== "string" ||
      w.id.length > 64 ||
      !Number.isInteger(slot) ||
      (slot as number) < 1 ||
      (slot as number) > MAX_WIRES ||
      w.name !== `q${slot}` ||
      !NAMED_STATES.some((s) => s.label === w.start)
    ) {
      throw new Error("Invalid wire");
    }
    return { id: w.id, name: w.name, colorSlot: slot as number, start: w.start as string };
  });
  if (wires.length < 1 || wires.length > MAX_WIRES || new Set(wires.map((w) => w.id)).size !== wires.length || new Set(wires.map((w) => w.colorSlot)).size !== wires.length) {
    throw new Error("Invalid wires");
  }
  if ((d.ops as unknown[]).length > MAX_OPS) {
    throw new Error("Too many operations");
  }
  let c: Circuit = { wires, ops: [] };
  for (const x of d.ops as unknown[]) {
    const o = x as Record<string, unknown>;
    const col = Number.isInteger(o.col) && (o.col as number) >= 0 ? (o.col as number) : NaN;
    if (Number.isNaN(col)) throw new Error("Invalid column");
    const id = newOpId();
    let op: Op;
    switch (o.kind) {
      case "gate":
        op = { id, col, kind: "gate", wire: String(o.wire), tile: loadTiles([o.tile])[0] };
        break;
      case "measure":
        op = { id, col, kind: "measure", wire: String(o.wire) };
        break;
      case "cnot":
        op = { id, col, kind: "cnot", control: String(o.control), target: String(o.target) };
        break;
      case "cz":
      case "swap":
        op = { id, col, kind: o.kind, a: String(o.a), b: String(o.b) };
        break;
      default:
        throw new Error("Unknown operation");
    }
    c = place(c, op);
  }
  return c;
}
