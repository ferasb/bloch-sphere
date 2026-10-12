# Bloch Sphere: Gates (design)

This extends `design.md`. It makes gates first-class: things you can inspect, take apart, combine, name, save and reuse. It adds a **Gate Lab** for building gates, and a view of the journey as a circuit. Circuits of interacting qubits (the Circuit Lab) are a separate project (§4.2).

Status: G0 and G1 are built (§7); the rest is design.

---

## 1. What students should take away

Each feature below exists to make one of these ideas visible. If a feature doesn't serve one, it doesn't belong.

1. **Every single-qubit gate is a rotation of the sphere:** an axis and an angle.
2. **Two rotations in a row are again one rotation.** So any sequence of gates collapses into one gate. (H·T·H is a 45° rotation about x.)
3. **Order matters.** H then S takes |0⟩ to |+i⟩; S then H takes it to |+⟩.
4. **Every gate can be undone and split.** U† retraces the path; √X is half of X (90° instead of 180°).
5. **Sandwiching a gate turns its axis.** H·Z·H = X: the z axis, turned by H, becomes the x axis.
6. **Global phase changes the matrix, not the rotation.**

---

## 2. Gates as first-class objects

### 2.1 The gate library

| Group | Gates | Notes |
|---|---|---|
| **Built-in** | X, Y, Z, H, S, T, S†, T† | As today. |
| **Rotations** | Rx(θ), Ry(θ), Rz(θ), P(φ), U(θ, φ, λ), √X | Parametric: choosing one asks for its angle(s). U(θ, φ, λ) is the general single-qubit gate, as in Qiskit. |
| **My gates** | anything made in the Gate Lab | Saved in this browser (`localStorage`, so shared across tabs), with a name and a short label (≤ 3 characters) for buttons and circuit boxes. |

Every gate, built-in or not, has a **gate card**:
- label and name;
- exact matrix;
- rotation (axis and angle);
- a **mini-sphere icon** generated from its axis and angle (a short arc around a tilted line), so you can recognize gates at a glance;
- for custom gates, its **recipe**: how it was made, e.g. "H · T · H".

### 2.2 The model

```ts
interface GateDef {
  id: string;        // "builtin:H", "custom:7f3a…"
  name: string;      // "H", "V", "√X"
  label: string;     // ≤ 3 characters, for buttons and circuit boxes
  recipe: Recipe;    // how it was made; the matrix is computed from it
  matrix: Matrix2;
}

type Recipe =
  | { kind: "builtin"; name: FixedGateName }
  | { kind: "rotation"; axis: Vec3; angle: number }          // Rx/Ry/Rz, or any axis
  | { kind: "u3"; theta: number; phi: number; lambda: number }
  | { kind: "matrix"; entries: Matrix2 }
  | { kind: "sequence"; steps: GateRef[] }                    // in time order: first steps[0]
  | { kind: "adjoint"; of: GateRef }                          // U†
  | { kind: "power"; of: GateRef; exponent: number }          // Uⁿ, or U^t for fractions
  | { kind: "conjugate"; of: GateRef; by: GateRef };          // V·U·V†
```

- **Recipes keep provenance.** A gate made from H·T·H remembers that, so its card, journey chip and circuit box can show it. "Edit" reopens it in the Gate Lab with the recipe intact.
- **Journeys copy custom gates by value.** A journey step stores the gate's matrix, label and recipe, not a reference into the library. Editing or deleting a saved gate never rewrites history, and share links stay self-contained. `GateSpec` gains a `{ name: "custom"; … }` variant, and `deserialize` checks the matrix is unitary, since links are untrusted.

### 2.3 Gates in the main view

```
            APPLY A GATE  to ● q1
 [X][Y][Z][H][S][T][S†][T†] │ [R(θ)▾] │ [V][W] [More▾] │ [+ New gate]
   built-in                    rotations   my gates        → Gate Lab
```

- **R(θ) ▾** opens a small popover: an axis (x, y, z) and an angle slider. The ghost previews live while you drag; Apply commits.
- **My gates:** the four most recently saved or pinned gates; the rest are in **More ▾**, which is the full library.
- **+ New gate** opens the Gate Lab with an empty bench.
- **Open in Gate Lab** appears in the Gate panel (sidebar) and in each gate's right-click menu. Opening a built-in such as H lets you see it as a rotation, sandwich it, or take its square root.

### 2.4 Saving and managing your gates

- **Save** from the Gate Lab with a name and a short label. The gate joins **My gates**.
- **Manage** from the gate's card or the library:
  - **rename** it, or change its label (through Edit: the lab's Name and Label fields, then Save changes);
  - **edit** it, which reopens the recipe in the Gate Lab and saves back over it;
  - **duplicate** it, to keep the original and try a variant;
  - **pin** it to the gate bar, or unpin it;
  - **delete** it, with a few seconds to **Restore**, like Reset.
- Because journeys store gates by value (§2.2), renaming, editing or deleting a saved gate never changes a past journey.
- **Keep a copy outside the browser.** Browser storage is per browser and can be cleared, so **Export** downloads your gates as a `.json` file and **Import** loads one back (validated, since files are untrusted). Imported gates with the same name are kept side by side, never silently overwritten.

---

## 3. The Gate Lab

### 3.1 A room, not a popup

The lab is a separate **view in the same tab** (`#/lab`), next to the sphere. It isn't a modal, for three reasons:
- **It needs room:** a bench, a test sphere and a result panel.
- **A modal would cover the sphere anyway.**
- **It shouldn't feel temporary.** You can come and go, and the bench keeps its contents (`sessionStorage`).

A switcher in the top bar, over the sidebar, shows where you are: **Sphere · Gate Lab**. The browser's Back button works, because the view lives in the URL hash.

There are three ways out:
- **Save to My gates.**
- **Apply to q1 ▸,** which returns to the sphere and plays the gate on the selected qubit.
- **← Sphere.**

### 3.2 Layout

The lab uses the same grammar as the main view: ingredients above, the sphere in the middle, the bench below, and one sidebar that explains.

```
+-----------------------------------------------------------+-----------------------------+
|                       BLOCH SPHERE                         |     Sphere · [Gate Lab]     |
+-----------------------------------------------------------+-----------------------------+
| INGREDIENTS [X][Y][Z][H][S][T][S†][T†] [R(θ)▾] [V][W] [+ axis] [+ matrix]              |
|                                                           | RESULT                      |
|                     TEST SPHERE                           |  U = H · T · H              |
|      path: arc about H's axis → arc about z → arc …       |  ⎡  …      …  ⎤  exact       |
|      dashed: the one rotation it all adds up to           |  ⎣  …      …  ⎦  matrix      |
|                                                           |  = one rotation:            |
|  test on: [|0⟩] [|+⟩] [all six] [dot cloud]     ▶ Play    |    45° about the x axis     |
|                                                           |  ≡ same as Rx(45°)  ✓       |
|                     BENCH  (time →)                       |  what it does:              |
|              [ H ] → [ T ] → [ H ]   + drop                |   |0⟩ → …  |+⟩ → |+⟩ …     |
|  [Undo †] [Repeat ×n] [Fraction t] [Change axis…] [Swap] [Clear]                       |
+-----------------------------------------------------------+-----------------------------+
| Name [ V      ]  Label [V ]  ☐ pin to gate bar        [Save to My gates] [Apply to q1 ▸]|
+------------------------------------------------------------------------------------------+
```

### 3.3 Ways to make a gate

| Start from | How | Teaches |
|---|---|---|
| **A sequence** | Click or drag ingredients onto the bench; drag tiles to reorder, × to remove. | Composition (§1.2), order (§1.3) |
| **An axis and an angle** | Drag a point on a small sphere to set the axis; slide the angle. | A gate *is* a rotation (§1.1) |
| **A matrix** | Type the four entries (1/√2, i, e^{iπ/4} accepted). If it isn't unitary, say why: "column 1 has length 1.41, needs 1" or "columns aren't orthogonal". | What makes a matrix a gate |
| **U(θ, φ, λ)** | Three sliders. | The general gate |
| **An existing gate** | "Open in Gate Lab" from any gate card. | Taking known gates apart |

### 3.4 Operations on gates

Each operation gets a friendly verb with its formal name underneath, and each has its own picture on the test sphere. They act on the whole bench, or on the selected tiles.

| Verb | Formal | On the test sphere | Example |
|---|---|---|---|
| **Combine** | B·A (A first) | A's arc, then B's arc; dashed, the single rotation they add up to | H·T·H = Rx(45°) |
| **Undo** | U† | The path retraced backwards | T† undoes T |
| **Repeat** | Uⁿ | n laps of the arc | T² = S, S² = Z, T⁸ = I |
| **Fraction** | U^t, 0 ≤ t ≤ 1 | A slider stops the arc partway, live | √X = X^½: 90° about x |
| **Change axis** | V·U·V† | U's axis swings to a new direction (animated) | H·Z·H = X, S·X·S† = Y |
| **Swap order** | A·B vs B·A | Two ghost paths, two endpoints side by side | H then S vs S then H |
| **Compare** | U ≅ V up to global phase | Both paths overlap or split | H·Z·H vs X: "the same" |
| **Decompose** | U = e^{iα}·Rz·Ry·Rz | The three arcs about z, then y, then z | Any gate |
| **Phase** | e^{iα}·U | Nothing moves; the matrix changes | Z vs Rz(180°) |

**Math notes:**
- **Fraction** uses the short way round: U^t rotates by t·θ about U's own axis, θ ≤ 180°.
- **Compare** tests |tr(U†V)| = 2, which means equal up to global phase.
- **Decompose** uses the Z-Y-Z Euler angles. Every 2×2 unitary has them.

### 3.5 Visuals that teach

- **Path plus shortcut.** The test sphere draws each tile's arc in sequence, in the tile's order, then a dashed arc for the single equivalent rotation. Students see that "three rotations made one" (§1.2).
- **A live fraction slider.** Dragging t from 0 to 1 sweeps the arrow continuously; tick marks show √ (½) and the full gate.
- **Swap order.** Split ghosts land in two places, labeled "H then S" and "S then H".
- **Dot cloud.** Test on 200 dots spread over the sphere instead of one arrow: the whole sphere turns rigidly. A gate acts on every state, not just yours.
- **Equivalence badge.** The result is compared against every built-in gate and every saved gate: "≡ Rx(45°)", "≡ X (up to a global phase −1)", or "≡ I: does nothing".
- **Formula ↔ tiles.** Pointing at a tile highlights its factor in "U = H · T · H". The product is written right to left in math order, and the tiles left to right in time order, with a one-line note on why the two read in opposite directions. This confuses almost every beginner.
- **Columns.** As in the Gate panel, pointing at a matrix column shows a ghost of where |0⟩ or |1⟩ goes.
- **Advanced (later):** a typed formula bar ("H T H", "sqrt(X)", "S^-1", "R(x+z, 90°)") kept in sync with the tiles. It uses its own small parser, never `eval`.

---

## 4. Circuits

### 4.1 Your journey is already a circuit

A journey is gates applied to qubits over time, which is a circuit. The journey bar gets a **Chips | Circuit** toggle. The Circuit view draws the same steps on wires: one wire per qubit, starting with its color dot, with time running left to right and the playhead as a vertical line. Clicking a column replays to it, exactly like clicking a chip.

```
JOURNEY  [Chips | Circuit]                                         [Undo] [Reset]
 ● q1 ──[H]──[T]─────────[H]──┃──
 ● q2 ──────────[→|−⟩]──[H]──┃──      ┃ = playhead
```

### 4.2 The Circuit Lab: a separate project

A room for building circuits of several interacting qubits (two-qubit gates, entanglement, measurement and shots) was designed and partly built, then moved out of this site on 2026-10-12 (§8):
- **The Bloch sphere is a picture of one qubit.** Once qubits entangle, their arrows shrink toward the center and the sphere stops explaining what happens. In the Circuit Lab the circuit and the joint state took the main space, and the sphere shrank to the sidebar: a different tool with a sphere attached.
- **Scope.** This site does one thing well first: the Sphere room and the Gate Lab, polished and published.
- **A different product.** A circuit tool competes with IBM Composer and Quirk, and needs its own decisions about what makes it worth using (the "why didn't it entangle?" captions are the best candidate).

The work is parked on the **`circuit-lab`** branch, whose `docs/design-circuits.md` holds the full design (layout, building, running, two-qubit gates and captions, measurement and shots, the register model, saving). There, `math/register.ts` (with its Python reference) and `model/circuit.ts` are done and tested; the room's UI is written but was never tried in a browser.

What a circuit project can reuse from here: the math, the formatting, the palette and widgets, and the 3D sphere, which draws a neutral `Timeline` (§6.1) and so isn't tied to journeys.

---

## 5. Navigation: one tab, two rooms

| Room | URL | What you do there |
|---|---|---|
| **Sphere** (home) | `#/` | Play: apply gates, watch, replay |
| **Gate Lab** | `#/lab` | Build, take apart and save gates |

- **Hand-offs between rooms:**
  - "Open in Gate Lab" (from any gate);
  - "Apply to q1 ▸" (lab → sphere).
- **Each room keeps its state** while you're away. A room isn't a page load: switching is instant.
- **Not a new browser tab:** one tab is one instance (`design.md` §9), and the hand-offs need shared state.
- **My library.** One place, opened from the top bar next to the room switcher, lists everything you've saved, with a tab per kind: **Gates** and **Journeys** (journeys are `design.md` §6.5, P2). Export and Import live here too. Each room also has quick access in context: the gate bar's **More ▾** lists your gates. Both kinds share one storage module, with versioned entries validated on load.

---

## 6. What has to change first

Following `CLAUDE.md`'s "fit before you add", these restructures come before the features:

1. **The 3D scene gets its frames from a context, not the global store.** `Scene` takes a `SceneSource` (read, subscribe, select) and provides it to its components, so each room brings its own. Overlay labels get a registry per scene for the same reason. *(C0)* The scene no longer knows about journeys: it draws a neutral **`Timeline`** (`ui/scene/timeline.ts`): arrows of any length at any time, each step's tip paths as sampled points, and the step's axis, plus ready-made **ghosts**. Journeys become timelines through an adapter (`journeyTimeline`, `journeyProjector`); anything else drawn on a sphere can bring its own.
2. **A view switch** *(done in G1)*. The URL hash is the source of truth (`ui/rooms.ts`: `#/` or `#/lab`); no router library is needed.
3. **A gate library module** *(done in G1)*. `model/bench.ts` (tiles: a gate and a power; groups; operations; JSON with validation), `model/library.ts` (`SavedGate`: name, label, its tiles as the recipe, pinned) and `persist/library.ts` (`localStorage`, validated on load, synced across tabs). The recipe is the bench itself rather than the `Recipe` union of §2.2, so Edit reopens exactly what was built. A gate known only by its matrix (from a journey) becomes a `fixed` tile.
4. **`GateSpec` gains `custom`,** carrying the matrix, label and recipe by value, validated in `deserialize`.
5. **Math:**
   - `Gate.adjoint()`, `Gate.power(t)` (short-way convention) and `Gate.equalsUpToPhase(other)`;
   - `eulerZYZ()` and `Gate.u3(θ, φ, λ)`;
   - a unitarity check that explains what's wrong.

   The Python reference gets the same functions and tests.
6. **A separate store for the lab** (`useLab`: bench tiles, selection, test input, its own playhead), so the main store stays focused.

---

## 7. Phases

| Phase | Contents |
|---|---|
| **G0: restructure** *(done)* | The scene reads a `SceneSource` from context (§6.1); custom gates in `GateSpec` and journeys (§6.4); gate math with Python parity (§6.5). No visible change. The view switch (§6.2) and gate library (§6.3) moved to G1, next to the lab that uses them. |
| **G1: Gate Lab** *(done)* | The bench (compose, reorder, remove) with Undo, Repeat, Fraction and Swap order; gates from axis and angle; the result panel (exact matrix, rotation, equivalence badge, action on the six states); the test sphere with path plus shortcut; Save and Apply; My gates and R(θ) in the gate bar; manage saved gates (rename, edit, duplicate, pin, delete with Restore). |
| **G2: Gate Lab, deeper** | Change axis, Compare and Decompose; gates from a matrix (with explanations) and from U(θ, φ, λ); the dot cloud; gate icons; the formula bar; My library with Export and Import. |
| **C1: the journey as a circuit** | The journey bar's **Chips \| Circuit** toggle (§4.1). |

The Circuit Lab, which used to be C1 and C2 here, is a separate project (§4.2).

---

## 8. Decisions

| Date | Decision |
|---|---|
| 2026-10-11 | **The Gate Lab is its own room** (`#/lab`), not an overlay. |
| 2026-10-11 | **Entanglement (C2) is deferred** for now; qubits stay independent. |
| 2026-10-11 | **Names: "Gate Lab" and "Circuit Lab".** *(Circuit Lab: see 2026-10-12.)* |
| 2026-10-11 | **Gates and circuits can be saved:** named, managed, reopened, and exported or imported as files (§2.4, My library in §5). *(Circuits: see 2026-10-12.)* |
| default | **Custom gates in journeys by value** (§2.2). |
| default | **My gates in the gate bar: four, plus More ▾.** Revisit after using it. |
| 2026-10-11 | **The Circuit Lab starts with two-qubit gates:** C1 and C2 are built together, which lifts the entanglement deferral for the Circuit Lab. *(Replaced on 2026-10-12.)* |
| 2026-10-11 | **Gates are described by their standard names** (Pauli-X, Hadamard, S gate, T gate, X-rotation…); buttons and circuit boxes keep the symbols. |
| 2026-10-12 | **The Circuit Lab becomes its own project** (§4.2). The Bloch sphere explains one qubit; circuits of interacting qubits need other main visuals, and the core site ships sooner without them. The work so far is parked on the `circuit-lab` branch. Here, qubits stay independent, and the journey's circuit view (§4.1) stays as C1. |
