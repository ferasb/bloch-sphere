import { NAMED_STATES } from "../math/qubit";
import { cross, dot, normalize, rotate, type Vec3 } from "../math/vec3";

/**
 * Bloch spheres drawn as SVG when the Learn pages are built, from the same math as the app. Seen from
 * the app's own starting view (CAMERA_POSITION in ui/scene/Scene.tsx: +x toward the viewer and to
 * the left, +y to the right, z up), so a picture here looks like the sphere there. Colors are CSS
 * tokens (learn.css), so the figures follow the light and dark themes.
 */

const VIEW = normalize([3, 1.05, 1.25]);
const RIGHT = normalize(cross([0, 0, 1], VIEW));
const UP = cross(VIEW, RIGHT);

/** Sphere radius in SVG units. */
const R = 100;
const LABEL_RADIUS = 1.27;
const AXIS_LENGTH = 1.12;
const HEAD = 0.15;

type Point = [number, number];

/** Screen position (y down) and depth (positive toward the viewer). */
function project(p: Vec3): { x: number; y: number; depth: number } {
  return { x: dot(p, RIGHT) * R, y: -dot(p, UP) * R, depth: dot(p, VIEW) };
}

function pathData(points: readonly Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

/** A 3D polyline as SVG paths, split where it passes behind the sphere's center plane. */
function split(points: readonly Vec3[]): { front: string[]; back: string[] } {
  const front: string[] = [];
  const back: string[] = [];
  let run: Point[] = [];
  let runFront = true;
  points.forEach((p, i) => {
    const s = project(p);
    const isFront = s.depth >= -1e-9;
    if (i > 0 && isFront !== runFront) {
      run.push([s.x, s.y]);
      (runFront ? front : back).push(pathData(run));
      run = [];
    }
    runFront = isFront;
    run.push([s.x, s.y]);
  });
  if (run.length > 1) {
    (runFront ? front : back).push(pathData(run));
  }
  return { front, back };
}

function greatCircle(u: Vec3, v: Vec3): Vec3[] {
  return Array.from({ length: 129 }, (_, i) => {
    const t = (i / 128) * 2 * Math.PI;
    return [u[0] * Math.cos(t) + v[0] * Math.sin(t), u[1] * Math.cos(t) + v[1] * Math.sin(t), u[2] * Math.cos(t) + v[2] * Math.sin(t)] as Vec3;
  });
}

function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k];
}

/** Points along the path `from` takes when turned by `angle` about `axis`. */
function arc(from: Vec3, axis: Vec3, angle: number, radius = 1): Vec3[] {
  const steps = Math.max(8, Math.ceil((Math.abs(angle) / Math.PI) * 64));
  return Array.from({ length: steps + 1 }, (_, i) => scale(rotate(from, axis, (angle * i) / steps), radius));
}

/** Hidden behind the sphere: on the far side, and within its outline. */
function hidden(p: Vec3): boolean {
  const s = project(p);
  return s.depth < 0 && Math.hypot(s.x, s.y) < R;
}

export interface FigureArrow {
  /** The arrow's tip, a unit vector (a state's Bloch vector). */
  to: Vec3;
  /** Qubit color slot, 1–5. */
  color?: number;
  /** Dashed and faint: where a state was, or where it's going. */
  ghost?: boolean;
  /** A name beside the tip. */
  label?: string;
}

export interface FigureArc {
  from: Vec3;
  axis: Vec3;
  /** Radians, right-hand rule about the axis. */
  angle: number;
  color?: number;
  /** Dashed: a shortcut, like the one rotation a sequence of gates adds up to. */
  dashed?: boolean;
}

export interface SphereFigureProps {
  /** Unique within the page; ties the picture to its description. */
  id: string;
  /** What the picture shows, for screen readers and search engines. */
  description: string;
  arrows?: FigureArrow[];
  arcs?: FigureArc[];
  /** Rotation axes, drawn dashed through the sphere, each with an optional name at its end. */
  axes?: { axis: Vec3; label?: string }[];
  /** Mark θ and φ for this state: the angle down from |0⟩, and around the equator from |+⟩. */
  angles?: Vec3;
  /** Mark how high the arrow sits: a level line from its tip to the z axis. */
  height?: Vec3;
  /** Dots on the surface (states without arrows). */
  dots?: { at: Vec3; color?: number }[];
  /** Hide the six state labels. */
  plain?: boolean;
}

function Arrow({ to, color = 1, ghost, label }: FigureArrow) {
  const tip = project(to);
  const base = project(scale(to, 1 - HEAD));
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const length = Math.hypot(dx, dy);
  // Seen end-on, the head is a dot.
  const [ux, uy] = length > 1e-6 ? [dx / length, dy / length] : [0, 0];
  const w = 0.06 * R;
  const head =
    length > 2
      ? `M${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${(base.x - uy * w).toFixed(1)} ${(base.y + ux * w).toFixed(1)}L${(base.x + uy * w).toFixed(1)} ${(base.y - ux * w).toFixed(1)}Z`
      : null;
  const labelAt = project(scale(to, 1.12));
  return (
    <g className={`fig-arrow q${color}${ghost ? " ghost" : ""}`}>
      <line x1={0} y1={0} x2={base.x.toFixed(1)} y2={base.y.toFixed(1)} />
      {head ? <path d={head} /> : <circle cx={tip.x.toFixed(1)} cy={tip.y.toFixed(1)} r={w} />}
      {label && (
        <text className="fig-tip" x={(labelAt.x + 10).toFixed(1)} y={(labelAt.y - 6).toFixed(1)}>
          {label}
        </text>
      )}
    </g>
  );
}

function Paths({ points, className }: { points: readonly Vec3[]; className: string }) {
  const { front, back } = split(points);
  return (
    <>
      {back.map((d, i) => (
        <path key={`b${i}`} className={`${className} back`} d={d} />
      ))}
      {front.map((d, i) => (
        <path key={`f${i}`} className={className} d={d} />
      ))}
    </>
  );
}

/** Where a label goes for a point outside the sphere, nudged away from the center. */
function labelPosition(p: Vec3): { x: number; y: number } {
  const s = project(p);
  return { x: s.x, y: s.y + 5 };
}

/** The θ and φ marks for a state: two arcs, their letters, and the arrow's shadow on the equator. */
function Angles({ state }: { state: Vec3 }) {
  const [x, y, z] = state;
  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  const phi = Math.atan2(y, x);
  const rho = Math.hypot(x, y);
  const foot: Vec3 = rho > 1e-9 ? [x, y, 0] : [0, 0, 0];
  const planeAxis = rho > 1e-9 ? normalize(cross([0, 0, 1], [x / rho, y / rho, 0])) : ([0, 1, 0] as Vec3);
  const thetaArc = arc([0, 0, 1], planeAxis, theta, 0.32);
  const phiArc = arc([1, 0, 0], [0, 0, 1], phi < 0 ? phi + 2 * Math.PI : phi, 0.42);
  const thetaMid = project(rotate([0, 0, 0.44], planeAxis, theta / 2));
  const phiMid = project(rotate([0.58, 0, 0], [0, 0, 1], (phi < 0 ? phi + 2 * Math.PI : phi) / 2));
  const tip = project(state);
  const footScreen = project(foot);
  return (
    <g className="fig-angles">
      <line className="fig-shadow" x1={0} y1={0} x2={footScreen.x.toFixed(1)} y2={footScreen.y.toFixed(1)} />
      <line className="fig-shadow" x1={tip.x.toFixed(1)} y1={tip.y.toFixed(1)} x2={footScreen.x.toFixed(1)} y2={footScreen.y.toFixed(1)} />
      <path className="fig-angle" d={pathData(thetaArc.map((p) => [project(p).x, project(p).y]))} />
      {rho > 1e-9 && <path className="fig-angle" d={pathData(phiArc.map((p) => [project(p).x, project(p).y]))} />}
      <text className="fig-angle-label" x={thetaMid.x.toFixed(1)} y={thetaMid.y.toFixed(1)}>
        θ
      </text>
      {rho > 1e-9 && (
        <text className="fig-angle-label" x={phiMid.x.toFixed(1)} y={(phiMid.y + 4).toFixed(1)}>
          φ
        </text>
      )}
    </g>
  );
}

/** The arrow's height: a level line from its tip across to the z axis, and that stretch of the axis. */
function Height({ state }: { state: Vec3 }) {
  const tip = project(state);
  const level = project([0, 0, state[2]]);
  const bottom = project([0, 0, -1]);
  return (
    <g className="fig-height">
      <line className="fig-shadow" x1={tip.x.toFixed(1)} y1={tip.y.toFixed(1)} x2={level.x.toFixed(1)} y2={level.y.toFixed(1)} />
      <line className="fig-level" x1={bottom.x.toFixed(1)} y1={bottom.y.toFixed(1)} x2={level.x.toFixed(1)} y2={level.y.toFixed(1)} />
      <circle className="fig-level-dot" cx={level.x.toFixed(1)} cy={level.y.toFixed(1)} r={3.5} />
    </g>
  );
}

/** A Bloch sphere with arrows, rotation arcs and axes, as an inline SVG. */
export function SphereFigure({ id, description, arrows = [], arcs = [], axes = [], angles, height, dots = [], plain }: SphereFigureProps) {
  const circles = [
    greatCircle([1, 0, 0], [0, 1, 0]),
    greatCircle([1, 0, 0], [0, 0, 1]),
    greatCircle([0, 1, 0], [0, 0, 1]),
  ];
  const axisLines: Vec3[][] = [
    [
      [-AXIS_LENGTH, 0, 0],
      [AXIS_LENGTH, 0, 0],
    ],
    [
      [0, -AXIS_LENGTH, 0],
      [0, AXIS_LENGTH, 0],
    ],
    [
      [0, 0, -AXIS_LENGTH],
      [0, 0, AXIS_LENGTH],
    ],
  ];
  // Lines are split by depth, so the part behind the sphere draws dashed.
  const sampled = (a: Vec3, b: Vec3) => Array.from({ length: 33 }, (_, i) => [0, 1, 2].map((k) => a[k] + ((b[k] - a[k]) * i) / 32) as unknown as Vec3);

  return (
    <svg className="sphere-figure" viewBox="-158 -138 316 276" role="img" aria-labelledby={`${id}-title`}>
      <title id={`${id}-title`}>{description}</title>
      <circle className="fig-sphere" cx={0} cy={0} r={R} />
      {circles.map((points, i) => (
        <Paths key={i} points={points} className="fig-circle" />
      ))}
      {axisLines.map(([a, b], i) => (
        <Paths key={i} points={sampled(a, b)} className="fig-axis" />
      ))}
      {height && <Height state={height} />}
      {angles && <Angles state={angles} />}
      {axes.map(({ axis, label }, i) => {
        // A named axis reaches past the sphere to its name; one without stops short of the state labels.
        const reach = label ? 1.3 : AXIS_LENGTH;
        const end = scale(axis, reach);
        const at = project(end);
        return (
          <g key={i}>
            <Paths points={sampled(scale(axis, -reach), end)} className="fig-rotation-axis" />
            {label && (
              <text className="fig-axis-label" x={(at.x + (at.x >= 0 ? 8 : -8)).toFixed(1)} y={(at.y - 4).toFixed(1)} textAnchor={at.x >= 0 ? "start" : "end"}>
                {label}
              </text>
            )}
          </g>
        );
      })}
      {arcs.map(({ from, axis, angle, color = 1, dashed }, i) => (
        <g key={i} className={`fig-arc q${color}${dashed ? " dashed" : ""}`}>
          <Paths points={arc(from, axis, angle)} className="fig-arc-path" />
        </g>
      ))}
      {dots.map(({ at, color = 1 }, i) => {
        const s = project(at);
        return <circle key={i} className={`fig-dot q${color}${hidden(at) ? " behind" : ""}`} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={4.5} />;
      })}
      {arrows.map((a, i) => (
        <Arrow key={i} {...a} />
      ))}
      {!plain &&
        NAMED_STATES.map(({ label, state }) => {
          const p = scale(state.blochVector(), LABEL_RADIUS);
          const at = labelPosition(p);
          return (
            <text key={label} className={`fig-label${hidden(p) ? " behind" : ""}`} x={at.x.toFixed(1)} y={at.y.toFixed(1)}>
              {label}
            </text>
          );
        })}
    </svg>
  );
}
