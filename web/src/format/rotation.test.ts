import { describe, expect, it } from "vitest";
import { describeGate, gateName } from "./gateNames";
import { onAxisNote, rotationText } from "./rotation";
import { Gate } from "../math/gate";

describe("onAxisNote", () => {
  it("speaks up when the arrow sits on the axis, either end", () => {
    expect(onAxisNote("q1", [0, 0, 1], [0, 0, 1], Math.PI / 2)).toBe("q1 lies on the rotation axis, so its arrow doesn't move.");
    expect(onAxisNote("q1", [0, 0, -1], [0, 0, 1], Math.PI / 2)).not.toBeNull();
  });

  it("stays quiet when the arrow moves", () => {
    expect(onAxisNote("q1", [1, 0, 0], [0, 0, 1], Math.PI / 2)).toBeNull();
    expect(onAxisNote("q1", [0, 0, 1], [0, 0, 1], 0)).toBeNull();
  });
});

describe("rotationText", () => {
  it.each([
    [Gate.X, "180° about x"],
    [Gate.H, "180° about the x+z diagonal"],
    [Gate.T, "45° about z"],
    [Gate.S_DAG, "90° about −z"],
    [Gate.mult(Gate.S, Gate.H), "120° about the −x−y−z diagonal"],
    [Gate.I, "no rotation"],
  ])("%s", (gate, expected) => {
    expect(rotationText(gate)).toBe(expected);
  });
});

describe("gate names", () => {
  it.each([
    ["X", Gate.X, "Pauli-X (X), the quantum NOT: 180° about x"],
    ["H", Gate.H, "Hadamard (H): 180° about the x+z diagonal"],
    ["T", Gate.T, "T gate (T), the π/8 gate, √S: 45° about z"],
    ["S†", Gate.S_DAG, "S-dagger (S†), undoes S: 90° about −z"],
    ["Rx(45°)", Gate.rx(Math.PI / 4), "X-rotation (Rx(45°)): 45° about x"],
    ["V", Gate.H, "V: 180° about the x+z diagonal"],
  ])("%s", (symbol, gate, expected) => {
    expect(describeGate(symbol, gate)).toBe(expected);
  });

  it("names the standard gates and nothing else", () => {
    expect(gateName("Y")).toBe("Pauli-Y");
    expect(gateName("Rz(90°)")).toBe("Z-rotation");
    expect(gateName("V")).toBeNull();
  });
});
