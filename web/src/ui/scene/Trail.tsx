import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ComponentRef } from "react";
import type { Vec3 } from "../../math/vec3";
import { scenePalette } from "../palette";
import { useSceneSource } from "./source";
import type { TimelinePath } from "./timeline";

/** How many steps back the trail reaches. */
const MAX_TRAIL = 30;

interface Segment extends TimelinePath {
  step: number;
}

/** Older paths fade; the hovered step's paths stand out. */
function look(age: number, highlighted: boolean) {
  return highlighted ? { lineWidth: 3.5, opacity: 1 } : { lineWidth: 2, opacity: Math.max(0.15, 0.85 - 0.1 * age) };
}

const flat = (points: readonly Vec3[]) => points.flatMap((p) => [p[0], p[1], p[2]]);

/**
 * The path each qubit's tip has traveled, step by step, up to the playhead. The step being played
 * grows as it plays.
 */
export function Trail() {
  const source = useSceneSource();
  const timeline = source.use((s) => s.timeline);
  const current = source.use((s) => s.timeline.at(s.playhead).step);
  const hover = source.use((s) => s.hoverStep);
  const segments = useMemo(() => {
    const out: Segment[] = [];
    for (let k = Math.max(1, current - MAX_TRAIL + 1); k <= current; k++) {
      out.push(...timeline.paths(k).map((p) => ({ ...p, step: k })));
    }
    return out;
  }, [timeline, current]);

  return segments.map((segment) =>
    segment.step === current ? (
      <GrowingPath key={segment.key} segment={segment} highlighted={hover === segment.step} />
    ) : (
      <StaticPath key={segment.key} segment={segment} age={current - segment.step} highlighted={hover === segment.step} />
    ),
  );
}

function StaticPath({ segment, age, highlighted }: { segment: Segment; age: number; highlighted: boolean }) {
  const points = useMemo(() => flat(segment.points), [segment]);
  return <Line points={points} color={scenePalette().qubits[segment.wire.colorSlot]} transparent {...look(age, highlighted)} />;
}

/** The path so far: the samples already passed, then the tip where it is now (padded to a fixed count). */
function GrowingPath({ segment, highlighted }: { segment: Segment; highlighted: boolean }) {
  const source = useSceneSource();
  const line = useRef<ComponentRef<typeof Line>>(null!);
  const full = useMemo(() => flat(segment.points), [segment]);

  useFrame(() => {
    const s = source.get();
    const frame = s.timeline.at(s.playhead);
    const progress = frame.step === segment.step ? frame.progress : 1;
    const n = segment.points.length - 1;
    const passed = segment.points.slice(0, Math.floor(progress * n) + 1);
    const tip = frame.arrows.find((a) => a.wire.id === segment.wire.id)?.vector ?? segment.points[n];
    const shown = progress >= 1 ? segment.points : [...passed, tip];
    const padded = [...shown, ...Array.from({ length: segment.points.length - shown.length }, () => shown[shown.length - 1])];
    line.current.geometry.setPositions(flat(padded));
  });

  return <Line ref={line} points={full} color={scenePalette().qubits[segment.wire.colorSlot]} transparent {...look(0, highlighted)} />;
}
