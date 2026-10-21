import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../math/vec3";
import { scenePalette } from "../palette";
import { toVector3 } from "./geometry";
import { GhostArrow } from "./Ghost";

const Z = new THREE.Vector3(0, 0, 1);

/** A goal on the sphere: a ring lying on the surface around a point, and a faint arrow to it. */
export function TargetMarker({ to, colorSlot }: { to: Vec3; colorSlot: number }) {
  const color = scenePalette().qubits[colorSlot];
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Z, toVector3(to).normalize()), [to]);
  return (
    <group>
      <GhostArrow to={to} color={color} />
      <mesh position={toVector3(to)} quaternion={quaternion}>
        <torusGeometry args={[0.1, 0.012, 12, 48]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
