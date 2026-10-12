import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { product, reversed, tileGate } from "../../model/bench";
import { scenePalette } from "../palette";
import { arcPositions, toVector3 } from "../scene/geometry";
import { GhostArrow } from "../scene/Ghost";
import { stateFor, useLab } from "./labStore";

const AXIS_LENGTH = 1.3;

/**
 * "Two rotations make one" (design-gates.md §3.5): at rest, with two or more tiles, a dashed arc for
 * the single rotation the whole bench adds up to, and its axis.
 */
export function ShortcutArc() {
  const tiles = useLab((s) => s.tiles);
  const testState = useLab((s) => s.testState);
  const atRest = useLab((s) => s.playhead >= s.sphere.lastIndex);
  const shortcut = useMemo(() => {
    if (tiles.length < 2) {
      return null;
    }
    const { axis, angle } = product(tiles).axisAngle();
    if (angle < 1e-9) {
      return null;
    }
    const end = toVector3(axis).multiplyScalar(AXIS_LENGTH);
    return { arc: arcPositions(stateFor(testState).blochVector(), axis, angle, 1), axis: [end.clone().negate(), end] };
  }, [tiles, testState]);

  if (!shortcut || !atRest) {
    return null;
  }
  const color = scenePalette().rotationAxis;
  return (
    <>
      <Line points={shortcut.arc} color={color} lineWidth={2.5} dashed dashSize={0.07} gapSize={0.05} />
      <Line points={shortcut.axis} color={color} lineWidth={1.5} dashed dashSize={0.06} gapSize={0.045} />
    </>
  );
}

/** "Order matters": the same tiles in reverse order, as a faint dashed path ending in a ghost arrow. */
export function ReversedPath() {
  const on = useLab((s) => s.compareReversed);
  const tiles = useLab((s) => s.tiles);
  const testState = useLab((s) => s.testState);
  const atRest = useLab((s) => s.playhead >= s.sphere.lastIndex);
  const path = useMemo(() => {
    if (!on || tiles.length < 2) {
      return null;
    }
    let state = stateFor(testState);
    const arcs: number[][] = [];
    for (const t of reversed(tiles)) {
      const gate = tileGate(t);
      const { axis, angle } = gate.axisAngle();
      if (angle > 1e-9) {
        arcs.push(arcPositions(state.blochVector(), axis, angle, 1));
      }
      state = gate.apply(state);
    }
    return { arcs, end: state.blochVector() };
  }, [on, tiles, testState]);

  if (!path || !atRest) {
    return null;
  }
  const color = scenePalette().qubits[1];
  return (
    <>
      {path.arcs.map((points, i) => (
        <Line key={i} points={points} color={color} lineWidth={1.5} dashed dashSize={0.035} gapSize={0.035} transparent opacity={0.7} />
      ))}
      <GhostArrow to={path.end} color={color} />
    </>
  );
}
