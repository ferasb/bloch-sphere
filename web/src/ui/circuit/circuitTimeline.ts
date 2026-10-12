import type { Vec3 } from "../../math/vec3";
import { tileGate } from "../../model/bench";
import { blochAt, columns, type Run } from "../../model/circuit";
import type { SceneView } from "../scene/source";
import type { Timeline, TimelineFrame, TimelinePath } from "../scene/timeline";

/** Samples per column for drawing tip paths. */
const SAMPLES = 32;

const timelines = new WeakMap<Run, Timeline>();

/**
 * A circuit run as a Timeline: one step per column; each wire's arrow is its own Bloch vector
 * (shorter when entangled), exact partway through a column. Paths are sampled from those states, so
 * a CNOT's arrows draw their true path into the ball. Cached per run.
 */
export function circuitTimeline(run: Run): Timeline {
  let timeline = timelines.get(run);
  if (timeline) {
    return timeline;
  }
  const c = run.circuit;
  const cols = columns(c);
  const wires = c.wires.map((w) => ({ id: w.id, name: w.name, colorSlot: w.colorSlot }));
  let last: { t: number; frame: TimelineFrame } | null = null;
  const paths = new Map<number, TimelinePath[]>();
  const axes = new Map<number, Vec3 | null>();

  timeline = {
    lastIndex: cols.length,
    at(t) {
      if (last?.t === t) {
        return last.frame;
      }
      const time = Math.min(Math.max(t, 0), cols.length);
      const step = Math.ceil(time);
      const vectors = blochAt(run, time);
      const frame: TimelineFrame = {
        step,
        progress: step === 0 ? 1 : time - (step - 1),
        arrows: wires.map((wire, i) => ({ wire, vector: vectors[i], presence: 1 })),
      };
      last = { t, frame };
      return frame;
    },
    paths(step) {
      if (step < 1 || step > cols.length) {
        return [];
      }
      let out = paths.get(step);
      if (!out) {
        // A measurement jumps rather than moves: no path to draw.
        if (cols[step - 1].some((op) => op.kind === "measure")) {
          out = [];
        } else {
          const samples = Array.from({ length: SAMPLES + 1 }, (_, j) => blochAt(run, step - 1 + j / SAMPLES));
          out = wires.flatMap((wire, i) => {
            const points = samples.map((s) => s[i]);
            const moves = points.some((p) => Math.hypot(p[0] - points[0][0], p[1] - points[0][1], p[2] - points[0][2]) > 1e-6);
            return moves ? [{ key: `${step}-${wire.id}`, wire, points }] : [];
          });
        }
        paths.set(step, out);
      }
      return out;
    },
    axis(step) {
      if (!axes.has(step)) {
        const column = cols[step - 1];
        const only = column?.length === 1 ? column[0] : null;
        const rotation = only?.kind === "gate" ? tileGate(only.tile).axisAngle() : null;
        axes.set(step, rotation && rotation.angle > 1e-9 ? rotation.axis : null);
      }
      return axes.get(step)!;
    },
  };
  timelines.set(run, timeline);
  return timeline;
}

/** The Circuit Lab's sphere: the run at the playhead, the column under the pointer highlighted. */
export function circuitProjector(): (s: { run: Run; playhead: number; hoverStep: number | null }) => SceneView {
  return (s) => ({ timeline: circuitTimeline(s.run), playhead: s.playhead, ghosts: null, hoverStep: s.hoverStep, selected: "" });
}
