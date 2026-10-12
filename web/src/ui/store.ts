import { create } from "zustand";
import { Qubit } from "../math/qubit";
import { Sphere, type Action, type GateSpec, type QubitId } from "../model/sphere";
import { loadSession, saveSession } from "../persist/session";
import { journeyPlayer } from "./playhead";
import { targets, type JourneyView, type Preview } from "./view";

/** The main room: its journey and view state (JourneyView), the Restore slot, and the actions. */
export interface AppState extends JourneyView {
  /** The sphere from before the last Reset, Set state or Run on sphere, while its Restore notice is up. */
  restorable: Sphere | null;
  /** What the Restore notice says happened. */
  restoreNote: string;

  dispatch(action: Action): void;
  applyGate(gate: GateSpec): void;
  /** Start a new journey from where the qubits are now, with the targets set to `state`. */
  setStartState(state: Qubit): void;
  addQubit(): void;
  removeQubit(id: QubitId): void;
  undo(): void;
  reset(): void;
  restore(): void;
  /** Replace the journey with another (from the Circuit Lab) and play it from the start. */
  loadJourney(sphere: Sphere, note: string): void;
  dismissRestore(): void;
  select(id: QubitId): void;
  setApplyToAll(on: boolean): void;
  setPreview(preview: Preview | null): void;
  setHoverStep(step: number | null): void;
  /** Replay: show the sphere as it was after `step`. Doesn't change the journey. */
  goToStep(step: number): void;
  backToLive(): void;
}

const initialSphere = loadSession() ?? Sphere.initial();

export const useApp = create<AppState>()((set, get) => ({
  sphere: initialSphere,
  restorable: null,
  restoreNote: "",
  playhead: initialSphere.lastIndex,
  live: true,
  selected: initialSphere.qubits[0].id,
  applyToAll: false,
  preview: null,
  hoverStep: null,

  dispatch(action) {
    const { sphere, playhead, live, selected } = get();
    const next = sphere.apply(action);
    set({
      sphere: next,
      restorable: null,
      // While replaying, jump to the end first, then play the new step from there.
      playhead: live ? playhead : sphere.lastIndex,
      live: true,
      selected: validSelection(next, selected),
    });
    player.play();
  },

  applyGate(gate) {
    get().dispatch({ kind: "gate", gate, targets: targets(get()) });
  },

  setStartState(state) {
    const { sphere } = get();
    const next = sphere.setStartState(targets(get()), state);
    player.stop();
    set({
      sphere: next,
      // Clearing a journey can't be undone with Undo, so offer Restore, as Reset does.
      restorable: sphere.canUndo ? sphere : null,
      restoreNote: "New start, journey cleared.",
      playhead: 0,
      live: true,
      preview: null,
    });
  },

  addQubit() {
    const { sphere, dispatch } = get();
    if (sphere.canAddQubit) {
      dispatch({ kind: "addQubit", state: Qubit.ZERO });
      // Select the newcomer, so the next gate acts on it.
      set({ selected: get().sphere.qubits.find((q) => !sphere.qubit(q.id))!.id });
    }
  },

  removeQubit(id) {
    if (get().sphere.canRemoveQubit) {
      get().dispatch({ kind: "removeQubit", target: id });
    }
  },

  undo() {
    const sphere = get().sphere.undo();
    player.stop();
    set({ sphere, playhead: sphere.lastIndex, live: true, selected: validSelection(sphere, get().selected) });
  },

  reset() {
    const { sphere } = get();
    player.stop();
    set({ sphere: sphere.reset(), restorable: sphere, restoreNote: "Journey cleared.", playhead: 0, live: true });
  },

  loadJourney(next, note) {
    const { sphere, selected } = get();
    player.stop();
    set({
      sphere: next,
      restorable: sphere.canUndo ? sphere : null,
      restoreNote: note,
      playhead: 0,
      live: true,
      preview: null,
      selected: validSelection(next, selected),
    });
    player.play();
  },

  restore() {
    const { restorable, selected } = get();
    if (restorable) {
      player.stop();
      set({ sphere: restorable, restorable: null, playhead: restorable.lastIndex, live: true, selected: validSelection(restorable, selected) });
    }
  },

  dismissRestore() {
    set({ restorable: null });
  },

  select(id) {
    if (get().sphere.qubit(id)) {
      set({ selected: id });
    }
  },

  setApplyToAll(on) {
    set({ applyToAll: on });
  },

  setPreview(preview) {
    set({ preview });
  },

  setHoverStep(step) {
    set({ hoverStep: step });
  },

  goToStep(step) {
    const { sphere } = get();
    player.stop();
    set({ playhead: Math.min(Math.max(step, 0), sphere.lastIndex), live: step >= sphere.lastIndex });
  },

  backToLive() {
    player.stop();
    set({ playhead: get().sphere.lastIndex, live: true });
  },
}));

useApp.subscribe((state, prev) => {
  if (state.sphere !== prev.sphere) {
    saveSession(state.sphere);
  }
});

function validSelection(sphere: Sphere, id: QubitId): QubitId {
  return sphere.qubit(id) ? id : sphere.qubits[0].id;
}

const player = journeyPlayer(useApp);
