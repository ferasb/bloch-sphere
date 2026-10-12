import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import * as THREE from "three";
import { hiddenBySphere } from "./geometry";

/**
 * HTML labels pinned to 3D points. Labels are ordinary React elements in a layer over the canvas
 * (<OverlayLabel>); one component inside the canvas (<OverlayProjector>) moves them to their
 * projected screen positions every frame. They meet in a registry, one per scene.
 */
interface OverlayItem {
  el: HTMLElement;
  /** Where the label sits in 3D, or null to hide it. Read every frame. */
  position: () => THREE.Vector3 | null;
  dimBehindSphere: boolean;
}

export class OverlayRegistry {
  readonly items = new Map<string, OverlayItem>();
  requestFrame: (() => void) | null = null;
}

export const OverlayContext = createContext<OverlayRegistry | null>(null);

function useRegistry(): OverlayRegistry {
  const registry = useContext(OverlayContext);
  if (!registry) {
    throw new Error("Overlay components need an OverlayContext provider");
  }
  return registry;
}

const projected = new THREE.Vector3();

export function OverlayProjector() {
  const registry = useRegistry();
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    registry.requestFrame = invalidate;
    invalidate();
    return () => {
      registry.requestFrame = null;
    };
  }, [registry, invalidate]);

  useFrame(({ camera, size }) => {
    for (const item of registry.items.values()) {
      const position = item.position();
      projected.copy(position ?? projected).project(camera);
      if (!position || projected.z > 1) {
        item.el.style.visibility = "hidden";
        continue;
      }
      const x = ((projected.x + 1) / 2) * size.width;
      const y = ((1 - projected.y) / 2) * size.height;
      item.el.style.visibility = "visible";
      item.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      item.el.style.opacity = item.dimBehindSphere && hiddenBySphere(camera.position, position) ? "0.35" : "1";
    }
  });
  return null;
}

interface OverlayLabelProps {
  id: string;
  position: () => THREE.Vector3 | null;
  className: string;
  /** Labels are drawn over the canvas, so the sphere never hides them; dim them instead. */
  dimBehindSphere?: boolean;
  children: ReactNode;
}

export function OverlayLabel({ id, position, className, dimBehindSphere = true, children }: OverlayLabelProps) {
  const registry = useRegistry();
  const ref = useCallback(
    (el: HTMLSpanElement | null) => {
      if (el) {
        registry.items.set(id, { el, position, dimBehindSphere });
        registry.requestFrame?.();
      } else {
        registry.items.delete(id);
      }
    },
    [registry, id, position, dimBehindSphere],
  );
  return (
    <span ref={ref} className={`overlay-label ${className}`}>
      {children}
    </span>
  );
}
