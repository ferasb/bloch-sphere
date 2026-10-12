import { describe, expect, it } from "vitest";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { expectVecClose } from "../math/testing";
import { rotate } from "../math/vec3";
import { MAX_QUBITS, Sphere, type Action } from "./sphere";

const gate = (name: "X" | "H" | "S" | "T", ...targets: string[]): Action => ({
  kind: "gate",
  gate: { name },
  targets: targets.length ? targets : ["1"],
});

describe("apply", () => {
  it("applies a gate to the target and records its rotation", () => {
    const s = Sphere.initial().apply(gate("H"));
    expect(s.qubit("1")!.state.isEquivalent(Qubit.PLUS)).toBe(true);
    const motion = s.last.motions.get("1");
    expect(motion?.kind).toBe("rotate");
    if (motion?.kind === "rotate") {
      expectVecClose(motion.axis, [Math.SQRT1_2, 0, Math.SQRT1_2]);
      expect(motion.angle).toBeCloseTo(Math.PI, 10);
    }
  });

  it("applies one gate to several targets in a single step", () => {
    const s = Sphere.initial()
      .apply({ kind: "addQubit", state: Qubit.ONE })
      .apply(gate("X", "1", "2"));
    expect(s.steps).toHaveLength(3);
    expect(s.qubit("1")!.state.isEquivalent(Qubit.ONE)).toBe(true);
    expect(s.qubit("2")!.state.isEquivalent(Qubit.ZERO)).toBe(true);
  });

  it("leaves untargeted qubits alone", () => {
    const s = Sphere.initial()
      .apply({ kind: "addQubit", state: Qubit.ZERO })
      .apply(gate("X", "2"));
    expect(s.qubit("1")!.state).toBe(Qubit.ZERO);
  });

  it("throws for an unknown target", () => {
    expect(() => Sphere.initial().apply(gate("X", "nope"))).toThrow();
  });

  it("does not change the original sphere", () => {
    const s = Sphere.initial();
    s.apply(gate("X"));
    expect(s.steps).toHaveLength(1);
    expect(s.qubit("1")!.state).toBe(Qubit.ZERO);
  });
});

describe("qubits", () => {
  it("gives each new qubit the first free color slot and a name from it", () => {
    const s = Sphere.initial()
      .apply({ kind: "addQubit", state: Qubit.ZERO })
      .apply({ kind: "addQubit", state: Qubit.ZERO });
    expect(s.qubits.map((q) => [q.id, q.name, q.colorSlot])).toEqual([
      ["1", "q1", 1],
      ["2", "q2", 2],
      ["3", "q3", 3],
    ]);
  });

  it("keeps colors stable when a qubit is removed, and reuses the freed slot with a new id", () => {
    const s = Sphere.initial()
      .apply({ kind: "addQubit", state: Qubit.ZERO })
      .apply({ kind: "addQubit", state: Qubit.ZERO })
      .apply({ kind: "removeQubit", target: "2" });
    expect(s.qubits.map((q) => [q.id, q.colorSlot])).toEqual([
      ["1", 1],
      ["3", 3],
    ]);
    const readded = s.apply({ kind: "addQubit", state: Qubit.ZERO });
    expect(readded.qubits.map((q) => [q.id, q.name])).toEqual([
      ["1", "q1"],
      ["4", "q2"],
      ["3", "q3"],
    ]);
  });

  it(`holds at most ${MAX_QUBITS} qubits and at least one`, () => {
    let s = Sphere.initial();
    for (let i = 1; i < MAX_QUBITS; i++) {
      s = s.apply({ kind: "addQubit", state: Qubit.ZERO });
    }
    expect(s.canAddQubit).toBe(false);
    expect(() => s.apply({ kind: "addQubit", state: Qubit.ZERO })).toThrow(RangeError);
    expect(() => Sphere.initial().apply({ kind: "removeQubit", target: "1" })).toThrow(RangeError);
  });
});

describe("undo and reset", () => {
  it("undo discards the last step and stops at the start", () => {
    const s = Sphere.initial().apply(gate("H")).apply(gate("S"));
    const once = s.undo();
    expect(once.steps).toHaveLength(2);
    expect(once.qubit("1")!.state.isEquivalent(Qubit.PLUS)).toBe(true);
    expect(once.undo().undo().steps).toHaveLength(1);
    expect(Sphere.initial().canUndo).toBe(false);
  });

  it("reset keeps the qubits, puts them at |0⟩ and clears the journey", () => {
    const s = Sphere.initial()
      .apply({ kind: "addQubit", state: Qubit.ONE })
      .apply(gate("H", "1"))
      .reset();
    expect(s.steps).toHaveLength(1);
    expect(s.qubits.map((q) => [q.id, q.name, q.colorSlot])).toEqual([
      ["1", "q1", 1],
      ["2", "q2", 2],
    ]);
    expect(s.qubits.every((q) => q.state === Qubit.ZERO)).toBe(true);
    // A qubit added after a reset still gets a fresh id.
    expect(s.apply({ kind: "addQubit", state: Qubit.ZERO }).qubits.at(-1)!.id).toBe("3");
  });
});

describe("setStartState", () => {
  const journey = Sphere.initial()
    .apply({ kind: "addQubit", state: Qubit.ZERO })
    .apply(gate("H", "1"))
    .apply(gate("X", "2"));

  it("starts a new journey from where the qubits are, with the targets set", () => {
    const s = journey.setStartState(["2"], Qubit.PLUS_I);
    expect(s.steps).toHaveLength(1);
    // q1 keeps where its journey took it; only q2 changes.
    expect(s.qubit("1")!.state.isEquivalent(Qubit.PLUS)).toBe(true);
    expect(s.qubit("2")!.state).toBe(Qubit.PLUS_I);
    expect(s.qubits.map((q) => [q.id, q.name, q.colorSlot])).toEqual(journey.qubits.map((q) => [q.id, q.name, q.colorSlot]));
    expect(s.apply({ kind: "addQubit", state: Qubit.ZERO }).qubits.at(-1)!.id).toBe("3");
  });

  it("sets several qubits at once", () => {
    const s = journey.setStartState(["1", "2"], Qubit.MINUS);
    expect(s.qubits.every((q) => q.state === Qubit.MINUS)).toBe(true);
  });

  it("is the start that reset clears", () => {
    expect(journey.setStartState(["1"], Qubit.ONE).reset().qubit("1")!.state).toBe(Qubit.ZERO);
  });

  it("throws for an unknown qubit or no qubits", () => {
    expect(() => journey.setStartState(["9"], Qubit.ONE)).toThrow();
    expect(() => journey.setStartState([], Qubit.ONE)).toThrow();
  });
});

describe("frameAt", () => {
  const journey = Sphere.initial().apply(gate("H")).apply(gate("S"));

  it("shows each step's snapshot at whole-number times", () => {
    expect(journey.frameAt(0).qubits[0].state.isEquivalent(Qubit.ZERO)).toBe(true);
    expect(journey.frameAt(1).qubits[0].state.isEquivalent(Qubit.PLUS)).toBe(true);
    expect(journey.frameAt(2).qubits[0].state.isEquivalent(Qubit.PLUS_I)).toBe(true);
  });

  it("is partway along the step's rotation between steps", () => {
    const frame = journey.frameAt(0.5);
    expect(frame.step).toBe(1);
    expect(frame.progress).toBeCloseTo(0.5, 12);
    const { axis, angle } = Gate.H.axisAngle();
    expectVecClose(frame.qubits[0].state.blochVector(), rotate([0, 0, 1], axis, angle / 2));
  });

  it("clamps times outside the journey", () => {
    expect(journey.frameAt(-3).t).toBe(0);
    expect(journey.frameAt(99).t).toBe(2);
  });

  it("fades qubits in and out as they are added and removed", () => {
    const added = Sphere.initial().apply({ kind: "addQubit", state: Qubit.ONE });
    expect(added.frameAt(0.25).qubits.find((q) => q.entry.id === "2")!.presence).toBeCloseTo(0.25, 12);

    const removed = added.apply({ kind: "removeQubit", target: "2" });
    const fading = removed.frameAt(1.75).qubits.find((q) => q.entry.id === "2")!;
    expect(fading.presence).toBeCloseTo(0.25, 12);
    expect(removed.frameAt(2).qubits.map((q) => q.entry.id)).toEqual(["1"]);
  });
});
