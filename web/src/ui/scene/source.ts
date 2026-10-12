import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { GhostView, Timeline } from "./timeline";

/** What a 3D scene draws: a timeline and a moment in it, plus ghosts and highlights. */
export interface SceneView {
  timeline: Timeline;
  playhead: number;
  ghosts: GhostView | null;
  /** The step under the pointer; its paths are highlighted. */
  hoverStep: number | null;
  /** The qubit whose tip label is emphasized. */
  selected: string;
}

/**
 * Where a 3D scene gets what it draws. Each room passes one built from its own store; scene
 * components never import a particular store.
 */
export interface SceneSource {
  /** Subscribe to a slice, React-style: re-renders when the slice changes. A hook. */
  use<U>(selector: (s: SceneView) => U): U;
  /** The current view, for reading inside useFrame without re-rendering React. */
  get(): SceneView;
  subscribe(listener: () => void): () => void;
}

/**
 * A SceneSource over a Zustand store, through `project` (store state → SceneView). `project` must
 * return the same field values for unchanged inputs, so selectors stay stable. Create it once.
 */
export function sourceFrom<S>(store: UseBoundStore<StoreApi<S>>, project: (s: S) => SceneView): SceneSource {
  return {
    use: (selector) => store((s) => selector(project(s))),
    get: () => project(store.getState()),
    subscribe: (listener) => store.subscribe(listener),
  };
}

export const SceneSourceContext = createContext<SceneSource | null>(null);

export function useSceneSource(): SceneSource {
  const source = useContext(SceneSourceContext);
  if (!source) {
    throw new Error("Scene components need a SceneSourceContext provider");
  }
  return source;
}
