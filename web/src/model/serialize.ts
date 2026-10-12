import { Complex } from "../math/complex";
import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import { MAX_LABEL } from "./bench";
import { MAX_QUBITS, Sphere, type Action, type FixedGateName, type GateSpec, type QubitEntry } from "./sphere";

/**
 * A journey as plain JSON: the starting qubits plus the actions, which are replayed on load.
 * Loaded data may come from storage or a shared link, so `deserialize` validates everything.
 */
export interface SavedJourney {
  version: 1;
  start: { qubits: SavedQubit[]; nextId: number };
  actions: SavedAction[];
}

/** [Re α, Im α, Re β, Im β] */
type Amplitudes = [number, number, number, number];

interface SavedQubit {
  id: string;
  name: string;
  colorSlot: number;
  state: Amplitudes;
}

/** A gate in JSON: custom gates carry their matrix as [Re, Im] × 4, row by row. */
type SavedGate = Exclude<GateSpec, { name: "custom" }> | { name: "custom"; label: string; about: string; matrix: number[] };

type SavedAction =
  | { kind: "gate"; gate: SavedGate; targets: string[] }
  | { kind: "addQubit"; state: Amplitudes }
  | { kind: "removeQubit"; target: string };

const MAX_ACTIONS = 5000;
const FIXED_GATE_NAMES: readonly FixedGateName[] = ["X", "Y", "Z", "H", "S", "T", "S†", "T†"];

export function serialize(sphere: Sphere): SavedJourney {
  const [start, ...steps] = sphere.steps;
  return {
    version: 1,
    start: {
      qubits: start.qubits.map((q) => ({ id: q.id, name: q.name, colorSlot: q.colorSlot, state: amplitudes(q.state) })),
      nextId: start.nextId,
    },
    actions: steps.map((step) => saveAction(step.action!)),
  };
}

/** Rebuilds a Sphere by replaying the actions. Throws on anything malformed. */
export function deserialize(data: unknown): Sphere {
  const journey = record(data);
  if (journey.version !== 1) {
    throw new Error("Unsupported journey version");
  }
  const start = record(journey.start);
  const qubits = list(start.qubits).map(loadQubit);
  if (new Set(qubits.map((q) => q.id)).size !== qubits.length || new Set(qubits.map((q) => q.colorSlot)).size !== qubits.length) {
    throw new Error("Duplicate qubit ids or colors");
  }
  const nextId = start.nextId;
  if (!Number.isInteger(nextId) || (nextId as number) < 1 || qubits.some((q) => Number(q.id) >= (nextId as number))) {
    throw new Error("Invalid nextId");
  }
  const actions = list(journey.actions);
  if (actions.length > MAX_ACTIONS) {
    throw new Error("Journey too long");
  }
  return actions.map(loadAction).reduce((sphere, action) => sphere.apply(action), Sphere.fromStart(qubits, nextId as number));
}

function saveAction(action: Action): SavedAction {
  switch (action.kind) {
    case "gate":
      return { kind: "gate", gate: saveGate(action.gate), targets: [...action.targets] };
    case "addQubit":
      return { kind: "addQubit", state: amplitudes(action.state) };
    case "removeQubit":
      return { kind: "removeQubit", target: action.target };
  }
}

function loadAction(data: unknown): Action {
  const a = record(data);
  switch (a.kind) {
    case "gate":
      return { kind: "gate", gate: loadGate(a.gate), targets: ids(a.targets) };
    case "addQubit":
      return { kind: "addQubit", state: loadState(a.state) };
    case "removeQubit":
      return { kind: "removeQubit", target: id(a.target) };
    default:
      throw new Error("Unknown action");
  }
}

function saveGate(spec: GateSpec): SavedGate {
  if (spec.name !== "custom") {
    return spec;
  }
  const matrix = spec.gate.matrix.flatMap((row) => row.flatMap((z) => [z.re, z.im]));
  return { name: "custom", label: spec.label, about: spec.about, matrix };
}

/** A custom gate's description is one line. */
export const MAX_ABOUT = 200;

function loadGate(data: unknown): GateSpec {
  const g = record(data);
  if (g.name === "custom") {
    if (typeof g.label !== "string" || g.label.length < 1 || g.label.length > MAX_LABEL) {
      throw new Error("Invalid gate label");
    }
    if (typeof g.about !== "string" || g.about.length > MAX_ABOUT) {
      throw new Error("Invalid gate description");
    }
    const m = list(g.matrix);
    if (m.length !== 8 || !m.every(Number.isFinite)) {
      throw new Error("Invalid gate matrix");
    }
    const [a, b, c, d, e, f, h, k] = m as number[];
    // The Gate constructor rejects anything that isn't unitary.
    const gate = new Gate(
      [
        [new Complex(a, b), new Complex(c, d)],
        [new Complex(e, f), new Complex(h, k)],
      ],
      g.label,
    );
    return { name: "custom", label: g.label, about: g.about, gate };
  }
  if (FIXED_GATE_NAMES.includes(g.name as FixedGateName)) {
    return { name: g.name as FixedGateName };
  }
  if ((g.name === "Rx" || g.name === "Ry" || g.name === "Rz") && Number.isFinite(g.angle)) {
    return { name: g.name, angle: g.angle as number };
  }
  throw new Error("Invalid gate");
}

function loadQubit(data: unknown): QubitEntry {
  const q = record(data);
  const colorSlot = q.colorSlot;
  if (!Number.isInteger(colorSlot) || (colorSlot as number) < 1 || (colorSlot as number) > MAX_QUBITS || q.name !== `q${colorSlot}`) {
    throw new Error("Invalid qubit");
  }
  return { id: id(q.id), name: q.name, colorSlot: colorSlot as number, state: loadState(q.state) };
}

function loadState(data: unknown): Qubit {
  const a = list(data);
  if (a.length !== 4 || !a.every(Number.isFinite)) {
    throw new Error("Invalid amplitudes");
  }
  const [ar, ai, br, bi] = a as number[];
  return new Qubit(new Complex(ar, ai), new Complex(br, bi));
}

function amplitudes(q: Qubit): Amplitudes {
  return [q.a.re, q.a.im, q.b.re, q.b.im];
}

function id(data: unknown): string {
  if (typeof data !== "string" || !/^[1-9]\d{0,6}$/.test(data)) {
    throw new Error("Invalid qubit id");
  }
  return data;
}

function ids(data: unknown): string[] {
  const a = list(data);
  if (a.length === 0 || a.length > MAX_QUBITS) {
    throw new Error("Invalid targets");
  }
  return a.map(id);
}

function record(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Expected an object");
  }
  return data as Record<string, unknown>;
}

function list(data: unknown): unknown[] {
  if (!Array.isArray(data)) {
    throw new Error("Expected a list");
  }
  return data;
}
