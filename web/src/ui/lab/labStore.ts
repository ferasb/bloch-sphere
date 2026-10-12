import { create } from "zustand";
import { tileText } from "../../format/bench";
import { NAMED_STATES } from "../../math/qubit";
import { loadTiles, MAX_LABEL, MAX_NAME, product, reversed, saveTiles, scaleBench, scaleTile, tileGate, undoBench, undoTile, type Tile } from "../../model/bench";
import type { SavedGate } from "../../model/library";
import { Sphere } from "../../model/sphere";
import { loadLabSession, saveLabSession } from "../../persist/labSession";
import { journeyPlayer } from "../playhead";
import type { JourneyView, Preview } from "../view";

/**
 * The Gate Lab (design-gates.md §3). Its view state (JourneyView) is a test journey: the test state,
 * then one step per tile, so the test sphere can draw and animate it like the main sphere.
 */
export interface LabState extends JourneyView {
  tiles: Tile[];
  /** The tile operations act on, or null for the whole bench. */
  selectedTile: string | null;
  /** Which of the six axis states the test sphere starts from (a NAMED_STATES label). */
  testState: string;
  /** Also show the bench in reverse order, to see whether order matters. */
  compareReversed: boolean;
  /** The saved gate being edited, if any: Save overwrites it. */
  editing: string | null;
  name: string;
  label: string;
  pin: boolean;

  /** Replace the bench. `animate` plays the last tile (for appends); otherwise the result shows at once. */
  setTiles(tiles: Tile[], animate?: boolean): void;
  addTile(tile: Tile): void;
  removeTile(id: string): void;
  moveTile(id: string, toIndex: number): void;
  selectTile(id: string | null): void;
  /** Undo (U†) the selected tile, or the whole bench. */
  undo(): void;
  /** Raise the selected tile, or the whole bench, to k (Repeat, Fraction). */
  scale(k: number): void;
  clear(): void;
  setTestState(label: string): void;
  setCompareReversed(on: boolean): void;
  setPreview(preview: Preview | null): void;
  setHoverStep(step: number | null): void;
  /** Play the whole bench from the start. */
  replay(): void;
  /** Open tiles on the bench, optionally as a saved gate to edit. */
  open(tiles: Tile[], editing?: SavedGate): void;
  setForm(form: Partial<Pick<LabState, "name" | "label" | "pin">>): void;
  /** After saving: further saves overwrite this gate. */
  setEditing(id: string | null): void;
}

/** The test sphere's starting state, from a NAMED_STATES label. */
export function stateFor(label: string) {
  return (NAMED_STATES.find((s) => s.label === label) ?? NAMED_STATES[0]).state;
}

/** The test journey: the test state, then each tile in turn. */
function testJourney(testState: string, tiles: readonly Tile[]): Sphere {
  return tiles.reduce(
    (sphere, t) => sphere.apply({ kind: "gate", gate: { name: "custom", label: tileText(t), about: "", gate: tileGate(t) }, targets: ["1"] }),
    Sphere.fromStart([{ id: "1", name: "q1", colorSlot: 1, state: stateFor(testState) }], 2),
  );
}

interface LabSession {
  tiles: Tile[];
  testState: string;
  compareReversed: boolean;
  editing: string | null;
  name: string;
  label: string;
  pin: boolean;
}

function loadSession(): LabSession {
  const fallback: LabSession = { tiles: [], testState: "|0⟩", compareReversed: false, editing: null, name: "My gate", label: "U", pin: true };
  const data = loadLabSession() as Record<string, unknown> | null;
  if (!data || typeof data !== "object") {
    return fallback;
  }
  try {
    return {
      tiles: loadTiles(data.tiles),
      testState: NAMED_STATES.some((s) => s.label === data.testState) ? (data.testState as string) : fallback.testState,
      compareReversed: data.compareReversed === true,
      editing: typeof data.editing === "string" ? data.editing : null,
      name: typeof data.name === "string" ? data.name.slice(0, MAX_NAME) : fallback.name,
      label: typeof data.label === "string" ? data.label.slice(0, MAX_LABEL) : fallback.label,
      pin: data.pin !== false,
    };
  } catch {
    return fallback;
  }
}

const initial = loadSession();
const initialSphere = testJourney(initial.testState, initial.tiles);

export const useLab = create<LabState>()((set, get) => ({
  ...initial,
  selectedTile: null,
  sphere: initialSphere,
  playhead: initialSphere.lastIndex,
  live: true,
  selected: "1",
  applyToAll: false,
  preview: null,
  hoverStep: null,

  setTiles(tiles, animate = false) {
    const { testState, sphere, selectedTile } = get();
    const next = testJourney(testState, tiles);
    player.stop();
    set({
      tiles,
      sphere: next,
      playhead: animate ? Math.min(sphere.lastIndex, next.lastIndex) : next.lastIndex,
      selectedTile: tiles.some((t) => t.id === selectedTile) ? selectedTile : null,
    });
    if (animate) {
      player.play();
    }
  },

  addTile(tile) {
    get().setTiles([...get().tiles, tile], true);
  },

  removeTile(id) {
    get().setTiles(get().tiles.filter((t) => t.id !== id));
  },

  moveTile(id, toIndex) {
    const tiles = [...get().tiles];
    const from = tiles.findIndex((t) => t.id === id);
    if (from < 0) {
      return;
    }
    const [moved] = tiles.splice(from, 1);
    tiles.splice(Math.max(0, Math.min(toIndex, tiles.length)), 0, moved);
    get().setTiles(tiles);
  },

  selectTile(id) {
    set({ selectedTile: id });
  },

  undo() {
    const { tiles, selectedTile, setTiles } = get();
    setTiles(selectedTile ? tiles.map((t) => (t.id === selectedTile ? undoTile(t) : t)) : undoBench(tiles));
  },

  scale(k) {
    const { tiles, selectedTile, setTiles } = get();
    setTiles(selectedTile ? tiles.map((t) => (t.id === selectedTile ? scaleTile(t, k) : t)) : scaleBench(tiles, k));
  },

  clear() {
    get().setTiles([]);
    set({ editing: null });
  },

  setTestState(label) {
    const { tiles } = get();
    const sphere = testJourney(label, tiles);
    player.stop();
    set({ testState: label, sphere, playhead: sphere.lastIndex });
  },

  setCompareReversed(on) {
    set({ compareReversed: on });
  },

  setPreview(preview) {
    set({ preview });
  },

  setHoverStep(step) {
    set({ hoverStep: step });
  },

  replay() {
    player.stop();
    set({ playhead: 0 });
    player.play();
  },

  open(tiles, editing) {
    get().setTiles(tiles);
    set(editing ? { editing: editing.id, name: editing.name, label: editing.label, pin: editing.pinned } : { editing: null });
  },

  setForm(form) {
    set(form);
  },

  setEditing(id) {
    set({ editing: id });
  },
}));

const player = journeyPlayer(useLab);

useLab.subscribe((s, prev) => {
  if (
    s.tiles !== prev.tiles ||
    s.testState !== prev.testState ||
    s.compareReversed !== prev.compareReversed ||
    s.editing !== prev.editing ||
    s.name !== prev.name ||
    s.label !== prev.label ||
    s.pin !== prev.pin
  ) {
    saveLabSession({ tiles: saveTiles(s.tiles), testState: s.testState, compareReversed: s.compareReversed, editing: s.editing, name: s.name, label: s.label, pin: s.pin });
  }
});

/** The bench's gate, and the same tiles in reverse order. */
export function benchGates(tiles: readonly Tile[]) {
  return { gate: product(tiles), reversedGate: product(reversed(tiles)) };
}
