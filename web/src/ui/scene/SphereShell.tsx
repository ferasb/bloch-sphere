import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../math/vec3";
import { scenePalette } from "../palette";
import { toVector3 } from "./geometry";

const AXIS_LENGTH = 1.12;
const CIRCLES: [Vec3, Vec3][] = [
  [[1, 0, 0], [0, 1, 0]], // equator
  [[1, 0, 0], [0, 0, 1]],
  [[0, 1, 0], [0, 0, 1]],
];
const AXES: Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function circle(u: Vec3, v: Vec3): THREE.Vector3[] {
  return Array.from({ length: 129 }, (_, i) => {
    const t = (i / 128) * 2 * Math.PI;
    return toVector3(u).multiplyScalar(Math.cos(t)).addScaledVector(toVector3(v), Math.sin(t));
  });
}

/** The faint sphere, its three reference circles, and the x, y, z axes. */
export function SphereShell() {
  const p = scenePalette();
  const circles = useMemo(() => CIRCLES.map(([u, v]) => circle(u, v)), []);
  return (
    <group>
      {/* Drawn after the arrows, so arrows inside show through it. */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshStandardMaterial color={p.sphere} transparent opacity={0.12} roughness={0.7} depthWrite={false} />
      </mesh>
      {circles.map((points, i) => (
        <Line key={i} points={points} color={p.sphereLine} lineWidth={1} />
      ))}
      {AXES.map((e, i) => {
        const end = toVector3(e).multiplyScalar(AXIS_LENGTH);
        return <Line key={i} points={[end.clone().negate(), end]} color={p.axis} lineWidth={1} />;
      })}
      <mesh>
        <sphereGeometry args={[0.025, 16, 8]} />
        <meshBasicMaterial color={p.axis} />
      </mesh>
    </group>
  );
}
