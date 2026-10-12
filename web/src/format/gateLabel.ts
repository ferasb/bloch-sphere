import type { GateSpec } from "../model/sphere";
import { degreesText } from "./angles";

/** How a gate is named on a chip or button: "H", "Rx(45°)", or a custom gate's own label. */
export function gateLabel(spec: GateSpec): string {
  switch (spec.name) {
    case "Rx":
    case "Ry":
    case "Rz":
      return `${spec.name}(${degreesText(spec.angle)})`;
    case "custom":
      return spec.label;
    default:
      return spec.name;
  }
}
