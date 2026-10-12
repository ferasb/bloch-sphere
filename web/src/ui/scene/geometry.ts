import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rotate, type Vec3 } from "../../math/vec3";

export const Y_UP = new THREE.Vector3(0, 1, 0);

export const toVector3 = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

const HEAD_LENGTH = 0.13;

/** A unit-length arrow along +y, shaft and cone merged into one geometry. Shared by every arrow. */
export const ARROW_GEOMETRY = (() => {
  const shaftLength = 1 - HEAD_LENGTH;
  const shaft = new THREE.CylinderGeometry(0.016, 0.016, shaftLength, 16).translate(0, shaftLength / 2, 0);
  const head = new THREE.ConeGeometry(0.05, HEAD_LENGTH, 24).translate(0, 1 - HEAD_LENGTH / 2, 0);
  return mergeGeometries([shaft, head])!;
})();

const ARC_SEGMENTS = 64;

/**
 * Points along the path `from` takes when rotated about `axis`, from 0 to angle·progress, as a flat
 * xyz array. Always ARC_SEGMENTS + 1 points, so a growing arc can reuse its line geometry.
 */
export function arcPositions(from: Vec3, axis: Vec3, angle: number, progress: number): number[] {
  const out: number[] = [];
  for (let k = 0; k <= ARC_SEGMENTS; k++) {
    out.push(...rotate(from, axis, (angle * progress * k) / ARC_SEGMENTS));
  }
  return out;
}

/** True when the sphere blocks the line of sight from `camera` to `point` (a point outside the sphere). */
export function hiddenBySphere(camera: THREE.Vector3, point: THREE.Vector3): boolean {
  const sight = point.clone().sub(camera);
  const t = THREE.MathUtils.clamp(-camera.dot(sight) / sight.lengthSq(), 0, 1);
  return camera.clone().addScaledVector(sight, t).length() < 1;
}
