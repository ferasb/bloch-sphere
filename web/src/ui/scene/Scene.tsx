import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { scenePalette } from "../palette";
import { Ghost } from "./Ghost";
import { OverlayContext, OverlayProjector, OverlayRegistry } from "./overlay";
import { QubitArrows } from "./QubitArrows";
import { RotationAxis } from "./RotationAxis";
import { SceneSourceContext, useSceneSource, type SceneSource } from "./source";
import { SphereShell } from "./SphereShell";
import { StateLabels } from "./StateLabels";
import { TipLabels } from "./TipLabels";
import { Trail } from "./Trail";

const FOV = 30;
// Textbook view: +x toward the viewer and to the left, +y to the right, z (|0⟩) up.
const CAMERA_POSITION = new THREE.Vector3(3, 1.05, 1.25).setLength(5.8).toArray();

interface SceneProps {
  /** What to draw: a journey and a moment in it. */
  source: SceneSource;
  /** Extra 3D layers for this room (they render inside the canvas). */
  children?: ReactNode;
  /** Show the step's rotation axis always (default), or only while a step plays. */
  stepAxis?: "always" | "while-playing";
}

/** A 3D Bloch sphere. Draws the source's frame at its playhead; holds no state of its own. */
export function Scene({ source, children, stepAxis = "always" }: SceneProps) {
  const overlay = useMemo(() => new OverlayRegistry(), []);
  return (
    <SceneSourceContext.Provider value={source}>
      <OverlayContext.Provider value={overlay}>
        <Canvas
          flat
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ fov: FOV, near: 0.1, far: 100, up: [0, 0, 1], position: CAMERA_POSITION }}
        >
          <Setup />
          <SphereShell />
          <RotationAxis whilePlayingOnly={stepAxis === "while-playing"} />
          <Trail />
          <QubitArrows />
          <Ghost />
          {children}
          <OverlayProjector />
          <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3.2} maxDistance={12} />
        </Canvas>
        <div className="overlay-layer">
          <StateLabels />
          <TipLabels />
        </div>
      </OverlayContext.Provider>
    </SceneSourceContext.Provider>
  );
}

/** Background, lights, tall-window FOV, and redrawing whenever the source changes. */
function Setup() {
  const source = useSceneSource();
  const { camera, size, invalidate } = useThree();
  const light = useMemo(() => {
    // The key light rides with the camera, so the lit side always faces the viewer.
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(1, 1.5, 0.5);
    return key;
  }, []);

  useEffect(() => {
    camera.add(light);
    return () => {
      camera.remove(light);
    };
  }, [camera, light]);

  useEffect(() => {
    // FOV is vertical; widen it in tall windows so the sphere still fits horizontally.
    const perspective = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    perspective.fov = aspect >= 1 ? FOV : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / aspect));
    perspective.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  // frameloop="demand" only draws when asked: ask on every change of the source (playhead, preview, …).
  useEffect(() => source.subscribe(() => invalidate()), [source, invalidate]);

  return (
    <>
      <color attach="background" args={[scenePalette().background]} />
      <ambientLight intensity={2.2} />
      <primitive object={camera} />
    </>
  );
}
