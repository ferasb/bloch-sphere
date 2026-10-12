import type { Qubit } from "../math/qubit";
import { rotationBetween, type Vec3 } from "../math/vec3";
import { resolveGate, type Frame, type GateSpec, type QubitId, type Sphere } from "../model/sphere";
import { arcPoints, journeyTimeline, type GhostView } from "./scene/timeline";
import type { SceneView } from "./scene/source";

/** What a ghost on the sphere previews: a gate under the pointer, or a state being picked. */
export type Preview = { kind: "gate"; gate: GateSpec } | { kind: "state"; state: Qubit };

/**
 * The view state of a room that shows a journey (the Sphere room; the Gate Lab's test sphere): the
 * journey and a moment in it, plus what the sphere reacts to.
 */
export interface JourneyView {
  sphere: Sphere;
  /** Time in the journey, in steps (design.md §4.3). */
  playhead: number;
  /** False while replaying an earlier step. */
  live: boolean;
  selected: QubitId;
  applyToAll: boolean;
  preview: Preview | null;
  /** The journey step under the pointer, highlighted on the sphere. */
  hoverStep: number | null;
}

/** The qubits an action targets: the selected one, or all of them. */
export function targets(s: Pick<JourneyView, "sphere" | "selected" | "applyToAll">): QubitId[] {
  return s.applyToAll ? s.sphere.qubits.map((q) => q.id) : [s.selected];
}

const frames = new WeakMap<Sphere, { t: number; frame: Frame }>();

/**
 * The frame at the playhead. Cached per journey, so the many readers in one render frame share one
 * computation, and selectors get the same object back when nothing moved.
 */
export function frameOf(s: Pick<JourneyView, "sphere" | "playhead">): Frame {
  const cached = frames.get(s.sphere);
  if (cached && cached.t === s.playhead) {
    return cached.frame;
  }
  const frame = s.sphere.frameAt(s.playhead);
  frames.set(s.sphere, { t: s.playhead, frame });
  return frame;
}

/** Where each targeted qubit would end up, and the path it would take. Hidden while replaying. */
function ghostsFor(s: JourneyView): GhostView | null {
  const preview = s.preview;
  if (!preview || !s.live) {
    return null;
  }
  const arrows = targets(s).flatMap((id) => {
    const q = s.sphere.qubit(id);
    if (!q) {
      return [];
    }
    const from = q.state.blochVector();
    let to: Vec3;
    let rotation: { axis: Vec3; angle: number };
    if (preview.kind === "gate") {
      const gate = resolveGate(preview.gate);
      to = gate.apply(q.state).blochVector();
      rotation = gate.axisAngle();
    } else {
      to = preview.state.blochVector();
      rotation = rotationBetween(from, to);
    }
    return [{ key: id, colorSlot: q.colorSlot, to, path: rotation.angle > 1e-9 ? arcPoints(from, rotation.axis, rotation.angle) : null, rotation }];
  });
  const turning = preview.kind === "gate" ? arrows.find((a) => a.rotation.angle > 1e-9) : undefined;
  return { arrows, axis: turning ? turning.rotation.axis : null };
}

/**
 * Turns a journey room's state into what its sphere draws. Each room makes one; it remembers its
 * last ghosts, so unchanged inputs give back the very same objects (and nothing re-renders).
 */
export function journeyProjector(): (s: JourneyView) => SceneView {
  let last: { s: JourneyView; ghosts: GhostView | null } | null = null;
  return (s) => {
    const same =
      last &&
      last.s.sphere === s.sphere &&
      last.s.preview === s.preview &&
      last.s.live === s.live &&
      last.s.selected === s.selected &&
      last.s.applyToAll === s.applyToAll;
    const ghosts = same ? last!.ghosts : ghostsFor(s);
    last = { s, ghosts };
    return { timeline: journeyTimeline(s.sphere), playhead: s.playhead, ghosts, hoverStep: s.hoverStep, selected: s.selected };
  };
}
