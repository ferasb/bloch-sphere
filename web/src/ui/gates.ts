import { formulaText } from "../format/bench";
import { Gate } from "../math/gate";
import { MAX_ABOUT } from "../model/serialize";
import { savedGateMatrix, type SavedGate } from "../model/library";
import type { GateSpec } from "../model/sphere";

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
