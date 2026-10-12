import { describe, expect, it } from "vitest";
import { Gate } from "../math/gate";
import { tile, type BenchBuiltin } from "../model/bench";
import { loadLibrary, saveLibrary, type SavedGate } from "../model/library";
import { formulaTex, formulaText, powerText, tileTex, tileText } from "./bench";
import { findEquivalent } from "./equivalence";

const b = (name: BenchBuiltin, power = 1) => tile({ kind: "builtin", name }, power);

describe("tile labels", () => {
  it.each([
    [1, ""],
    [-1, "†"],
    [2, "²"],
    [12, "¹²"],
    [-2, "†²"],
    [0.5, "½"],
    [-0.25, "†¼"],
    [0.37, "^0.37"],
  ])("power %f → %j", (p, text) => {
    expect(powerText(p)).toBe(text);
  });

  it("names rotations and groups", () => {
    expect(tileText(tile({ kind: "rotation", axis: [1, 0, 0], angle: Math.PI / 4 }))).toBe("Rx(45°)");
    expect(tileText(tile({ kind: "rotation", axis: [0, Math.SQRT1_2, Math.SQRT1_2], angle: Math.PI / 2 }))).toBe("R(90°)");
    expect(tileText(tile({ kind: "group", tiles: [b("H"), b("T")] }, 2))).toBe("(H T)²");
  });

  it("writes the product in math order", () => {
    // Time order H, then T, then S† → S† · T · H
    const bench = [b("H"), b("T"), b("S", -1)];
    expect(formulaText(bench)).toBe("S† · T · H");
    expect(formulaTex(bench)).toBe("S^{\\dagger} \\cdot T \\cdot H");
    expect(formulaTex([])).toBe("I");
    expect(tileTex(b("X", 0.5))).toBe("X^{1/2}");
    expect(tileTex(tile({ kind: "rotation", axis: [0, 0, 1], angle: Math.PI / 2 }, 2))).toBe("{R_{z}(90^\\circ)}^{2}");
  });
});

describe("findEquivalent", () => {
  it("recognizes built-ins, with the global phase", () => {
    expect(findEquivalent(Gate.mult(Gate.mult(Gate.H, Gate.Z), Gate.H))?.name).toBe("X");
    const minusX = findEquivalent(Gate.mult(Gate.Y, Gate.mult(Gate.X, Gate.Y)))!;
    expect(minusX.name).toBe("X");
    expect(minusX.phase.re).toBeCloseTo(-1, 10);
    expect(findEquivalent(Gate.T.power(8))?.name).toBe("I");
    expect(findEquivalent(Gate.X.power(0.5))?.name).toBe("√X");
  });

  it("recognizes rotations about x, y, z by multiples of 7.5°", () => {
    expect(findEquivalent(Gate.mult(Gate.mult(Gate.H, Gate.T), Gate.H))?.name).toBe("Rx(45°)");
    expect(findEquivalent(Gate.ry(-Math.PI / 3))?.name).toBe("Ry(−60°)");
    expect(findEquivalent(Gate.rx(1))).toBeNull();
  });

  it("checks saved gates too", () => {
    const v = Gate.mult(Gate.H, Gate.S);
    expect(findEquivalent(v, [{ name: "Vee", gate: v }])?.name).toBe("Vee");
  });
});

describe("library JSON", () => {
  const gates: SavedGate[] = [
    { id: "g1", name: "Vee", label: "V", pinned: true, tiles: [b("H"), b("T"), b("H")] },
    { id: "g2", name: "Half X", label: "√X", pinned: false, tiles: [b("X", 0.5)] },
  ];

  it("round-trips", () => {
    const loaded = loadLibrary(JSON.parse(JSON.stringify(saveLibrary(gates))));
    expect(loaded.map((g) => [g.id, g.name, g.label, g.pinned, formulaText(g.tiles)])).toEqual([
      ["g1", "Vee", "V", true, "H · T · H"],
      ["g2", "Half X", "√X", false, "X½"],
    ]);
  });

  it("skips bad entries and keeps the rest", () => {
    const data = JSON.parse(JSON.stringify(saveLibrary(gates)));
    data.gates[0].label = "TOO LONG";
    expect(loadLibrary(data).map((g) => g.id)).toEqual(["g2"]);
    expect(() => loadLibrary({ version: 2, gates: [] })).toThrow();
  });
});
