import { describe, expect, it } from "vitest";
import { Complex } from "../math/complex";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { coordinateText, degreesText, percentText } from "./angles";
import { gateLearnPath, gateListText } from "./gateNames";
import { complexTexSigned } from "./exact";
import { canonical, columnTex, ketTex, stateName, stateText } from "./ket";
import { parseComplex } from "./parse";

const S2 = "\\tfrac{1}{\\sqrt{2}}";

describe("complexTexSigned", () => {
  it.each([
    [new Complex(0, 0), "0"],
    [new Complex(1, 0), "1"],
    [new Complex(-1, 0), "-1"],
    [new Complex(Math.SQRT1_2, 0), S2],
    [new Complex(-Math.SQRT1_2, 0), `-${S2}`],
    [new Complex(0, 1), "i"],
    [new Complex(0, -1), "-i"],
    [new Complex(0, Math.SQRT1_2), `${S2}\\,i`],
    [Complex.polar(1, Math.PI / 4), "e^{i\\pi/4}"],
    [Complex.polar(1, -Math.PI / 4), "e^{-i\\pi/4}"],
    [Complex.polar(Math.SQRT1_2, (3 * Math.PI) / 4), `${S2}\\,e^{3i\\pi/4}`],
    [Complex.polar(0.5, Math.PI / 3), "\\tfrac{1}{2}\\,e^{i\\pi/3}"],
    [Complex.polar(1, Math.PI / 8), "e^{i\\pi/8}"],
    [Complex.polar(1, (-7 * Math.PI) / 24), "e^{-7i\\pi/24}"],
    [new Complex(0.3, 0), "0.300"],
    [new Complex(0.3, -0.4), "0.300 - 0.400\\,i"],
  ])("%s → %s", (z, expected) => {
    expect(complexTexSigned(z)).toBe(expected);
  });
});

describe("kets", () => {
  it.each([
    [Qubit.ZERO, "|0\\rangle"],
    [Qubit.ONE, "|1\\rangle"],
    [Qubit.PLUS, `${S2}|0\\rangle + ${S2}|1\\rangle`],
    [Qubit.MINUS, `${S2}|0\\rangle - ${S2}|1\\rangle`],
    [Qubit.MINUS_I, `${S2}|0\\rangle - ${S2}\\,i|1\\rangle`],
    [Gate.T.apply(Qubit.PLUS), `${S2}|0\\rangle + ${S2}\\,e^{i\\pi/4}|1\\rangle`],
    // Y|0⟩ = i|1⟩: same point on the sphere as |1⟩, so the canonical form is |1⟩.
    [Gate.Y.apply(Qubit.ZERO), "|1\\rangle"],
  ])("ket %#", (q, expected) => {
    expect(ketTex(q)).toBe(expected);
  });

  it("parenthesizes decimal complex coefficients", () => {
    expect(ketTex(new Qubit(0.6, new Complex(0.48, 0.64)))).toBe("0.600|0\\rangle + \\left(0.480 + 0.640\\,i\\right)|1\\rangle");
  });

  it("removes the global phase", () => {
    const q = canonical(new Qubit(new Complex(0, Math.SQRT1_2), new Complex(-Math.SQRT1_2, 0)));
    expect(q.a.im).toBeCloseTo(0, 12);
    expect(q.a.re).toBeGreaterThan(0);
    expect(columnTex(Qubit.PLUS)).toBe(`\\begin{bmatrix} ${S2} \\\\ ${S2} \\end{bmatrix}`);
  });

  it("names the six axis states, ignoring global phase", () => {
    expect(stateName(Gate.Y.apply(Qubit.ZERO))).toBe("|1⟩");
    expect(stateName(Gate.S.apply(Qubit.PLUS))).toBe("|+i⟩");
    expect(stateName(Qubit.fromBlochAngles(1, 1))).toBeNull();
  });

  it("writes a state as its name, or else its angles", () => {
    expect(stateText(Qubit.MINUS)).toBe("|−⟩");
    expect(stateText(Qubit.fromBlochAngles(Math.PI / 4, Math.PI / 2))).toBe("θ 45° · φ 90°");
  });
});

describe("numbers", () => {
  it.each([
    [Math.PI / 2, "90°"],
    [Math.PI / 8, "22.5°"],
    [2 * Math.PI - 1e-12, "0°"],
    [-1e-12, "0°"],
  ])("degreesText(%f) = %s", (radians, expected) => {
    expect(degreesText(radians)).toBe(expected);
  });

  it("formats coordinates and percentages", () => {
    expect(coordinateText(-1e-9)).toBe("0.000");
    expect(coordinateText(0.70710678)).toBe("0.707");
    expect(percentText(0.5)).toBe("50%");
    expect(percentText(0.1464466)).toBe("14.6%");
  });
});

describe("parseComplex", () => {
  it.each([
    ["0.6", [0.6, 0]],
    ["-1", [-1, 0]],
    [".5", [0.5, 0]],
    ["i", [0, 1]],
    ["-i", [0, -1]],
    ["0.8i", [0, 0.8]],
    ["1+2i", [1, 2]],
    ["0.5 - 0.5i", [0.5, -0.5]],
    ["1-i", [1, -1]],
    ["2j", [0, 2]],
    ["1e-3", [0.001, 0]],
    ["−0.5", [-0.5, 0]],
  ])("%s", (text, [re, im]) => {
    const z = parseComplex(text)!;
    expect(z.re).toBeCloseTo(re, 12);
    expect(z.im).toBeCloseTo(im, 12);
  });

  it.each(["", "abc", "1/2", "sqrt(2)", "1e999", "nan", "Infinity", "2+", "i i", "alert(1)"])("rejects %j", (text) => {
    expect(parseComplex(text)).toBeNull();
  });
});

describe("gate names", () => {
  it("lists gates in words", () => {
    expect(gateListText(["S"])).toBe("S");
    expect(gateListText(["H", "S"])).toBe("H and S");
    expect(gateListText(["X", "Y", "Z", "H"], "or")).toBe("X, Y, Z or H");
  });

  it("points each gate to its Learn page", () => {
    expect(gateLearnPath("H")).toBe("learn/gates/hadamard/");
    expect(gateLearnPath("T†")).toBe("learn/gates/s-and-t/");
    expect(gateLearnPath("Ry(22.5°)")).toBe("learn/gates/rotation-gates/");
    expect(gateLearnPath("V")).toBeNull();
  });
});
