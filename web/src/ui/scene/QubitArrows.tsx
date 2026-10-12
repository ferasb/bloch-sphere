import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { length } from "../../math/vec3";
import { scenePalette } from "../palette";
import { ARROW_GEOMETRY, toVector3, Y_UP } from "./geometry";
import { useSceneSource } from "./source";

/** One arrow per qubit at the playhead, including qubits fading in or out. */
export function QubitArrows() {
  const source = useSceneSource();
  // A string, so this only re-renders when the set of qubits changes, not every frame.
  const ids = source.use((s) =>
    s.timeline
      .at(s.playhead)
      .arrows.map((a) => a.wire.id)
      .join(" "),
  );
  return ids.split(" ").map((id) => <Arrow key={id} id={id} />);
}

/**
 * Positions itself every frame from the playhead, without re-rendering React. Its length is the
 * Bloch vector's: an entangled qubit's arrow is shorter, and vanishes at the center.
 */
function Arrow({ id }: { id: string }) {
  const source = useSceneSource();
  const group = useRef<THREE.Group>(null!);
  const material = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(() => {
    const s = source.get();
    const a = s.timeline.at(s.playhead).arrows.find((arrow) => arrow.wire.id === id);
    const size = a ? length(a.vector) : 0;
    group.current.visible = size > 1e-3;
    if (!a || size <= 1e-3) {
      return;
    }
    group.current.quaternion.setFromUnitVectors(Y_UP, toVector3(a.vector).normalize());
    group.current.scale.setScalar(size);
    material.current.color.copy(scenePalette().qubits[a.wire.colorSlot]);
    material.current.opacity = a.presence;
  });

  return (
    <group ref={group}>
      <mesh geometry={ARROW_GEOMETRY}>
        <meshStandardMaterial ref={material} roughness={0.45} transparent />
      </mesh>
    </group>
  );
}
