import { rotate, type Vec3 } from "../../math/vec3";
import type { Sphere } from "../../model/sphere";

/**
 * What the 3D sphere draws, independent of where it comes from (design-gates.md §6.1): qubits whose
 * arrows move over time. A journey (Sphere room, Gate Lab) becomes a Timeline through an adapter;
 * anything else drawn on a sphere can bring its own. Arrows can be shorter than 1 (a qubit
 * entangled with others, in a circuit), so the scene isn't limited to independent qubits.
 */
export interface TimelineWire {
  id: string;
  name: string;
  colorSlot: number;
}

export interface TimelineArrow {
  wire: TimelineWire;
  /** The qubit's Bloch vector: length 1 for a qubit with a state of its own, shorter when entangled. */
  vector: Vec3;
  /** 1 normally; between 0 and 1 while a qubit appears or disappears. */
  presence: number;
}

export interface TimelineFrame {
  /** The step being played: t lies in (step − 1, step]. 0 at the start. */
  step: number;
  /** How far into `step`, from 0 to 1. */
  progress: number;
  arrows: readonly TimelineArrow[];
}

export interface TimelinePath {
  key: string;
  wire: TimelineWire;
  /** Where the tip goes during the step, from its start to its end, sampled finely enough to draw. */
  points: readonly Vec3[];
}

export interface Timeline {
  /** The last step, which is also the largest time. */
  readonly lastIndex: number;
  /** The arrows at time t (clamped to [0, lastIndex]). */
  at(t: number): TimelineFrame;
  /** The tip paths during step k (from t = k − 1 to k); empty for k = 0. */
  paths(step: number): readonly TimelinePath[];
  /** The rotation axis to show for step k, when the step is a single rotation. */
  axis(step: number): Vec3 | null;
}

/** Ghost arrows previewing an action, and its rotation axis. */
export interface GhostView {
  arrows: readonly { key: string; colorSlot: number; to: Vec3; path: readonly Vec3[] | null }[];
  axis: Vec3 | null;
}

const PATH_SEGMENTS = 64;

/** Points along the arc `from` takes when rotated about `axis` by `angle`. */
export function arcPoints(from: Vec3, axis: Vec3, angle: number): Vec3[] {
  return Array.from({ length: PATH_SEGMENTS + 1 }, (_, k) => rotate(from, axis, (angle * k) / PATH_SEGMENTS));
}

const journeys = new WeakMap<Sphere, Timeline>();

/** A journey as a Timeline: arrows from each qubit's state, arcs from each step's rotations. Cached per journey. */
export function journeyTimeline(sphere: Sphere): Timeline {
  let timeline = journeys.get(sphere);
  if (timeline) {
    return timeline;
  }
  let last: { t: number; frame: TimelineFrame } | null = null;
  const paths = new Map<number, TimelinePath[]>();
  timeline = {
    lastIndex: sphere.lastIndex,
    at(t) {
      if (last?.t === t) {
        return last.frame;
      }
      const f = sphere.frameAt(t);
      const frame: TimelineFrame = {
        step: f.step,
        progress: f.progress,
        arrows: f.qubits.map((q) => ({
          wire: { id: q.entry.id, name: q.entry.name, colorSlot: q.entry.colorSlot },
          vector: q.state.blochVector(),
          presence: q.presence,
        })),
      };
      last = { t, frame };
      return frame;
    },
    paths(step) {
      if (step < 1 || step > sphere.lastIndex) {
        return [];
      }
      let out = paths.get(step);
      if (!out) {
        const before = sphere.steps[step - 1];
        out = [...sphere.steps[step].motions].flatMap(([id, motion]) => {
          const q = before.qubits.find((entry) => entry.id === id);
          if (motion.kind !== "rotate" || motion.angle < 1e-9 || !q) {
            return [];
          }
          return [{ key: `${step}-${id}`, wire: { id, name: q.name, colorSlot: q.colorSlot }, points: arcPoints(q.state.blochVector(), motion.axis, motion.angle) }];
        });
        paths.set(step, out);
      }
      return out;
    },
    axis(step) {
      const s = sphere.steps[step];
      if (s?.action?.kind !== "gate") {
        return null;
      }
      const motion = [...s.motions.values()].find((m) => m.kind === "rotate");
      return motion?.kind === "rotate" && motion.angle > 0 ? motion.axis : null;
    },
  };
  journeys.set(sphere, timeline);
  return timeline;
}
