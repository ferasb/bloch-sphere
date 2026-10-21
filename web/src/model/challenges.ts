import { NAMED_STATES, type Qubit } from "../math/qubit";
import { resolveGate, Sphere, type Action, type FixedGateName } from "./sphere";

/**
 * Challenges (design.md §7): get q1 from one axis state to another using only some gates, in as few
 * gates as you can. Played in the Sphere room; the store keeps which one is on.
 */
export interface Challenge {
  id: string;
  title: string;
  /** Where q1 starts and where it has to end: axis-state labels, as in NAMED_STATES ("|+i⟩"). */
  from: string;
  to: string;
  /** The only gates that work during the challenge. */
  gates: readonly FixedGateName[];
  /** The fewest gates that do it (a test checks this by search). */
  par: number;
  hint: string;
}

export const CHALLENGES: readonly Challenge[] = [
  {
    id: "flip",
    title: "Flip it",
    from: "|0⟩",
    to: "|1⟩",
    gates: ["X", "Y", "Z", "H"],
    par: 1,
    hint: "A half turn about an axis on the equator takes the top to the bottom.",
  },
  {
    id: "equal-odds",
    title: "Equal odds",
    from: "|0⟩",
    to: "|+⟩",
    gates: ["X", "Y", "Z", "H"],
    par: 1,
    hint: "Which gate makes equal superpositions?",
  },
  {
    id: "quarter-turn",
    title: "A quarter turn",
    from: "|0⟩",
    to: "|+i⟩",
    gates: ["H", "S"],
    par: 2,
    hint: "Get down to the equator first, then turn around it.",
  },
  {
    id: "minus-sign",
    title: "The minus sign",
    from: "|0⟩",
    to: "|−⟩",
    gates: ["X", "H"],
    par: 2,
    hint: "H takes |1⟩ to |−⟩.",
  },
  {
    id: "two-quarters",
    title: "Two quarters",
    from: "|+⟩",
    to: "|−⟩",
    gates: ["S"],
    par: 2,
    hint: "S is a quarter turn about the vertical axis.",
  },
  {
    id: "phase-into-flip",
    title: "Phase into flip",
    from: "|0⟩",
    to: "|1⟩",
    gates: ["H", "Z"],
    par: 3,
    hint: "Z can't move the poles, but it does move |+⟩.",
  },
  {
    id: "eighths",
    title: "Eighths",
    from: "|+⟩",
    to: "|−i⟩",
    gates: ["T", "H"],
    par: 3,
    hint: "H swaps |+i⟩ and |−i⟩. How many eighths of a turn take |+⟩ to |+i⟩?",
  },
  {
    id: "long-way-round",
    title: "The long way round",
    from: "|0⟩",
    to: "|1⟩",
    gates: ["H", "T"],
    par: 6,
    hint: "H, then go halfway around the equator, then H again.",
  },
];

function stateOf(label: string): Qubit {
  const named = NAMED_STATES.find((s) => s.label === label);
  if (!named) {
    throw new Error(`No axis state ${label}`);
  }
  return named.state;
}

export function challengeById(id: string | null): Challenge | null {
  return CHALLENGES.find((c) => c.id === id) ?? null;
}

/** The target as a Bloch vector, for drawing. */
export function targetVector(c: Challenge) {
  return stateOf(c.to).blochVector();
}

/** A fresh attempt: q1 alone, at the challenge's start, with no steps. */
export function challengeStart(c: Challenge): Sphere {
  return Sphere.fromStart([{ id: "1", name: "q1", colorSlot: 1, state: stateOf(c.from) }], 2);
}

/** Whether an action is allowed during the challenge: only its gates, and nothing else. */
export function allows(c: Challenge, action: Action): boolean {
  return action.kind === "gate" && (c.gates as readonly string[]).includes(action.gate.name);
}

/** Stars for solving in `gates` gates: three at par, two within two more, one otherwise. */
export function starsFor(c: Challenge, gates: number): 1 | 2 | 3 {
  return gates <= c.par ? 3 : gates <= c.par + 2 ? 2 : 1;
}

export interface Progress {
  /** Gates used so far. */
  gates: number;
  solved: boolean;
  /** 0 until solved. */
  stars: 0 | 1 | 2 | 3;
}

/** How an attempt stands: its journey's gates, and whether q1 has reached the target. */
export function progress(c: Challenge, sphere: Sphere): Progress {
  const q1 = sphere.qubit("1");
  const gates = sphere.steps.length - 1;
  const solved = !!q1 && q1.state.isEquivalent(stateOf(c.to), 1e-9);
  return { gates, solved, stars: solved ? starsFor(c, gates) : 0 };
}

/** The fewest gates that solve a challenge, by breadth-first search (up to `limit`), or null. */
export function fewestGates(c: Challenge, limit = 10): number | null {
  const target = stateOf(c.to);
  const key = (q: Qubit) => q.blochVector().map((v) => v.toFixed(6)).join(",");
  let frontier = [stateOf(c.from)];
  const seen = new Set(frontier.map(key));
  for (let depth = 0; depth <= limit; depth++) {
    if (frontier.some((q) => q.isEquivalent(target, 1e-9))) {
      return depth;
    }
    const next: Qubit[] = [];
    for (const q of frontier) {
      for (const name of c.gates) {
        const r = resolveGate({ name }).apply(q);
        if (!seen.has(key(r))) {
          seen.add(key(r));
          next.push(r);
        }
      }
    }
    frontier = next;
  }
  return null;
}
