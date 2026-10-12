import { Gate } from "../math/gate";
import { Qubit } from "../math/qubit";
import type { Vec3 } from "../math/vec3";

export const MAX_QUBITS = 5;

export type QubitId = string;

export interface QubitEntry {
  readonly id: QubitId;
  /** "q1"…"q5". Follows the color slot, so q2 is always the second color. */
  readonly name: string;
  /** 1–5, maps to --qubit-N. Assigned once, when the qubit is added. */
  readonly colorSlot: number;
  readonly state: Qubit;
}

export type FixedGateName = "X" | "Y" | "Z" | "H" | "S" | "T" | "S†" | "T†";
/**
 * A gate as an action names it. Custom gates (made in the Gate Lab) are carried by value: the step
 * keeps the gate itself, so editing or deleting a saved gate never changes a past journey.
 */
export type GateSpec =
  | { name: FixedGateName }
  | { name: "Rx" | "Ry" | "Rz"; angle: number }
  | { name: "custom"; label: string; about: string; gate: Gate };

export type Action =
  | { kind: "gate"; gate: GateSpec; targets: readonly QubitId[] }
  | { kind: "addQubit"; state: Qubit }
  | { kind: "removeQubit"; target: QubitId };

/** How a qubit got from one step to the next. */
export type Motion = { kind: "rotate"; axis: Vec3; angle: number } | { kind: "appear" } | { kind: "disappear" };

export interface Step {
  /** null for the start of the journey. */
  readonly action: Action | null;
  /** Every qubit after this step, ordered by color slot. */
  readonly qubits: readonly QubitEntry[];
  /** How each affected qubit moved during this step. */
  readonly motions: ReadonlyMap<QubitId, Motion>;
  /** The id the next added qubit gets. */
  readonly nextId: number;
}

/** One qubit at a moment in the journey. */
export interface QubitFrame {
  readonly entry: QubitEntry;
  /** The state at this moment; partway through a rotation it is the exact intermediate state. */
  readonly state: Qubit;
  /** 1 normally; between 0 and 1 while the qubit appears or disappears. */
  readonly presence: number;
}

/** What the sphere shows at time t. */
export interface Frame {
  readonly t: number;
  /** The step being played: t lies in (step − 1, step]. 0 at the start. */
  readonly step: number;
  /** How far into `step`, from 0 to 1. */
  readonly progress: number;
  readonly qubits: readonly QubitFrame[];
}

const FIXED_GATES: Record<FixedGateName, Gate> = {
  X: Gate.X,
  Y: Gate.Y,
  Z: Gate.Z,
  H: Gate.H,
  S: Gate.S,
  T: Gate.T,
  "S†": Gate.S_DAG,
  "T†": Gate.T_DAG,
};

export function resolveGate(spec: GateSpec): Gate {
  switch (spec.name) {
    case "Rx":
      return Gate.rx(spec.angle);
    case "Ry":
      return Gate.ry(spec.angle);
    case "Rz":
      return Gate.rz(spec.angle);
    case "custom":
      return spec.gate;
    default:
      return FIXED_GATES[spec.name];
  }
}

/**
 * The model: the qubits and the journey that led to them. Immutable; every change returns a new
 * Sphere. Holds no view state (playhead, selection, hover), which belongs to the UI.
 */
export class Sphere {
  /** steps[0] is the start. */
  readonly steps: readonly Step[];

  private constructor(steps: readonly Step[]) {
    this.steps = steps;
  }

  /** One qubit, q1, at |0⟩. */
  static initial(): Sphere {
    return Sphere.fromStart([{ id: "1", name: "q1", colorSlot: 1, state: Qubit.ZERO }], 2);
  }

  /** A journey with no steps yet, starting from these qubits. */
  static fromStart(qubits: readonly QubitEntry[], nextId: number): Sphere {
    if (qubits.length === 0 || qubits.length > MAX_QUBITS) {
      throw new RangeError(`A sphere holds 1 to ${MAX_QUBITS} qubits`);
    }
    const sorted = [...qubits].sort((a, b) => a.colorSlot - b.colorSlot);
    return new Sphere([{ action: null, qubits: sorted, motions: new Map(), nextId }]);
  }

  get last(): Step {
    return this.steps[this.steps.length - 1];
  }

  /** Index of the last step, which is also the largest valid time t. */
  get lastIndex(): number {
    return this.steps.length - 1;
  }

  get qubits(): readonly QubitEntry[] {
    return this.last.qubits;
  }

  qubit(id: QubitId): QubitEntry | undefined {
    return this.qubits.find((q) => q.id === id);
  }

  get canUndo(): boolean {
    return this.steps.length > 1;
  }

  get canAddQubit(): boolean {
    return this.qubits.length < MAX_QUBITS;
  }

  get canRemoveQubit(): boolean {
    return this.qubits.length > 1;
  }

  /** Appends a step. Throws for an action that doesn't fit the current qubits. */
  apply(action: Action): Sphere {
    return new Sphere([...this.steps, nextStep(this.last, action)]);
  }

  /** Discards the last step. The start always stays. */
  undo(): Sphere {
    return this.canUndo ? new Sphere(this.steps.slice(0, -1)) : this;
  }

  /**
   * A new journey that starts where the qubits are now, with `targets` set to `state`. Setting a
   * state isn't a step: it changes where the journey starts, so the steps so far are cleared.
   */
  setStartState(targets: readonly QubitId[], state: Qubit): Sphere {
    if (targets.length === 0 || targets.some((id) => !this.qubit(id))) {
      throw new Error("Set state needs existing qubits");
    }
    return Sphere.fromStart(
      this.qubits.map((q) => (targets.includes(q.id) ? { ...q, state } : q)),
      this.last.nextId,
    );
  }

  /** A new journey: the same qubits (ids, names, colors), all back at |0⟩. */
  reset(): Sphere {
    return Sphere.fromStart(
      this.qubits.map((q) => ({ ...q, state: Qubit.ZERO })),
      this.last.nextId,
    );
  }

  /** The sphere at time t in [0, lastIndex]; t is clamped. Inside step k, t runs from k − 1 to k. */
  frameAt(t: number): Frame {
    const time = Math.min(Math.max(t, 0), this.lastIndex);
    const step = Math.ceil(time);
    const progress = step === 0 ? 1 : time - (step - 1);
    const after = this.steps[step];
    if (progress >= 1) {
      return { t: time, step, progress: 1, qubits: after.qubits.map((entry) => ({ entry, state: entry.state, presence: 1 })) };
    }

    const before = this.steps[step - 1];
    const qubits: QubitFrame[] = after.qubits.map((entry) => {
      const motion = after.motions.get(entry.id);
      if (motion?.kind === "appear") {
        return { entry, state: entry.state, presence: progress };
      }
      if (motion?.kind === "rotate") {
        const from = before.qubits.find((q) => q.id === entry.id)!.state;
        return { entry, state: Gate.rotation(motion.axis, motion.angle * progress).apply(from), presence: 1 };
      }
      return { entry, state: entry.state, presence: 1 };
    });
    for (const entry of before.qubits) {
      if (after.motions.get(entry.id)?.kind === "disappear") {
        qubits.push({ entry, state: entry.state, presence: 1 - progress });
      }
    }
    return { t: time, step, progress, qubits };
  }
}

function nextStep(prev: Step, action: Action): Step {
  const find = (id: QubitId) => {
    const q = prev.qubits.find((entry) => entry.id === id);
    if (!q) {
      throw new Error(`No qubit with id ${id}`);
    }
    return q;
  };
  const motions = new Map<QubitId, Motion>();

  switch (action.kind) {
    case "gate": {
      const gate = resolveGate(action.gate);
      const { axis, angle } = gate.axisAngle();
      const changed = new Map(action.targets.map((id) => [id, gate.apply(find(id).state)]));
      action.targets.forEach((id) => motions.set(id, { kind: "rotate", axis, angle }));
      const qubits = prev.qubits.map((q) => (changed.has(q.id) ? { ...q, state: changed.get(q.id)! } : q));
      return { action, qubits, motions, nextId: prev.nextId };
    }
    case "addQubit": {
      if (prev.qubits.length >= MAX_QUBITS) {
        throw new RangeError(`A sphere holds at most ${MAX_QUBITS} qubits`);
      }
      const used = new Set(prev.qubits.map((q) => q.colorSlot));
      const colorSlot = [1, 2, 3, 4, 5].find((slot) => !used.has(slot))!;
      const entry: QubitEntry = { id: String(prev.nextId), name: `q${colorSlot}`, colorSlot, state: action.state };
      motions.set(entry.id, { kind: "appear" });
      const qubits = [...prev.qubits, entry].sort((a, b) => a.colorSlot - b.colorSlot);
      return { action, qubits, motions, nextId: prev.nextId + 1 };
    }
    case "removeQubit": {
      find(action.target);
      if (prev.qubits.length <= 1) {
        throw new RangeError("Can't remove the last qubit");
      }
      motions.set(action.target, { kind: "disappear" });
      return { action, qubits: prev.qubits.filter((q) => q.id !== action.target), motions, nextId: prev.nextId };
    }
  }
}
