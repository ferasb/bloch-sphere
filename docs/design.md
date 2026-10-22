# Bloch Sphere: Design

An interactive Bloch sphere for beginner quantum students. You set qubit states, apply gates, and watch every change happen: on the sphere, in the numbers, and in the matrices. Every path is recorded, so you can replay it, inspect it, and share it.

**Stack:** TypeScript · React 19 (UI) · three.js + React Three Fiber 9 + drei (3D) · Zustand (view state) · KaTeX (math) · Vite · Vitest + Playwright (tests)

---

## 1. Goals

- **Audience:** beginners. Someone who has just met kets, gates and the Bloch sphere in a course and wants to *see* them.
- **Public website, for desktops first.** Static files, no backend, free hosting. The Sphere room and the challenges also work on phones and tablets, in one scrolling column; the Gate Lab needs a wide screen (section 5.1).
- **One browser tab is one instance.** On a wide screen the app fills the window like a desktop app (no page scroll); on a narrow one it's a page that scrolls (section 5.1). Each tab is an independent session. See section 9.
- **Every representation is linked.** The sphere, the ket, the amplitudes, the matrices and the history all show the same state, and pointing at something in one view highlights it in all the others.
- **Seeing beats reading.** Captions are generated from the math ("S rotates 90° about z. |0⟩ lies on the z axis, so it doesn't move"), never hand-written per case.

"Several qubits" means several *independent* qubits, each with its own arrow. Two-qubit gates and entanglement aren't part of this site; they belong to a separate circuit project (`design-gates.md` §4.2).

---

## 2. Principles

These are the rules the code follows. Changing one is a design change, not an implementation detail.

1. **One model holds everything.** `Sphere` (in `model/`) holds the qubits and the full journey. It is plain TypeScript: no DOM, no React, no three.js. Every change goes through it.
2. **The UI only draws.** Every panel and the 3D scene are functions of *(model, view state)*. A click creates an action; nothing in the UI changes qubits directly.
3. **Every change to the qubits is a step, except where they start.** Gates, measurements, adding and removing a qubit: all are recorded in the journey. Undo, replay, scrubbing, saving and sharing all come from this one structure. **Set state** isn't a step: it sets where the journey starts, so it starts a new journey (section 4.3).
4. **Animation is a playhead.** The scene and panels show the state at a *time* `t` in the journey. Animating a gate means moving the playhead from step k−1 to step k, and scrubbing means dragging it. One mechanism serves both.
5. **Qubits have stable ids.** Each qubit gets an id, name and color when it's created. Removing q2 doesn't repaint q3: **color follows the qubit, never its position.**
6. **Hue means "which qubit". Phase is always an angle, never a color.** IBM's q-sphere colors phase, but we can't: hue is already taken by qubit identity, and a phase color wheel isn't safe for colorblind users.
7. **Math and model are tested; the UI stays thin.** If logic needs testing, it belongs in `math/`, `model/` or `format/`, not in a component.
8. **Restructure when a feature doesn't fit.** Before adding a feature, check it against this document. If it doesn't fit, change the structure first, as its own step, and update this document.

---

## 3. Stack

Researched October 2026. Versions are the current releases at that time.

**Why React:** the maintainer knows React and React Flow, and not Svelte. Being able to read and review the code matters more here than Svelte's advantages (smaller bundles, less boilerplate), which are small at this app's size.

| Concern | Choice | Why | Also considered |
|---|---|---|---|
| UI framework | **React 19**, plain Vite with `@vitejs/plugin-react` (no Next.js; one page, no routing) | Known to the maintainer. The largest ecosystem. | **Svelte 5**: smaller bundles, fine-grained reactivity, top developer satisfaction in State of JS 2025, but new to the maintainer. **Solid**: similar to Svelte, smaller ecosystem. **Plain TS** (milestone 1): fine for one panel, but becomes hand-written glue code with many. |
| 3D | **three.js 0.186 + React Three Fiber 9 + drei 10** | Declarative scene: each visual layer (arrow, arc, ghost, angle arcs, grid) is a component that appears and disappears with state, so there's no manual create/dispose bookkeeping. R3F has pointer events on 3D objects built in (for dragging the arrow tip and hovering arcs). drei adds `<Line>` (thick lines; plain WebGL lines are 1px) and `<OrbitControls>`. HTML labels use a small overlay of our own (`ui/scene/overlay.tsx`): drei's `<Html>` mounts a separate React root per label, and one of ours never rendered. | Keeping the imperative `BlochScene` class: fine today, but every new layer adds create/update/dispose code paths. **Threlte** (the Svelte equivalent). **Babylon.js**: a full engine, more than we need. |
| View state | **Zustand 5** | One small store for the view state (section 4.4). The 3D scene reads the playhead every frame with `getState()` inside `useFrame`, so animation doesn't re-render React. Panels subscribe with selectors and re-render only when their slice changes. | `useReducer` + context: every frame of the playhead would re-render every consumer. |
| Math typesetting | **KaTeX** for formulas and kets. A **custom `Matrix` component** for gate matrices. | KaTeX renders synchronously and fast (HTML+CSS output). Matrices need hoverable, animatable entries with phase glyphs, and that's easier with each entry as its own element than inside a typeset formula. Entries still use KaTeX for their values. | **MathJax 4**: most complete, heavier and slower. **Temml**: light, outputs browser-native MathML; rendering varies more between browsers. |
| Layout | **CSS grid** with resizable splitters and collapsible panels | Beginners do better with a fixed, well-designed layout than an IDE-style docking system. | **dockview-core** (framework-agnostic, zero dependencies, drag/drop, floating panels, layout serialization). Keep it in reserve if users ask to rearrange panels; it has an official React package. |
| UI motion | CSS transitions | Panel motion is small (hover, open/close, highlight). The sphere's motion is our own playhead. | **Motion** (motion.dev), if panel animation ever outgrows CSS. |
| Charts | Hand-built SVG components | A few bars, dials and a histogram. A chart library would be larger than the charts. | |
| Sharing | URL hash, compressed with the browser's native `CompressionStream` | No dependency. | lz-string (unmaintained since 2023). |
| Tests | **Vitest** (math, model, formatting) · **Playwright** (UI smoke tests, screenshots) | Vitest is already set up. Playwright already worked for screenshots during milestone 1. | |
| Hosting | Static: GitHub Pages or Cloudflare Pages | Never sleeps, free, any number of visitors. | |
| Python | `python/qubit.py`, `python/gates.py` stay as the **reference implementation** | The same math with the same tests, so the TypeScript port can be checked against it (section 10). | |

---

## 4. Architecture

### 4.1 Modules

```
web/src/
├── math/      Complex, Qubit, Gate, vec3           pure math (exists)
├── model/     Sphere, Journey, Action, serialize   all app logic; no DOM, no React, no three.js
├── format/    exact values (1/√2, e^{iπ/4}), angles,
│              captions ("S: 90° about z …")        pure functions, tested
├── persist/   URL hash, sessionStorage, localStorage
├── learn/     the Learn pages: static HTML built from React and the math (section 13)
└── ui/
    ├── App.tsx, layout, keyboard shortcuts
    ├── store.ts  the Sphere plus view state (section 4.4), in Zustand
    ├── scene/    R3F components: BlochSphere, Arrow, Arc, AxisLine, Labels, Ghost, AngleArcs, …
    ├── controls/ QubitStrip, GateToolbar, SetState (popover): the controls around the sphere
    ├── panels/   StatePanel, GatePanel, JourneyBar (and later MeasurePanel)
    └── widgets/  Matrix, CircleNotation, PhaseDial, ProbabilityBar, Ket, Histogram
```

### 4.2 Dependency direction

```
ui ──► model ──► math
 │       ▲
 ├──► format ──► math
 └──► persist ──► model

learn ──► format, model, math, persist (the theme)
```

- `math/` imports nothing of ours.
- `model/` imports only `math/`. It never imports React, three.js or the DOM, so it runs in Vitest as-is.
- Nothing imports `ui/` or `learn/`. The app reaches the Learn pages by link only, through paths in `format/` (`gateLearnPath`, the glossary).

### 4.3 The model

```ts
type QubitId = string;

interface QubitEntry {
  id: QubitId;        // stable, never reused
  name: string;       // "q1"…"q5": follows the color slot, so q2 is always the second color
  colorSlot: number;  // 1–5 → --qubit-N; assigned once at creation
  state: Qubit;
}

type Action =
  | { kind: "gate"; gate: GateSpec; targets: QubitId[] }        // GateSpec: { name: "H" } | { name: "Rx"; angle } | { name: "custom"; matrix }
  | { kind: "measure"; target: QubitId; basis: "x" | "y" | "z"; outcome: 0 | 1 }
  | { kind: "addQubit"; state: Qubit }
  | { kind: "removeQubit"; target: QubitId };

type Motion =
  | { kind: "rotate"; axis: Vec3; angle: number }   // gates: the gate's rotation
  | { kind: "collapse"; outcome: 0 | 1 }            // measurement
  | { kind: "appear" } | { kind: "disappear" };     // add / remove qubit

interface Step {
  action: Action;
  qubits: readonly QubitEntry[];         // snapshot after this step
  motions: ReadonlyMap<QubitId, Motion>; // how each affected qubit got here
}

class Sphere {                               // immutable: every change returns a new Sphere
  readonly steps: readonly Step[];           // steps[0] is the start
  get qubits(): readonly QubitEntry[];       // the last step's qubits
  apply(action: Action): Sphere;             // appends a step
  undo(): Sphere;                            // discards the last step; the start always stays
  setStartState(targets, state): Sphere;     // a new journey from where the qubits are now, the targets set to state
  reset(): Sphere;                           // a new journey: the same qubits, all back to |0⟩
  frameAt(t: number): Frame;                // the sphere at time t in [0, steps.length − 1], continuous:
                                            // each qubit's exact state, plus presence (0–1) while it appears or disappears
  shortcut(from: number, to: number): Map<QubitId, Motion>; // the whole stretch as one rotation
  toJSON(): SavedJourney;                    // actions only; replayed on load
  static fromJSON(json: SavedJourney): Sphere;
}
```

- **Undo discards; there is no redo.** The journey is always a straight line. Undo removes the last step, and you can undo all the way back to the start.
- **Set state starts a new journey.** The qubits' current states become the new start, with the targeted qubits (the selected one, or all) at the chosen state; the steps so far are cleared. The others don't move. A journey is "from this start, these gates", so changing a qubit's state means changing the start, not adding a step.
- **Reset starts over.** It keeps the qubits (ids, names, colors), puts them all back at |0⟩ (forgetting any state set with Set state), and clears the journey.
- **Restore after clearing.** Neither Set state nor Reset can be undone with Undo, so the UI shows a notice for a few seconds ("New start, journey cleared · Restore" or "Journey cleared · Restore"), holding the previous `Sphere` in the view store.
- **Measurement stays deterministic.** The UI samples the outcome from the model's probabilities and puts it *in the action*. Replaying a journey therefore reproduces the same outcomes, and tests don't need randomness.
- **Intermediate states are exact.** Partway through a rotation, the state is R_n(s·θ)|ψ⟩ for s between 0 and 1: a real quantum state, not an interpolated picture. The State panel can show live numbers during an animation, displayed in canonical global phase so the last frame matches the step's result.
- **Saved journeys store actions, not snapshots,** with a format version number.

### 4.4 View state

The Zustand store (`ui/store.ts`) holds the current `Sphere` and everything that isn't the quantum story:

| Key | Holds |
|---|---|
| `sphere` | the current `Sphere` (section 4.3); replaced, never mutated |
| `restorable`, `restoreNote` | the `Sphere` from before the last Reset or Set state, while the "Restore" notice is up, and what the notice says |
| `playhead` | current time `t` in the journey; animates toward the last step |
| `playing`, `speed` | replay controls |
| `selected` | the qubit the State panel shows and gates act on |
| `applyToAll` | when on, gates act on every qubit instead |
| `hover` | what the pointer is over (`{ qubit, part: "alpha" \| "beta" \| "theta" \| "phi" \| "step" \| … }`), for linked highlighting |
| `preview` | the gate under the pointer, for the ghost arrow |
| `layers` | which sphere layers are on (grid, angle arcs, probability ruler, trail, …) |
| `camera` | preset view, or "free" |
| `prefs` | number format (exact/decimal), angle unit (°, rad, π), global-phase display; saved to localStorage |

**Replay never edits.** Scrubbing and replay only move the playhead; the journey doesn't change. Pressing a gate while replaying first jumps the playhead back to the end ("live"), then applies the gate there.

### 4.5 One click, end to end

1. The user clicks **H**. The handler dispatches `{ kind: "gate", gate: { name: "H" }, targets: [selected] }` (or every qubit, with apply-to-all).
2. The store sets `sphere = sphere.apply(action)`, which appends a step.
3. The playhead animates from the previous step to the new one. Duration grows with the rotation angle; with reduced motion, it's instant.
4. Each frame:
   - the 3D scene reads the playhead with `getState()` inside `useFrame` and draws `sphere.frameAt(playhead)`, without re-rendering React;
   - the State panel subscribes to the playhead and re-renders its handful of numbers.

   The arrow, arc, ket, circle notation and probability bars all move together.

---

## 5. Layout

The app fills the window (`100dvh`, no page scroll). It's designed for 1280×720 and up, where the sidebar fits without scrolling, and fits from 960px wide; narrower or shorter windows get the layout in section 5.1. **One sidebar:** the controls frame the sphere (qubits above it, gates below it), so you act right next to the result, and the single sidebar only explains. Resizing and collapsing the sidebar, with its size remembered, is P2.

```
+--------------------------------------------------------+---------------------------------+
|                         BLOCH SPHERE                                     [Share] [Save]|
|          Apply gates to qubits and watch their states rotate.                           |
+--------------------------------------------------------+---------------------------------+
| ● q1 |+⟩ ×  ● q2 |0⟩ ×  [+ Qubit] [Set state ▾] ☐ Apply to all qubits | STATE · q1        |
|                                                        |  |ψ⟩ = 1/√2 |0⟩ + 1/√2 |1⟩      |
|                                                        |  [α β]ᵀ        ◐ ◐              |
|                     3D BLOCH SPHERE                    |  P(0) ██████░░░░ 50%             |
|                                                        |  θ 90°  φ 0°   (x, y, z)         |
|   layers: grid · angles · ruler · trail (P2)           +---------------------------------+
|   view: textbook · top · front · side (P2)             | GATE · H                         |
|                                                        |          from |0⟩   from |1⟩     |
| Drag to rotate · Scroll to zoom                        |  to |0⟩ ⎡ 1/√2      1/√2 ⎤        |
|            APPLY A GATE  to ● q1                       |  to |1⟩ ⎣ 1/√2     −1/√2 ⎦        |
|          [X][Y][Z][H][S][T][S†][T†]                    |  Rotates 180° about x+z diagonal |
+--------------------------------------------------------+---------------------------------+
| JOURNEY  Start → H → S → T ●        [Back to now] [Undo] [Reset]   ⏵ ━━━━●━━━ 1× (P2)    |
+------------------------------------------------------------------------------------------+
```

- **Center: the sphere and its controls.** Along the top, everything about the qubits themselves: chips (select, remove), add, **Set state** (a popover with presets, θ/φ sliders, amplitudes) and apply-to-all. Along the bottom, the gate bar: a clear heading, **APPLY A GATE to ● q1**, above the gate buttons, so what the buttons do and whom they act on can't be missed. The 3D view sits between them, so controls never cover the sphere. Later gate controls (rotation gates) join the gate bar; measurement gets its own bar.
- **Right (380px): what it means.** The state and the gate, as numbers and matrices.
- **Bottom: what happened.** The journey.
- **Top bar: the title, centered over the sphere's column (not the whole window), with the description under it.** The part above the sidebar holds actions (share, save, help, settings) as those features arrive. Below 1080px the description is dropped, so the title stays clear of "Learn the basics".

### 5.1 Narrow screens: phones and tablets

Windows under 960px wide or 500px tall (phones, tablets held upright, small windows) get one column that scrolls. The query is `NARROW` in `ui/media.ts`, and `styles.css` repeats it.

```
+--------------------------------------+
| BLOCH SPHERE                     [☾] |
| Learn the basics ›    About  Privacy |
+--------------------------------------+
| ● q1 |0⟩  [+ Qubit] [Set state ▾]    |
|                       [Challenges ▾] |
| (the challenge card, during one)     |
|                                      |
|            3D BLOCH SPHERE           |
|                                      |
|         APPLY A GATE to ● q1         |
|   [ X ][ Y ][ Z ][ H ][ S ]          |
|   [ T ][S†][T†][R(θ)]                |
| STATE · q1        (GATE beside it    |
| ...                from 640px wide)  |
| GATE · H                             |
+--------------------------------------+
| JOURNEY Start → H ·· [Undo] [Reset]  |  stays at the bottom of the screen
+--------------------------------------+
```

- **The sphere and the gates come first,** in one screen on most phones: the qubits, the sphere and the gates fill the screen between the top bar and the journey (at least 420px, at most 720px), and the sphere takes what's left, never less than 200px. Never the whole screen, though: a drag on the sphere turns it, so there has to be room around it to scroll the page by. When even the smallest sphere doesn't fit (a small phone, during a challenge), the page scrolls rather than clip it.
- **During a challenge** its card sits above the sphere, not over it, in three lines: the goal, then the gates used with the hint beside them. "The ring marks the goal" and Start over are left out (the journey's Reset does the same).
- **The journey stays at the bottom of the screen,** so Undo and Reset are always in reach (except in windows under 500px tall, where it would take too much room).
- **Phones held sideways** (under 500px tall, landscape): the sphere on the left, the qubits and the gates beside it, and the top bar on one line.
- **Phones (under 560px wide, and sideways):** the gates are large buttons, five to a row.
- **Touch:** a finger can't point, so pressing and holding a gate (or a Set state preset) previews it, and letting go doesn't apply it; a tap applies (`ui/previewPress.ts`). Buttons are taller where the pointer is a finger (`pointer: coarse`), hover colors apply only where there's hover, and a double tap doesn't zoom the page. The sphere turns with one finger and zooms with two.
- **The Gate Lab needs a wide screen.** It puts the ingredients, the test sphere, the bench and the result side by side, and tiles are reordered by dragging. On a narrow screen the Lab says so and offers the way back to the sphere; the room switcher, Gate Lab ▸, Open in Gate Lab ▸ and My gates (whose gates are made in the Lab) are hidden. A Try it link to the Lab still sets up the bench, ready for a wider screen.
- **Popovers stay in the window:** they line up with their button but never cross the window's edge, and scroll when they're taller than the space left.

---

## 6. Panels

Priorities: **P1** = next build, **P2** = after that, **P3** = later (section 11).

### 6.1 State panel: one state, many views

All views show the selected qubit at the playhead, so they move during animations.

| View | Shows | Why it helps | Pri |
|---|---|---|---|
| **Ket, exact form** | `1/√2 \|0⟩ + i/√2 \|1⟩`. Recognizes common values (0, ±1, ±1/2, ±1/√2, ±√3/2, phases e^{iπk/4}); otherwise decimals. Toggle exact/decimal. | Matches the textbook. `0.7071` means nothing to a beginner; `1/√2` does. | P1 |
| **Column vector** | `[α, β]ᵀ` | The same state as the thing a matrix multiplies. | P1 |
| **Circle notation** | One circle per basis state. Filled area = probability; a line from the center = phase. (From *Programming Quantum Computers*, O'Reilly.) | Magnitude and phase at a glance, no complex numbers needed. | P1 |
| **Probability bars** | P(0), P(1) with percentages | | P1 |
| **Bloch angles and vector** | θ, φ (φ shows "—" at the poles), and (x, y, z) | Connects numbers to the arrow. | P1 |
| **Other bases** | P(+)/P(−) and P(+i)/P(−i) as bars | Certain in one basis means 50/50 in another. Beginners rarely see this side by side. | P2 |
| **Global phase** | Toggle "as computed" / "canonical (α real ≥ 0)". When they differ, a ribbon explains why the sphere can't show the difference. | Answers "why does Y\|0⟩ = i\|1⟩ look the same as \|1⟩?" | P2 |
| **Complex-plane dials** | α and β as arrows in the complex plane | An alternative to circle notation for students who know complex numbers. | P3 |
| **Density matrix ρ** | 2×2, behind an "advanced" toggle | A bridge to later courses. | P3 |

**Linked highlighting (P2):**
- Point at α, and the |0⟩ circle, the P(0) bar and the arrow's z-projection light up.
- Point at φ, and the angle arc on the equator lights up.
- It works in both directions: point at the sphere's z-projection and α lights up.

### 6.2 Gate panel: gates you can see

Shows the gate under the pointer, or the last gate applied.

- **Matrix widget (P1).** A 2×2 grid with drawn brackets. Each entry shows its exact value. Columns are labeled |0⟩ |1⟩ ("input") and rows ⟨0| ⟨1| ("output"), so the matrix reads as *"column 0 is where |0⟩ goes."*
- **Rotation (P1):** "180° about the x+z diagonal", generated from `Gate.axisAngle()`.
- **Column hover (P2):** point at column 0, and a ghost arrow on the sphere shows where |0⟩ would go.
- **Multiply step by step (P2):** `M · ψ = ψ'` laid out in a row. Step through it: row 0 × column lights up, the products appear, then the sum lands in ψ'₀. Teaches matrix-vector multiplication on the actual numbers.
- **Gate card (P2), behind "more":**
  - what the gate does to each of the six axis states (a mini table of small spheres);
  - identities (H·H = I, S·S = Z, T·T = S, H·Z·H = X);
  - a global-phase note (Z and Rz(180°) are the same rotation but different matrices).

### 6.3 Gates (toolbar under the sphere)

Gates become first-class (a gate library, custom gates, the Gate Lab, and the journey shown as a circuit): see **`design-gates.md`**.

- **Fixed gates (P1):** X, Y, Z, H, S, T, S†, T†. Each button has a small icon showing its rotation axis on a mini sphere (P2), and keyboard shortcuts (P1).
- **Preview on hover (P1):** pointing at a gate shows a ghost arrow and the dashed path it would take. *Predict first, then click and confirm.* The same ghost previews presets and the θ/φ sliders before "Set state". Clicking commits and clears the preview, so it never shows where a second click would go. On a touch screen, pressing and holding previews (section 5.1).
- **Rotations (P2):** Rx, Ry, Rz with an angle slider. Dragging the slider previews live; clicking Apply commits.
- **Custom gate (P3), both ways:**
  - drag an axis point on the sphere and set an angle, and the matrix updates live;
  - or type a matrix, and see its axis and angle. A non-unitary matrix gets an explanation, not just an error.
- **Apply to all (P1):** one gate turns every qubit at once.

### 6.4 Qubits (chips above the sphere)

- **Add and remove (P1).** Up to 5 qubits, each with a fixed color.
- **Select (P1).** A chip shows the qubit's color, name and current state. Click it to select; gates act on the selected qubit, or on all.
- **Set a state (P1),** from the Set state popover in the qubit strip: presets (|0⟩ |1⟩ |+⟩ |−⟩ |+i⟩ |−i⟩), θ/φ sliders, typed amplitudes, or dragging the arrow tip on the sphere (P2), which snaps to the six axis states. It sets where the journey starts and clears the journey (section 4.3); the popover says so when there are steps to lose. The journey's Start chip lists each qubit's starting state.
- **Overlap between two qubits (P2):** show the angle between the arrows and |⟨a|b⟩|² = cos²(angle/2). Orthogonal states are *opposite* on the sphere, not perpendicular, which is one of the most common beginner mistakes.

### 6.5 Journey (bottom panel)

- **Chips (P1):** `|0⟩ ─H→ |+⟩ ─S→ |+i⟩`, one per step, colored by qubit. Clicking a chip moves the playhead there (replay, not editing; section 4.4); a "Back to now" button returns to the end. The trail keeps the arcs of qubits that were later removed, since they are part of the journey.
- **Undo (P1):** discards the last step (button and Ctrl+Z). There's no redo.
- **Reset (P1):** all qubits back to |0⟩ and an empty journey, with a short "Journey cleared · Restore" notice (section 4.3).
- **Trail on the sphere (P1):** each step's arc stays drawn and fades with age. Point at a chip to highlight its arc, and point at an arc to highlight its chip.
- **Scrubber and replay (P2):** drag through the whole journey. Play/pause, step, speed (0.25×–4×).
- **Step inspector (P2):** click a chip to see the before/after states side by side, the gate's matrix, and the step-by-step multiplication.
- **Shortcut (P2):** collapse any stretch of steps into one equivalent rotation and draw it as a single arc next to the real path. *"Your 6 gates = one 120° rotation about (0.58, 0.58, 0.58)."*
- **Save and load (P2):** name a journey, save it in this browser, export or import JSON.
- **Share (P3):** a link that rebuilds the journey (section 9).
- **Compare (P3):** overlay two saved journeys, for example H·Z·H vs X: different paths, same destination.
- **Export a clip (P3):** record the replay as a WebM video from the canvas, for notes or slides.

### 6.6 Measurement

- **Measure in Z (P2).** The arrow collapses to |0⟩ or |1⟩ with the right probability; the outcome is recorded as a step.
- **Measure in X or Y (P2).** Same, collapsing to |±⟩ or |±i⟩.
- **Shots (P2).** Measure 1, 10, 100 or 1000 fresh copies. Outcomes drop into a histogram that settles onto P(0)/P(1). Probability becomes something you can watch.

### 6.7 Sphere layers (toggles under the sphere)

| Layer | Shows | Pri |
|---|---|---|
| Labels | kets, dimmed when the sphere hides them; with 2+ qubits, each tip's name sits beside the shaft just inside the tip, clear of the ket labels (exists) | P1 |
| Trail | journey arcs (6.5) | P1 |
| Ghost | gate preview (6.3) | P1 |
| Rotation axis | dashed line during and after a gate (exists) | P1 |
| **Angle arcs** | θ drawn from z to the arrow, φ along the equator, labeled | P2 |
| **Probability ruler** | a bar along the z axis filled to P(0) = (1 + z)/2. *The height of the arrow is the probability.* | P2 |
| Grid | latitude/longitude lines | P2 |
| Camera presets | textbook · top · front · side, with smooth moves. **Top** view turns φ into a clock hand: S is a quarter turn, T an eighth. | P2 |

---

## 7. More ideas

Ideas beyond the panels above, with a rough sense of value for a beginner and the effort to build.

| Idea | What it is | Beginner value | Effort |
|---|---|---|---|
| **Whole-sphere rotation** | A sphere covered in ~200 colored dots (or latitude bands). Apply a gate and *everything* turns rigidly. | High. Shows a gate is a rotation of all states, not something done to your one arrow. | M |
| **Gate wind** | Small arrows on the surface showing which way each point would flow under the gate's rotation, like a wind map. | High. The axis and direction are visible before anything moves. | M |
| **Predict mode** | Before the animation, you click where you think the arrow will land. Then it plays, and the gap is shown. | High. Active recall instead of watching. | S |
| **Challenges** *(built, section 13.4)* | "Get from \|0⟩ to \|−i⟩ using only H and S." The target is a ghost arrow; fewer gates earn more stars. | High. Fun, and builds gate intuition fast. | M |
| **Guided lessons** *(later; not planned yet)* | Short interactive steps (what is a qubit, superposition, phase, H, measurement), each with a check ("apply a gate that takes \|0⟩ to \|1⟩"). | High, but content-heavy. | L |
| **Hidden-arrow game** | The arrow is hidden. Measure copies in X, Y and Z to estimate it, then reveal. | Medium-high. Teaches that the state can't be seen directly, only estimated from measurements. | M |
| **Generated captions** | "What just happened" sentences built from the math, including the surprising cases (S on \|0⟩: nothing moves). | High. | S |
| **Exact-value recognizer** | Shows 1/√2 and e^{iπ/4} instead of decimals, everywhere. | High. | S |
| **Glossary popovers** *(built without pictures, section 13.3)* | Hover "phase", "basis", "global phase" for a one-line definition with a mini picture. | Medium. | S |
| **Clip export** | Save a replay as a video. | Medium (teachers, notes). | S |

**My top picks for beginner impact:** gate preview, circle notation linked to the sphere, the probability ruler, whole-sphere rotation, and the shots histogram. Each one turns an abstract statement into something you can watch.

---

## 8. Visual language

- **Color tokens** are OKLCH. The palette (surfaces, text, lines, accents, status, five accent colors) is `web/src/theme.css`, a copy of the one shared with [ferasbisharat.com](https://ferasbisharat.com) (`ferasb.github.io/theme.css`, the original). `web/src/tokens.css` builds this site's tokens on it (the qubits, the 3D scene, the fonts), shared by the app's `styles.css` and the Learn pages' `learn/learn.css`. The 3D scene reads them through `ui/palette.ts`, so there's one source of truth.
- **Light and dark.** Every palette token is a `light-dark(light, dark)` pair. The site follows the system's theme until the visitor picks one with the theme button in the top bar (it switches between light and dark); the pick is kept in `localStorage` (`persist/theme.ts`). A pick sets `data-theme` on `<html>`, which `theme.css` reads; `public/theme-init.js` sets it before the first paint, on the app and on the About and Privacy pages. When the theme changes, the 3D scene rebuilds its objects with the new palette (`Scene.tsx`); the camera stays.
- **Qubit colors** (`--qubit-1` … `--qubit-5`, the palette's five accents) are validated as a set in each theme, by OKLab distance under protanopia and deuteranopia simulation: worst pair 11.1 for both themes, and 20.5 (dark) and 20.8 (light) for normal vision. The hues are the same in both themes, so q1 is green in either (and q2 violet: the pair seen together most stays at least 19.7 apart under simulation). In dark they're brighter than the usual chart range on purpose, because they're thin arrows on near-black; in light they're darker, at least 3:1 against the page and the 3D view.
- **Identity is never color alone.** With two or more qubits, each arrow tip carries its name (q1, q2).
- **Phase is an angle, never a hue** (principle 6). Circle notation, dials and the top view all show phase as direction.
- **Status colors** (danger, warning, success, info) appear only with an icon and a label.
- **Motion:** duration grows with rotation angle (about 0.3 s + 0.5 s × angle/180°) with ease-in-out. UI transitions take 120–200 ms. `prefers-reduced-motion` makes everything instant.
- **Gate names:** descriptions use the standard names (Pauli-X, Hadamard, S gate, T gate, X-rotation, …), with a common nickname where there is one (Pauli-X, "the quantum NOT"). Buttons, tiles, chips and circuit boxes keep the short symbols (X, H, S), as circuits and textbooks print them. The names live in `format/gateNames.ts`.
- **Type:** UI in the system sans; math in KaTeX's fonts; numbers in tables use tabular figures. The title is **Michroma**, a wide face drawn for capitals, in caps with 0.12em tracking (capitals need extra spacing, since their default spacing is fitted for lowercase neighbors). It is self-hosted through Fontsource, not loaded from Google's servers, so no visitor's IP goes to a third party.
- **Depth cues:** labels and arcs behind the sphere are dimmed; the sphere is a faint shell with three reference circles.

---

## 9. One tab, one instance

- **The tab is the session.** State lives in memory, mirrored to `sessionStorage` (which is per tab), so reloading a tab keeps its journey. Two tabs are two independent sessions; they don't sync.
- **The URL can carry the journey.** "Share" encodes the actions (not snapshots) into the URL hash, compressed. Opening the link replays the journey. Duplicating a tab duplicates the session. *(Not built yet; readable links that set up a start and a few gates are, section 13.2.)*
- **Shared across tabs, in `localStorage`:** saved journeys, preferences, and panel sizes.
- **No backend.** Nothing leaves the browser except the links a user chooses to share.

---

## 10. Testing

| Layer | Tool | What |
|---|---|---|
| `math/` | Vitest | exists, including axis-angle on 500 random unitaries |
| `model/` | Vitest | apply/undo/reset, `frameAt(t)` at step boundaries and midpoints, ids stable across removal, JSON round-trip, replay determinism |
| `format/` | Vitest | exact-value recognition, angle formatting, captions |
| Python ↔ TS | pytest mirrors the Vitest math tests today. *Planned:* Python writes `fixtures.json` (states × gates → vectors, axis/angle) and a Vitest test checks the TS against it | catches drift between the reference and the port |
| UI | Playwright *(planned; used by hand for now)* | page loads without console errors; clicking a gate moves the arrow; screenshots for visual review |

---

## 11. Build order

Each phase ends with a working, deployable site.

0. **Restructure, no new features** *(done)*. Move to React + R3F + Zustand. Build `model/Sphere` with the journey (apply, undo, reset). Port today's features onto it: gates, animation, caption, reset. Set up deployment.
1. **The core loop (P1)** *(done)*: State panel (ket, vector, circle notation, probabilities, angles), Gate panel (matrix widget, rotation), qubits (add/remove/select, presets, sliders, amplitudes), gate preview, apply to all, journey chips with undo and reset, trail on the sphere, keyboard shortcuts.
2. **Understanding (P2):** scrubber and replay, step inspector with step-by-step multiplication, linked highlighting, angle arcs, probability ruler, camera presets, measurement and shots, rotation gates, other-basis probabilities, global-phase toggle, overlap between qubits, shortcut arc, save/load.
3. **Engagement (P3):** challenges *(done, section 13.4)*, predict mode, whole-sphere rotation, gate wind, share links, compare, custom gate, clip export.
4. **Learning and search** *(done, 2026-10-22)*: the Learn pages, readable links, terms in the app, and the search basics (section 13).

**Next: gates.** Phases G0 → G1 → G2 → C1 in `design-gates.md` §7, requested as the next priority on 2026-10-10. G0 and G1 (the Gate Lab) are done; P2 items interleave from here. The Circuit Lab is a separate project (2026-10-12).

**Later, not planned yet:** guided lessons (interactive steps with checks, inside the app). The Learn pages are reading guides; they link into the app but don't check anything.

---

## 12. Decisions

| Date | Decision |
|---|---|
| 2026-10-10 | **Browser-only web app**, no backend. The Python stays as the reference implementation. |
| 2026-10-10 | **"Several qubits" means independent qubits**, not entanglement. Up to 5. |
| 2026-10-10 | **Desktop only.** Phones aren't a target. *(Replaced on 2026-10-22, below.)* |
| 2026-10-10 | **One tab = one instance** (section 9). |
| 2026-10-10 | **React + R3F + drei + Zustand** (section 3). |
| 2026-10-10 | **Undo discards the last step; no redo, no branches.** Plus a **Reset** button (section 4.3). |
| 2026-10-10 | **Name: "Bloch Sphere".** |
| 2026-10-10 | **Lessons later.** |
| 2026-10-10 | **Fixed, resizable layout** (the default; revisit with dockview if users ask to rearrange panels). |
| 2026-10-10 | **One sidebar.** Two sidebars split attention; the controls now frame the sphere (qubit chips above, gate toolbar and Set state popover below) and the one sidebar holds state + gate. |
| 2026-10-10 | **Matrix entries show values only.** The per-entry circle glyphs read as noise. |
| 2026-10-10 | **Title: "BLOCH SPHERE" in Michroma caps, description underneath.** Chosen over Lexend Zetta, Archivo Expanded, Montserrat, Cinzel, Unbounded, Syncopate and Space Grotesk for its light, wide, instrument-like caps. |
| 2026-10-10 | **Gate bar heading "APPLY A GATE to ● q1" above the buttons; Set state moves to the qubit strip.** A small inline label was easy to miss. Under that heading, Set state (not a gate) no longer belonged in the bar; it acts on the selected qubit, so it sits with the qubits. |
| 2026-10-10 | **Gates become first-class:** a gate library, custom gates built in a Gate Lab, circuits later. Designed in `design-gates.md`; decisions in its §8. |
| 2026-10-11 | **Gate Lab is its own room; Gate Lab / Circuit Lab names; gates and circuits can be saved and exported. Entanglement is deferred,** so "independent qubits only" (above) still holds. Details in `design-gates.md` §8. |
| 2026-10-11 | **The Circuit Lab starts with two-qubit gates (CNOT, CZ, SWAP),** so entanglement is no longer deferred there; the Sphere room's qubits stay independent for now. **Gates are described by their standard names** (Pauli-X, Hadamard, …). |
| 2026-10-12 | **The Circuit Lab becomes its own project.** This site stays about the Bloch sphere: independent qubits, the Gate Lab, and the journey shown as a circuit. The circuit work is parked on the `circuit-lab` branch. Details in `design-gates.md` §4.2 and §8. |
| 2026-10-12 | **Set state isn't a step; it starts a new journey.** The current states become the new start, with the chosen qubit (or all) at the new state; the other qubits stay where they are. **Reset** still puts every qubit at |0⟩. Adding and removing qubits stay steps for now, to revisit after trying this. |
| 2026-10-22 | **Learn pages: static guides built from React and the app's math** (section 13.1). Separate pages, since the app has no page scroll; no framework change and no pre-rendering of the app. |
| 2026-10-22 | **Readable links** for Try it (section 13.2), separate from Share. |
| 2026-10-22 | **Challenges are a mode of the Sphere room** (section 13.4); the store enforces the allowed gates. |
| 2026-10-22 | **Terms explain the app's labels** (section 13.3); one glossary for the app and the Learn hub. |
| 2026-10-22 | **Search basics, no analytics** (section 13.5). |
| 2026-10-22 | **Phones and tablets get the Sphere room and the challenges** (replaces *Desktop only*): one scrolling column on narrow screens, press and hold to preview a gate, and the Gate Lab on wide screens only (section 5.1). The guides bring visitors on phones, and their Try it links open the app. |

---

## 13. Learning and search

Added 2026-10-22. The app shows what happens; these explain why, and let people find the site.

### 13.1 The Learn pages

- **What:** short guides at `/learn/`: what a qubit is, the Bloch sphere (θ, φ, the Bloch vector, global phase), the six key states, measurement, gates as rotations, one page per gate (Pauli-X, Y, Z, Hadamard, S and T, rotation gates), and the Gate Lab. The hub lists them in reading order with the glossary (13.3); each page has Previous and Next.
- **Each page:** plain words first, then a picture, then "the math", then Try it links into the app (13.2). Beginner language must not become wrong: no "0 and 1 at once"; orthogonal states are opposite points; global phase is invisible; one qubit only.
- **Separate pages, not text under the sphere.** On a desktop the app fills the window with no page scroll (section 5), so the guides are pages of their own, readable without JavaScript, which is also what search engines need.
- **Static HTML, built from React** (`src/learn/`, rendered with `renderToStaticMarkup` when the site is built, by `plugins/learnPages.ts`). Each page is one more HTML entry of the Vite build, so it gets the CSP and its own small stylesheet and script (the theme button), and the dev server renders the pages on request. No framework change: the app stays a client-side React app. Pre-rendering the app itself was not done: its visible text is mostly numbers and buttons, and it would risk a flash when the app takes over.
- **The numbers come from the app's math.** Matrices, "as a rotation" equations with their global phase, the tables of what each gate does to the six key states (`format/gateFacts.ts`), and the pictures (`learn/figure.tsx`: SVG spheres drawn from the same math, seen from the app's starting camera, colored by the theme tokens) are computed when the site is built, so they can't disagree with the sphere. Facts the prose states by hand are checked in `learn/claims.test.ts`. KaTeX runs with `throwOnError` and `strict`, so a typo in a formula fails the build.
- **Tests** (`learn/learn.test.ts`): every page renders, has one h1, a canonical URL and breadcrumbs, a title of at most 60 characters and a description of at most 155; every link leads to a page that exists; every Try it link parses.

### 13.2 Readable links

`model/link.ts`: links that open the site set up, short enough to read and type. `#/?start=0,+&gates=H,Sdg,Rx(90)` starts a new journey with those qubits and plays the gates on all of them; `#/lab?start=+&gates=H,T,H` opens the Gate Lab with those tiles. States are `0 1 + - +i -i` or `θ:φ` in degrees. Opening one replaces the journey (with Restore) and tidies the URL to `#/` or `#/lab`, so a reload doesn't replay it. Links are untrusted, so parsing validates everything, and an invalid one opens the site as usual. Share (section 9) will carry whole journeys; these carry a start and a few gates.

### 13.3 In the app

- **"Learn the basics ›"** at the start of the top bar, and **"About the … gate ›"** in the Gate panel (`format/gateNames.ts`, `gateLearnPath`).
- **Terms** (`ui/widgets/Term.tsx`): labels such as State, vector, circle notation, P(0), θ, φ, (x, y, z), Gate and "Rotates the sphere" open a one-line definition and a link to the guide that says more. The definitions live in `format/glossary.ts` and are also listed on the Learn hub. The popover renders at the end of the page, since labels sit in headings and paragraphs.

### 13.4 Challenges

- **The rules** (`model/challenges.ts`): get q1 from one axis state to another using only some gates, in as few as you can. Eight, from one gate ("Flip it") to six ("The long way round"). A test finds the fewest gates for each by search and checks them against the stated par. Three stars at par, two within two more, one otherwise.
- **A mode of the Sphere room,** not a room: the store keeps which challenge is on. Starting one starts a new journey with q1 alone at the start (Restore brings the old journey back). While it's on, the store accepts only the challenge's gates (so keyboard shortcuts, My gates and the Gate Lab's Apply can't get around it); the gate bar disables the rest and hides R(θ) and pinned gates; + Qubit and Set state are hidden; Reset starts the attempt over.
- **On screen:** a card over the sphere with the goal, gates used, the par, a hint and Start over, and once solved, the stars and Next challenge; a ring and a faint arrow on the sphere mark the goal (`scene/TargetMarker.tsx`, passed to the scene as one of the room's layers). Challenges ▾ at the end of the qubit strip lists them with the stars earned.
- **Saved:** the best stars per challenge in `localStorage` (the privacy page says so); the challenge in progress in `sessionStorage`, with the journey.

### 13.5 Search

- **Home page head:** a descriptive title, description, canonical URL, Open Graph and Twitter tags with a 1200×630 picture (`public/og.png`), and schema.org `WebApplication` data (a JSON block, never run, so the CSP doesn't apply). The Learn pages have their own titles, descriptions, canonical URLs and `BreadcrumbList` data.
- **Without JavaScript,** `index.html` shows what the site is and links to the guides, in the app's own grid and top bar, so the title doesn't move when the app replaces it. It fades in only after a moment, so a quick load doesn't flash it.
- **`robots.txt` and `sitemap.xml`** (the sitemap is written by the build from the page list). No `lastmod`: the build can't know when a page last changed, and a wrong date is worse than none.
- **No analytics,** as before. Google Search Console, once set up for the domain, shows search traffic without adding anything to the site.

---

## Sources

- Frameworks:
  - [Svelte 5 vs React in 2026](https://alexcloudstar.com/blog/svelte-5-vs-react-2026/)
  - [SolidJS vs Svelte 5 vs React reactivity](https://www.pkgpulse.com/guides/solidjs-vs-svelte-5-vs-react-reactivity-2026)
  - [State of JS 2025: front-end frameworks](https://2025.stateofjs.com/en-US/libraries/front-end-frameworks/)
- Chosen stack docs: [React Three Fiber](https://r3f.docs.pmnd.rs/), [drei](https://drei.docs.pmnd.rs/), [Zustand](https://zustand.docs.pmnd.rs/)
- 3D:
  - [Threlte extras reference](https://threlte.xyz/docs/reference/extras/getting-started)
  - [three.js vs R3F vs Babylon.js](https://www.pkgpulse.com/guides/threejs-vs-react-three-fiber-vs-babylonjs-3d-webgl-2026)
  - [Threlte maintainer on Threlte vs R3F](https://hn.svelte.dev/item/40205509)
- Math typesetting: [KaTeX](https://katex.org/)
- Layout: [dockview](https://dockview.dev/docs/overview/introduction)
- Representations:
  - [Circle notation (KTH course notes)](https://canvas.kth.se/courses/45835/modules/items/790874)
  - [Visualizing entanglement in multi-qubit systems](https://arxiv.org/pdf/2305.07596)
  - [IBM Quantum Composer guide (phase disks, q-sphere)](https://learning.quantum.ibm.com/tutorial/composer-user-guide)
- Existing tools reviewed:
  - [Bloch sphere with React Three Fiber](https://github.com/th3-Rocha/Bloch-sphere-with-React-Three-Fiber)
  - [UC Bloch Sphere Simulation (record and playback)](https://eecs.ceas.uc.edu/~cahaymm/blochsphere/index.html)
  - [QuTiP Interactive ideas](https://qutip.readthedocs.io/en/latest/development/ideas/qutip-interactive.html)
