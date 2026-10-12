import type { Gate } from "../math/gate";
import { dot, type Vec3 } from "../math/vec3";

/**
 * Axes with names: ±x, ±y, ±z, and the diagonals between them, like "the x+z diagonal" (H's axis)
 * or "the −x−y−z diagonal" (S·H turns 120° about it).
 */
const NAMED_AXES: ReadonlyArray<[Vec3, string]> = (() => {
  const out: [Vec3, string][] = [];
  for (const x of [1, 0, -1]) {
    for (const y of [1, 0, -1]) {
      for (const z of [1, 0, -1]) {
        const count = Math.abs(x) + Math.abs(y) + Math.abs(z);
        if (count === 0) {
          continue;
        }
        const parts = ([[x, "x"], [y, "y"], [z, "z"]] as const).filter(([c]) => c !== 0);
        const name = parts.map(([c, n], i) => (c < 0 ? "−" : i > 0 ? "+" : "") + n).join("");
        const n = Math.sqrt(count);
        out.push([[x / n, y / n, z / n], count === 1 ? name : `the ${name} diagonal`]);
      }
    }
  }
  return out;
})();

function describeAxis(axis: Vec3): string {
  const named = NAMED_AXES.find(([v]) => dot(v, axis) > 1 - 1e-9);
  return named ? named[1] : `(${axis.map((n) => n.toFixed(2)).join(", ")})`;
}

/**
 * For a gate that leaves an arrow where it is because the arrow lies on its rotation axis
 * (S on |0⟩, Z on |1⟩): a sentence saying so, since otherwise it looks like nothing happened.
 */
export function onAxisNote(qubitName: string, vector: Vec3, axis: Vec3, angle: number): string | null {
  if (angle === 0 || Math.abs(dot(vector, axis)) < 1 - 1e-9) {
    return null;
  }
  return `${qubitName} lies on the rotation axis, so its arrow doesn't move.`;
}

/** e.g. "180° about the x+z diagonal", or "no rotation" */
export function rotationText(gate: Gate): string {
  const { axis, angle } = gate.axisAngle();
  const degrees = +((angle * 180) / Math.PI).toFixed(1);
  return degrees === 0 ? "no rotation" : `${degrees}° about ${describeAxis(axis)}`;
}
