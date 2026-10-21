import { describe, expect, it } from "vitest";
import { Gate } from "../math/gate";
import { keyStateMoves, labelTex, matrixTex, phaseFactorTex } from "./gateFacts";

describe("keyStateMoves", () => {
  it("names where X sends each axis state, with the global phase in front", () => {
    expect(keyStateMoves(Gate.X).map(({ from, tex, motion }) => [from, tex, motion])).toEqual([
      ["|0⟩", "|{1}\\rangle", "+z → −z"],
      ["|1⟩", "|{0}\\rangle", "−z → +z"],
      ["|+⟩", "|{+}\\rangle", "stays put"],
      ["|−⟩", "-|{-}\\rangle", "stays put"],
      ["|+i⟩", "i|{-i}\\rangle", "+y → −y"],
      ["|−i⟩", "-i|{+i}\\rangle", "−y → +y"],
    ]);
  });

  it("shows H's phase on |+i⟩ exactly", () => {
    const plusI = keyStateMoves(Gate.H)[4];
    expect(plusI.to).toBe("|−i⟩");
    expect(plusI.tex).toBe("e^{i\\pi/4}|{-i}\\rangle");
  });

  it("writes states off the axes as kets, global phase kept", () => {
    const plus = keyStateMoves(Gate.T)[2];
    expect(plus.to).toBeNull();
    expect(plus.tex).toBe("\\tfrac{1}{\\sqrt{2}}|0\\rangle + \\tfrac{1}{\\sqrt{2}}\\,e^{i\\pi/4}|1\\rangle");
    expect(plus.motion).toBe("to θ 90°, φ 45°");
  });
});

describe("gate formulas", () => {
  it("writes matrices with exact entries", () => {
    expect(matrixTex(Gate.H)).toBe("\\begin{bmatrix} \\tfrac{1}{\\sqrt{2}} & \\tfrac{1}{\\sqrt{2}} \\\\ \\tfrac{1}{\\sqrt{2}} & -\\tfrac{1}{\\sqrt{2}} \\end{bmatrix}");
  });

  it("finds the global phase between a gate and its rotation", () => {
    expect(phaseFactorTex(Gate.X, Gate.rx(Math.PI))).toBe("i");
    expect(phaseFactorTex(Gate.S, Gate.rz(Math.PI / 2))).toBe("e^{i\\pi/4}");
    expect(phaseFactorTex(Gate.T, Gate.rz(Math.PI / 4))).toBe("e^{i\\pi/8}");
    expect(phaseFactorTex(Gate.X, Gate.ry(Math.PI))).toBeNull();
  });

  it("braces axis-state labels so their signs aren't spaced as operators", () => {
    expect(labelTex("|−i⟩")).toBe("|{-i}\\rangle");
  });
});
