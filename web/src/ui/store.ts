import { create } from "zustand";
import { Qubit } from "../math/qubit";
import { allows, challengeById, challengeStart, progress } from "../model/challenges";
import { Sphere, type Action, type GateSpec, type QubitId } from "../model/sphere";
import { loadStars, saveStars } from "../persist/challenges";
import { loadChallenge, loadSession, saveChallenge, saveSession } from "../persist/session";
import { makePlayer } from "./playhead";
import { targets, type JourneyView, type Preview } from "./view";

/** The main room: its journey and view state (JourneyView), the Restore slot, and the actions. */
export interface AppState extends JourneyView {
  /** The sphere from before the last Reset or Set state, while its Restore notice is up. */
  restorable: Sphere | null;
  /** What the Restore notice says happened. */
  restoreNote: string;
  /** The challenge being played (model/challenges.ts), by id, or null. */
  challenge: string | null;
  /** The challenge Restore goes back to, along with `restorable`. */
  restoreChallenge: string | null;
  /** The best stars earned in each challenge, in this browser. */
  stars: Record<string, number>;

  dispatch(action: Action): void;
  applyGate(gate: GateSpec): void;
  /** Start a new journey from where the qubits are now, with the targets set to `state`. */
  setStartState(state: Qubit): void;
  /** Open a link (model/link.ts): a new journey with these qubits, then the gates played on all of them. */
  openLink(start: readonly Qubit[], gates: readonly GateSpec[]): void;
  addQubit(): void;
  removeQubit(id: QubitId): void;
  undo(): void;
  reset(): void;
  restore(): void;
  dismissRestore(): void;
  select(id: QubitId): void;
  setApplyToAll(on: boolean): void;
  setPreview(preview: Preview | null): void;
  setHoverStep(step: number | null): void;
  /** Replay: show the sphere as it was after `step`. Doesn't change the journey. */
  goToStep(step: number): void;
  backToLive(): void;
  /** Start a challenge: a new journey with q1 alone at its start. Only its gates work until it's left. */
  startChallenge(id: string): void;
  leaveChallenge(): void;
}

const initialSphere = loadSession() ?? Sphere.initial();
// A challenge survives a reload only together with its attempt: q1 alone, as challenges have it.
const initialChallenge = initialSphere.qubits.length === 1 ? challengeById(loadChallenge())?.id ?? null : null;

/** How long a link's starting states show before its gates play. */
const LINK_DELAY_MS = 700;

export const useApp = create<AppState>()((set, get) => ({
  sphere: initialSphere,
  restorable: null,
  restoreNote: "",
  challenge: initialChallenge,
  restoreChallenge: null,
  stars: loadStars(),
  playhead: initialSphere.lastIndex,
  live: true,
  selected: initialSphere.qubits[0].id,
  applyToAll: false,
  preview: null,
  hoverStep: null,

  dispatch(action) {
    const { sphere, playhead, live, selected, challenge } = get();
    const c = challengeById(challenge);
    if (c && !allows(c, action)) {
      return;
    }
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
    const { sphere, challenge } = get();
    if (challenge) {
      return;
    }
    const next = sphere.setStartState(targets(get()), state);
    player.stop();
    set({
      sphere: next,
      // Clearing a journey can't be undone with Undo, so offer Restore, as Reset does.
      restorable: sphere.canUndo ? sphere : null,
      restoreChallenge: null,
      restoreNote: "New start, journey cleared.",
      playhead: 0,
      live: true,
      preview: null,
    });
  },

  openLink(start, gates) {
    const { sphere, challenge } = get();
    const ids = start.map((_, i) => String(i + 1));
    const next = gates.reduce(
      (journey, gate) => journey.apply({ kind: "gate", gate, targets: ids }),
      Sphere.fromStart(
        start.map((state, i) => ({ id: ids[i], name: `q${i + 1}`, colorSlot: i + 1, state })),
        start.length + 1,
      ),
    );
    player.stop();
    set({
      sphere: next,
      restorable: sphere.canUndo ? sphere : null,
      restoreChallenge: challenge,
      restoreNote: "Opened from a link, journey replaced.",
      challenge: null,
      // At the start, then the steps play after a moment to see where the qubits begin.
      playhead: 0,
      live: true,
      selected: ids[0],
      // The link's gates act on every qubit, and so do the next ones clicked.
      applyToAll: start.length > 1,
      preview: null,
    });
    setTimeout(() => {
      if (get().sphere === next) {
        player.play();
      }
    }, LINK_DELAY_MS);
  },

  addQubit() {
    const { sphere, dispatch, challenge } = get();
    if (sphere.canAddQubit && !challenge) {
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
    const { sphere, challenge } = get();
    const c = challengeById(challenge);
    player.stop();
    set({
      // In a challenge, Reset starts the attempt over.
      sphere: c ? challengeStart(c) : sphere.reset(),
      restorable: sphere,
      restoreChallenge: challenge,
      restoreNote: c ? "Challenge restarted." : "Journey cleared.",
      playhead: 0,
      live: true,
    });
  },

  restore() {
    const { restorable, restoreChallenge, selected } = get();
    if (restorable) {
      player.stop();
      set({
        sphere: restorable,
        restorable: null,
        challenge: restoreChallenge,
        playhead: restorable.lastIndex,
        live: true,
        selected: validSelection(restorable, selected),
      });
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

  startChallenge(id) {
    const c = challengeById(id);
    if (!c) {
      return;
    }
    const { sphere, challenge } = get();
    player.stop();
    set({
      sphere: challengeStart(c),
      challenge: c.id,
      // Moving on from another challenge needs no Restore; leaving a journey behind does.
      restorable: !challenge && sphere.canUndo ? sphere : null,
      restoreChallenge: null,
      restoreNote: "Challenge started, journey cleared.",
      playhead: 0,
      live: true,
      selected: "1",
      applyToAll: false,
      preview: null,
    });
  },

  leaveChallenge() {
    set({ challenge: null });
  },
}));

useApp.subscribe((state, prev) => {
  if (state.sphere !== prev.sphere) {
    saveSession(state.sphere);
  }
  if (state.challenge !== prev.challenge) {
    saveChallenge(state.challenge);
  }
  // A solved challenge keeps its best stars.
  const c = challengeById(state.challenge);
  if (c && (state.sphere !== prev.sphere || state.challenge !== prev.challenge)) {
    const { stars } = progress(c, state.sphere);
    if (stars > (state.stars[c.id] ?? 0)) {
      const best = { ...state.stars, [c.id]: stars };
      saveStars(best);
      useApp.setState({ stars: best });
    }
  }
});

function validSelection(sphere: Sphere, id: QubitId): QubitId {
  return sphere.qubit(id) ? id : sphere.qubits[0].id;
}

const player = makePlayer(useApp);
