import { NAMED_STATES } from "../../math/qubit";
import { toVector3 } from "./geometry";
import { OverlayLabel } from "./overlay";

// Past the end of the axes, so the axis lines don't run through the labels.
const LABEL_RADIUS = 1.27;

const LABELS = NAMED_STATES.map(({ label, state }) => {
  const point = toVector3(state.blochVector()).multiplyScalar(LABEL_RADIUS);
  return { label, position: () => point };
});

/** |0⟩ |1⟩ |+⟩ |−⟩ |+i⟩ |−i⟩, placed from the states themselves. Rendered over the canvas. */
export function StateLabels() {
  return LABELS.map(({ label, position }) => (
    <OverlayLabel key={label} id={`state ${label}`} position={position} className="sphere-label">
      {label}
    </OverlayLabel>
  ));
}
