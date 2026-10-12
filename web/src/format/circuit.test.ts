import { describe, expect, it } from "vitest";
import { Qubit } from "../math/qubit";
import { basisLabel, effectText, wireStateText } from "./circuit";

describe("effectText", () => {
  it.each([
    [{ kind: "nothing", because: "q3" } as const, "cnot" as const, "q3 is |0⟩ here, so this CNOT does nothing."],
    [{ kind: "flip", because: "q1", on: "q2" } as const, "cnot" as const, "q1 is |1⟩ here, so this CNOT just flips q2."],
    [{ kind: "flip", because: "q1", on: "q2" } as const, "cz" as const, "q1 is |1⟩ here, so this CZ just applies Z to q2."],
    [{ kind: "entangles" } as const, "cnot" as const, "q1 is in a superposition, so this CNOT entangles q1 and q2."],
    [{ kind: "untangles" } as const, "cnot" as const, "This CNOT undoes the entanglement between q1 and q2."],
    [{ kind: "swap" } as const, "swap" as const, "Swaps the states of q1 and q2."],
  ])("%j", (effect, kind, text) => {
    expect(effectText(effect, kind, "q1", "q2")).toBe(text);
  });
});

describe("wireStateText", () => {
  it("names axis states, gives angles otherwise, and says when a wire is entangled", () => {
    expect(wireStateText(Qubit.PLUS_I.blochVector())).toBe("|+i⟩");
    expect(wireStateText(Qubit.fromBlochAngles(Math.PI / 4, Math.PI / 2).blochVector())).toBe("θ 45° · φ 90°");
    expect(wireStateText([0, 0, 0])).toBe("entangled");
    expect(wireStateText([0, 0, 0.5])).toBe("entangled · 50%");
  });

  it("labels basis states with q1's bit first", () => {
    expect(basisLabel(6, 4)).toBe("|0110⟩");
    expect(basisLabel(0, 2)).toBe("|00⟩");
  });
});
