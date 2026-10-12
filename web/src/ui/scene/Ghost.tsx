import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../math/vec3";
import { scenePalette } from "../palette";
import { ARROW_GEOMETRY, toVector3, Y_UP } from "./geometry";
import { useSceneSource } from "./source";

const AXIS_LENGTH = 1.3;

/**
 * A preview of what would happen: a faint arrow where each qubit would end up, the dashed path it
 * would take, and the dashed rotation axis. The room decides what to preview (SceneView.ghosts).
 */
export function Ghost() {
  const ghosts = useSceneSource().use((s) => s.ghosts);
  if (!ghosts) {
    return null;
  }
  const p = scenePalette();
  const axisEnd = ghosts.axis && toVector3(ghosts.axis).multiplyScalar(AXIS_LENGTH);
  return (
    <>
      {ghosts.arrows.map((g) => (
        <group key={g.key}>
          <GhostArrow to={g.to} color={p.qubits[g.colorSlot]} />
          {g.path && (
            <Line
              points={g.path.flatMap((v) => [v[0], v[1], v[2]])}
              color={p.qubits[g.colorSlot]}
              lineWidth={1.5}
              dashed
              dashSize={0.05}
              gapSize={0.04}
              transparent
              opacity={0.8}
            />
          )}
        </group>
      ))}
      {axisEnd && (
        <Line
          points={[axisEnd.clone().negate(), axisEnd]}
          color={p.rotationAxis}
          lineWidth={1.5}
          dashed
          dashSize={0.06}
          gapSize={0.045}
          transparent
          opacity={0.6}
        />
      )}
    </>
  );
}

/** A faint arrow: where a qubit would end up. */
export function GhostArrow({ to, color }: { to: Vec3; color: THREE.Color }) {
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y_UP, toVector3(to).normalize()), [to]);
  return (
    <mesh geometry={ARROW_GEOMETRY} quaternion={quaternion}>
      <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}
