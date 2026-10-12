import { describe, expect, it } from "vitest";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { loadTiles, product, reversed, saveTiles, scaleBench, scaleTile, tile, tileFromSpec, undoBench, type BenchBuiltin } from "./bench";

const b = (name: BenchBuiltin, power = 1) => tile({ kind: "builtin", name }, power);

describe("product", () => {
  it("is the identity for an empty bench", () => {
    expect(product([]).equalsUpToPhase(Gate.I)).toBe(true);
  });

  it("applies tiles in time order", () => {
    // H then S takes |0⟩ to |+i⟩; S then H takes it to |+⟩.
    expect(product([b("H"), b("S")]).apply(Qubit.ZERO).isEquivalent(Qubit.PLUS_I)).toBe(true);
    expect(product([b("S"), b("H")]).apply(Qubit.ZERO).isEquivalent(Qubit.PLUS)).toBe(true);
  });

  it("collapses H·T·H into one 45° rotation about x", () => {
    expect(product([b("H"), b("T"), b("H")]).equalsUpToPhase(Gate.rx(Math.PI / 4))).toBe(true);
  });

  it("raises tiles to their power", () => {
    expect(product([b("T", 2)]).equalsUpToPhase(Gate.S)).toBe(true);
    expect(product([b("S", -1)]).equalsUpToPhase(Gate.S_DAG)).toBe(true);
    expect(product([b("X", 0.5), b("X", 0.5)]).equalsUpToPhase(Gate.X)).toBe(true);
  });
});

describe("operations", () => {
  it("undoing the bench reverses it and undoes each tile", () => {
    const bench = [b("H"), b("T"), b("S")];
    const undone = undoBench(bench);
    expect(undone.map((t) => [t.gate.kind === "builtin" && t.gate.name, t.power])).toEqual([
      ["S", -1],
      ["T", -1],
      ["H", -1],
    ]);
    expect(product([...bench, ...undone]).equalsUpToPhase(Gate.I)).toBe(true);
  });

  it("scales one tile, or groups several", () => {
    expect(scaleTile(b("T"), 2).power).toBe(2);
    expect(scaleTile(scaleTile(b("X"), 1 / 3), 3).power).toBe(1);
    const grouped = scaleBench([b("H"), b("T")], 2);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].gate.kind).toBe("group");
    expect(product(grouped).equalsUpToPhase(product([b("H"), b("T"), b("H"), b("T")]))).toBe(true);
  });

  it("reverses without undoing", () => {
    expect(product(reversed([b("H"), b("S")])).equalsUpToPhase(product([b("S"), b("H")]))).toBe(true);
  });

  it("turns main-room gate specs into tiles", () => {
    expect(tileFromSpec({ name: "T†" }).power).toBe(-1);
    expect(product([tileFromSpec({ name: "Ry", angle: 1 })]).equalsUpToPhase(Gate.ry(1))).toBe(true);
  });
});

describe("JSON", () => {
  it("round-trips every kind of tile", () => {
    const saved = tile({ kind: "saved", name: "Vee", label: "V", tiles: [b("H"), b("T"), b("H")] });
    const bench = [
      b("S", -1),
      tile({ kind: "rotation", axis: [0, Math.SQRT1_2, Math.SQRT1_2], angle: 0.7 }, 0.5),
      tile({ kind: "fixed", label: "M", gate: Gate.mult(Gate.H, Gate.S) }),
      saved,
      tile({ kind: "group", tiles: [b("H"), saved] }, 2),
    ];
    const loaded = loadTiles(JSON.parse(JSON.stringify(saveTiles(bench))));
    expect(product(loaded).equalsUpToPhase(product(bench))).toBe(true);
  });

  it.each([
    ["not a list", { a: 1 }],
    ["an unknown builtin", [{ gate: { kind: "builtin", name: "Q" }, power: 1 }]],
    ["a non-unit axis", [{ gate: { kind: "rotation", axis: [1, 1, 0], angle: 1 }, power: 1 }]],
    ["a non-unitary matrix", [{ gate: { kind: "fixed", label: "M", matrix: [1, 0, 1, 0, 0, 0, 1, 0] }, power: 1 }]],
    ["a huge power", [{ gate: { kind: "builtin", name: "X" }, power: 1e9 }]],
    ["nesting too deep", [{ gate: { kind: "group", tiles: [{ gate: { kind: "group", tiles: [{ gate: { kind: "group", tiles: [{ gate: { kind: "group", tiles: [{ gate: { kind: "group", tiles: [] }, power: 1 }] }, power: 1 }] }, power: 1 }] }, power: 1 }] }, power: 1 }]],
  ])("rejects %s", (_, data) => {
    expect(() => loadTiles(data)).toThrow();
  });
});
