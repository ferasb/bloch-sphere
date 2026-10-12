import { formulaText, tileText } from "../format/bench";
import { Gate } from "../math/gate";
import { NAMED_STATES } from "../math/qubit";
import { MAX_LABEL, tileGate, type Tile } from "../model/bench";
import { columns, isTwoQubit, type Circuit } from "../model/circuit";
import { MAX_ABOUT } from "../model/serialize";
import { savedGateMatrix, type SavedGate } from "../model/library";
import { Sphere, type GateSpec, type QubitEntry } from "../model/sphere";

/** A saved gate as the main room applies it: by value, so the journey keeps it as it is now. */
export function savedGateSpec(g: SavedGate): GateSpec {
  const matrix = savedGateMatrix(g).matrix;
  return {
    name: "custom",
    label: g.label,
    about: `${g.name} = ${formulaText(g.tiles)}`.slice(0, MAX_ABOUT),
    gate: new Gate(matrix, g.label),
  };
}

const AXIS_NAMES = ["Rx", "Ry", "Rz"] as const;

/** A tile as the main room names it: built-ins and x/y/z rotations by name, anything else by value. */
export function specFromTile(t: Tile): GateSpec {
  const g = t.gate;
  if (g.kind === "builtin" && t.power === 1) {
    return { name: g.name };
  }
  if (g.kind === "builtin" && t.power === -1 && (g.name === "S" || g.name === "T")) {
    return { name: g.name === "S" ? "S†" : "T†" };
  }
  if (g.kind === "rotation" && t.power === 1) {
    const axis = g.axis.findIndex((c) => Math.abs(c - 1) < 1e-12);
    if (axis >= 0 && g.axis.every((c, i) => i === axis || Math.abs(c) < 1e-12)) {
      return { name: AXIS_NAMES[axis], angle: g.angle };
    }
  }
  const text = tileText(t);
  const label = text.length <= MAX_LABEL ? text : "U";
  return { name: "custom", label, about: text.slice(0, MAX_ABOUT), gate: new Gate(tileGate(t).matrix, label) };
}

/**
 * A circuit of single-qubit gates as a journey (design-gates.md §4.4): its wires become qubits at
 * their starting states, and each column becomes steps, one per gate (the same gate on several wires
 * of a column is one step on all of them). Throws for two-qubit gates and measurements.
 */
export function journeyFromCircuit(c: Circuit): Sphere {
  const qubits: QubitEntry[] = c.wires.map((w, i) => ({
    id: String(i + 1),
    name: w.name,
    colorSlot: w.colorSlot,
    state: (NAMED_STATES.find((s) => s.label === w.start) ?? NAMED_STATES[0]).state,
  }));
  const id = (wire: string) => String(c.wires.findIndex((w) => w.id === wire) + 1);
  let sphere = Sphere.fromStart(qubits, qubits.length + 1);
  for (const column of columns(c)) {
    const groups: { spec: GateSpec; gate: Gate; text: string; targets: string[] }[] = [];
    for (const op of column) {
      if (isTwoQubit(op) || op.kind === "measure") {
        throw new RangeError("Only circuits of single-qubit gates can run on the sphere");
      }
      const text = tileText(op.tile);
      const gate = tileGate(op.tile);
      const group = groups.find((g) => g.text === text && g.gate.equalsUpToPhase(gate));
      if (group) {
        group.targets.push(id(op.wire));
      } else {
        groups.push({ spec: specFromTile(op.tile), gate, text, targets: [id(op.wire)] });
      }
    }
    for (const g of groups) {
      sphere = sphere.apply({ kind: "gate", gate: g.spec, targets: g.targets });
    }
  }
  return sphere;
}
