export type Vec3 = readonly [number, number, number];

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function normalize(v: Vec3): Vec3 {
  const n = length(v);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * The shortest rotation taking unit vector `from` to unit vector `to`: `angle` in [0, π] about unit `axis`.
 * For opposite vectors every perpendicular axis works; one is picked. For equal vectors the angle is 0.
 */
export function rotationBetween(from: Vec3, to: Vec3): { axis: Vec3; angle: number } {
  const c = cross(from, to);
  const angle = Math.atan2(length(c), dot(from, to));
  if (angle < 1e-12) {
    return { axis: [0, 0, 1], angle: 0 };
  }
  if (length(c) > 1e-9) {
    return { axis: normalize(c), angle };
  }
  const helper: Vec3 = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  return { axis: normalize(cross(from, helper)), angle };
}

/** Rotate v by `angle` (radians, right-hand rule) about the unit vector `axis` (Rodrigues' formula). */
export function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = cross(axis, v);
  const d = dot(axis, v) * (1 - c);
  return [
    v[0] * c + k[0] * s + axis[0] * d,
    v[1] * c + k[1] * s + axis[1] * d,
    v[2] * c + k[2] * s + axis[2] * d,
  ];
}
