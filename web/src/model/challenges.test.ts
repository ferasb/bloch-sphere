import { describe, expect, it } from "vitest";
import { allows, CHALLENGES, challengeStart, fewestGates, progress, starsFor } from "./challenges";

describe("challenges", () => {
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s: par is the fewest gates that solve it", (_, c) => {
    expect(fewestGates(c)).toBe(c.par);
  });

  it("have unique ids, and start somewhere other than the target", () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    for (const c of CHALLENGES) {
      expect(progress(c, challengeStart(c)).solved).toBe(false);
    }
  });

  it("count gates and see when q1 reaches the target", () => {
    const c = CHALLENGES.find((x) => x.id === "quarter-turn")!;
    let attempt = challengeStart(c).apply({ kind: "gate", gate: { name: "H" }, targets: ["1"] });
    expect(progress(c, attempt)).toEqual({ gates: 1, solved: false, stars: 0 });
    attempt = attempt.apply({ kind: "gate", gate: { name: "S" }, targets: ["1"] });
    expect(progress(c, attempt)).toEqual({ gates: 2, solved: true, stars: 3 });
  });

  it("give fewer stars for longer solutions", () => {
    const c = CHALLENGES.find((x) => x.par === 2)!;
    expect([2, 3, 4, 5, 9].map((n) => starsFor(c, n))).toEqual([3, 2, 2, 1, 1]);
  });

  it("allow only their own gates", () => {
    const c = CHALLENGES.find((x) => x.id === "two-quarters")!;
    expect(allows(c, { kind: "gate", gate: { name: "S" }, targets: ["1"] })).toBe(true);
    expect(allows(c, { kind: "gate", gate: { name: "Z" }, targets: ["1"] })).toBe(false);
    expect(allows(c, { kind: "gate", gate: { name: "Rz", angle: Math.PI / 2 }, targets: ["1"] })).toBe(false);
    expect(allows(c, { kind: "addQubit", state: challengeStart(c).qubits[0].state })).toBe(false);
  });
});
