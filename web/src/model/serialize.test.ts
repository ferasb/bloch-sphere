import { describe, expect, it } from "vitest";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { deserialize, serialize } from "./serialize";
import { Sphere } from "./sphere";

// Starts from a set state (θ 1, φ 2 on q2), so the start's states round-trip too.
const journey = Sphere.initial()
  .apply({ kind: "addQubit", state: Qubit.ZERO })
  .setStartState(["2"], Qubit.fromBlochAngles(1, 2))
  .apply({ kind: "gate", gate: { name: "H" }, targets: ["1"] })
  .apply({ kind: "addQubit", state: Qubit.PLUS_I })
  .apply({ kind: "gate", gate: { name: "T†" }, targets: ["1", "3"] })
  .apply({ kind: "gate", gate: { name: "Rx", angle: 0.7 }, targets: ["2"] })
  .apply({ kind: "removeQubit", target: "1" });

describe("serialize / deserialize", () => {
  it("round-trips a journey through JSON", () => {
    const loaded = deserialize(JSON.parse(JSON.stringify(serialize(journey))));
    expect(loaded.steps).toHaveLength(journey.steps.length);
    expect(loaded.qubits.map((q) => [q.id, q.name, q.colorSlot])).toEqual(journey.qubits.map((q) => [q.id, q.name, q.colorSlot]));
    loaded.qubits.forEach((q, i) => expect(q.state.isEquivalent(journey.qubits[i].state)).toBe(true));
    loaded.steps[0].qubits.forEach((q, i) => expect(q.state.isEquivalent(journey.steps[0].qubits[i].state)).toBe(true));
    expect(loaded.last.nextId).toBe(journey.last.nextId);
  });

  it("round-trips custom gates by value", () => {
    const v = Gate.mult(Gate.mult(Gate.H, Gate.T), Gate.H);
    const custom = Sphere.initial().apply({ kind: "gate", gate: { name: "custom", label: "V", about: "H · T · H", gate: v }, targets: ["1"] });
    const loaded = deserialize(JSON.parse(JSON.stringify(serialize(custom))));
    const spec = loaded.last.action!.kind === "gate" ? loaded.last.action!.gate : null;
    expect(spec?.name).toBe("custom");
    if (spec?.name === "custom") {
      expect(spec.label).toBe("V");
      expect(spec.about).toBe("H · T · H");
      expect(spec.gate.equalsUpToPhase(v)).toBe(true);
    }
    expect(loaded.qubit("1")!.state.isEquivalent(custom.qubit("1")!.state)).toBe(true);
  });

  it("round-trips a journey that starts after a reset", () => {
    const reset = journey.reset().apply({ kind: "addQubit", state: Qubit.ONE });
    const loaded = deserialize(serialize(reset));
    expect(loaded.qubits.map((q) => q.id)).toEqual(reset.qubits.map((q) => q.id));
  });

  const valid = () => JSON.parse(JSON.stringify(serialize(journey)));
  it.each([
    ["not an object", () => "nope"],
    ["an unknown version", () => ({ ...valid(), version: 2 })],
    ["an unknown gate", () => {
      const j = valid();
      j.actions[0].gate = { name: "Q" };
      return j;
    }],
    ["non-finite amplitudes", () => {
      const j = valid();
      j.actions[1].state = [NaN, 0, 1, 0];
      return j;
    }],
    ["a target that doesn't exist", () => {
      const j = valid();
      j.actions[0].targets = ["9"];
      return j;
    }],
    ["a name that doesn't match the color", () => {
      const j = valid();
      j.start.qubits[0].name = "q3";
      return j;
    }],
    ["a custom gate that isn't unitary", () => {
      const j = valid();
      j.actions[0].gate = { name: "custom", label: "M", about: "", matrix: [1, 0, 1, 0, 0, 0, 1, 0] };
      return j;
    }],
    ["a custom gate label that's too long", () => {
      const j = valid();
      j.actions[0].gate = { name: "custom", label: "TOOLONG", about: "", matrix: [1, 0, 0, 0, 0, 0, 1, 0] };
      return j;
    }],
    ["a nextId that would reuse an id", () => {
      const j = valid();
      j.start.nextId = 1;
      return j;
    }],
  ])("rejects %s", (_, make) => {
    expect(() => deserialize(make())).toThrow();
  });
});
