import type { Complex } from "../../math/complex";

interface AmplitudeCircleProps {
  amplitude: Complex;
  size: number;
  /** CSS color for the filled disk. */
  fill: string;
  label?: string;
}

/**
 * Circle notation (from "Programming Quantum Computers"): the filled disk's radius is the
 * amplitude's magnitude, so its area is the probability; the line is the phase, pointing up for
 * phase 0 and turning counterclockwise as the phase grows.
 */
export function AmplitudeCircle({ amplitude, size, fill, label }: AmplitudeCircleProps) {
  const c = size / 2;
  const r = c - 1.5;
  const magnitude = amplitude.abs();
  const phase = amplitude.arg();
  const x = c - r * Math.sin(phase);
  const y = c - r * Math.cos(phase);
  const visible = magnitude > 1e-6;
  return (
    <svg className="amplitude-circle" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle className="amplitude-rim" cx={c} cy={c} r={r} />
      {visible && <circle cx={c} cy={c} r={r * magnitude} style={{ fill }} />}
      {visible && (
        <>
          {/* A dark halo under a light line, so the phase reads over the fill and the background. */}
          <line className="amplitude-phase-halo" x1={c} y1={c} x2={x} y2={y} />
          <line className="amplitude-phase" x1={c} y1={c} x2={x} y2={y} />
        </>
      )}
    </svg>
  );
}
