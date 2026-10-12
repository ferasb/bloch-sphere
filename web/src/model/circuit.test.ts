import { describe, expect, it } from "vitest";
import { rng } from "../math/testing";
import { length } from "../math/vec3";
import { tile, type BenchBuiltin } from "./bench";
import {
  addWire,
  blochAt,
  columns,
  emptyCircuit,
  loadCircuit,
  moveOp,
  newOpId,
  place,
  reconnect,
  removeOp,
  removeWire,
  run,
  saveCircuit,
  setStart,
  shots,
  twoQubitEffect,
  type Circuit,
  type TwoQubitOp,
} from "./circuit";

const gate = (wire: string, name: BenchBuiltin, col = 99, power = 1) => ({ id: newOpId(), col, kind: "gate" as const, wire, tile: tile({ kind: "builtin", name }, power) });
const cnot = (control: string, target: string, col = 99) => ({ id: newOpId(), col, kind: "cnot" as const, control, target });
const measure = (wire: string, col = 99) => ({ id: newOpId(), col, kind: "measure" as const, wire });

function circuit(n: number): Circuit {
  let c = emptyCircuit();
  while (c.wires.length < n) c = addWire(c);
  return c;
}
const w = (c: Circuit, i: number) => c.wires[i].id;

describe("layout", () => {
  it("slides operations left into the earliest free column", () => {
    let c = circuit(2);
    c = place(c, gate(w(c, 0), "H"));
    c = place(c, gate(w(c, 1), "X"));
    c = place(c, gate(w(c, 0), "T"));
    expect(columns(c).map((col) => col.length)).toEqual([2, 1]);
  });

  it("a two-qubit gate takes every row between its ends", () => {
    let c = circuit(3);
    c = place(c, cnot(w(c, 0), w(c, 2)));
    c = place(c, gate(w(c, 1), "H"));
    expect(c.ops.find((op) => op.kind === "gate")!.col).toBe(1);
  });

  it("dropping at col − ½ inserts before what's there", () => {
    let c = circuit(1);
    c = place(c, gate(w(c, 0), "H"));
    c = place(c, gate(w(c, 0), "X", -0.5));
    const colOf = (name: string) => c.ops.find((op) => op.kind === "gate" && op.tile.gate.kind === "builtin" && op.tile.gate.name === name)!.col;
    expect(colOf("X")).toBe(0);
    expect(colOf("H")).toBe(1);
  });

  it("moves, removes, reconnects, and drops a wire's operations with it", () => {
    let c = circuit(3);
    const h = gate(w(c, 0), "H");
    const cx = cnot(w(c, 0), w(c, 1));
    c = place(place(c, h), cx);
    c = moveOp(c, h.id, 0, w(c, 2));
    expect(c.ops.find((op) => op.id === h.id)).toMatchObject({ wire: w(c, 2), col: 0 });
    c = reconnect(c, cx.id, "second", w(c, 2));
    expect(c.ops.find((op) => op.id === cx.id)).toMatchObject({ control: w(c, 0), target: w(c, 2) });
    c = reconnect(c, cx.id, "first", w(c, 2)); // picking the other end's wire swaps the ends
    expect(c.ops.find((op) => op.id === cx.id)).toMatchObject({ control: w(c, 2), target: w(c, 0) });
    c = removeOp(c, h.id);
    expect(c.ops).toHaveLength(1);
    c = removeWire(c, w(c, 2));
    expect(c.ops).toHaveLength(0);
  });

  it("refuses operations on missing or repeated wires", () => {
    const c = circuit(2);
    expect(() => place(c, cnot(w(c, 0), w(c, 0)))).toThrow(RangeError);
    expect(() => place(c, gate("nope", "X"))).toThrow(RangeError);
  });
});

describe("running", () => {
  it("makes a Bell pair, and its arrows vanish partway in", () => {
    let c = circuit(2);
    c = place(place(c, gate(w(c, 0), "H")), cnot(w(c, 0), w(c, 1)));
    const r = run(c, Math.random);
    expect(blochAt(r, 1).map((v) => length(v))).toEqual([expect.closeTo(1, 10), expect.closeTo(1, 10)]);
    const halfway = length(blochAt(r, 1.5)[0]);
    expect(halfway).toBeGreaterThan(0.1);
    expect(halfway).toBeLessThan(0.9);
    expect(length(blochAt(r, 2)[0])).toBeCloseTo(0, 10);
  });

  it("explains what each CNOT does", () => {
    let c = circuit(2);
    const idle = cnot(w(c, 0), w(c, 1));
    const h = gate(w(c, 0), "H");
    const entangle = cnot(w(c, 0), w(c, 1));
    const undo = cnot(w(c, 0), w(c, 1));
    c = place(place(place(place(c, idle), h), entangle), undo);
    const r = run(c, Math.random);
    const effect = (op: TwoQubitOp) => twoQubitEffect(r, c.ops.find((o) => o.id === op.id) as TwoQubitOp).kind;
    expect(effect(idle)).toBe("nothing");
    expect(effect(entangle)).toBe("entangles");
    expect(effect(undo)).toBe("untangles");

    const flipped = setStart(circuit(2), "w1", "|1⟩");
    const flip = cnot("w1", "w2");
    const r2 = run(place(flipped, flip), Math.random);
    expect(twoQubitEffect(r2, r2.circuit.ops[0] as TwoQubitOp)).toEqual({ kind: "flip", because: "q1", on: "q2" });
  });

  it("measuring one half of a Bell pair decides the other", () => {
    let c = circuit(2);
    c = place(place(place(c, gate(w(c, 0), "H")), cnot(w(c, 0), w(c, 1))), measure(w(c, 0)));
    const counts = shots(place(c, measure(w(c, 1))), 400, rng(7));
    expect([...counts.keys()].sort()).toEqual(["00", "11"]);
    expect(counts.get("00")! + counts.get("11")!).toBe(400);
  });

  it("without measurements, shots measure every wire at the end", () => {
    let c = circuit(2);
    c = place(c, gate(w(c, 1), "X"));
    expect([...shots(c, 50, rng(1))]).toEqual([["01", 50]]);
  });
});

describe("JSON", () => {
  it("round-trips", () => {
    let c = setStart(circuit(3), "w2", "|+i⟩");
    c = place(place(place(c, gate(w(c, 0), "T", 99, -1)), cnot(w(c, 2), w(c, 0))), measure(w(c, 1)));
    c = place(c, { id: newOpId(), col: 99, kind: "swap", a: w(c, 0), b: w(c, 1) });
    const loaded = loadCircuit(JSON.parse(JSON.stringify(saveCircuit(c))));
    expect(loaded.wires).toEqual(c.wires);
    expect(loaded.ops.map((op) => [op.kind, op.col])).toEqual(c.ops.map((op) => [op.kind, op.col]));
  });

  it.each([
    ["not a circuit", { version: 2 }],
    ["a wire with the wrong name", { version: 1, wires: [{ id: "a", name: "q3", colorSlot: 1, start: "|0⟩" }], ops: [] }],
    ["an operation on a missing wire", { version: 1, wires: [{ id: "a", name: "q1", colorSlot: 1, start: "|0⟩" }], ops: [{ kind: "measure", col: 0, wire: "b" }] }],
  ])("rejects %s", (_, data) => {
    expect(() => loadCircuit(data)).toThrow();
  });
});
