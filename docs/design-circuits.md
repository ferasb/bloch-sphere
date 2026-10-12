# Circuit Lab (design, work in progress)

A room for building circuits of several qubits: wires, single-qubit gates, two-qubit gates (CNOT, CZ, SWAP), entanglement, measurement and shots. It was designed for the Bloch Sphere site and then set aside to become its own project (see `docs/design-gates.md` §4.2 on `main`). This branch keeps the design and the code so far:

- **Done and tested:** the register model (`web/src/math/register.ts`, with `python/register.py`), the circuit model (`web/src/model/circuit.ts`) and the captions (`web/src/format/circuit.ts`).
- **Written but never tried in a browser:** the room's UI (`web/src/ui/circuit/`), saving circuits (`web/src/persist/circuits.ts`), and Run on sphere.

Section numbers below are this document's own.

## 1. The Circuit Lab

A third room (`#/circuit`) for **building** a circuit rather than recording one. It uses the same grammar as the other two rooms: a palette above, the work in the middle, one sidebar that explains, and a bar along the bottom. Wires run left to right in time, as in IBM's Composer, which students will meet later.

```
+-------------------------------------------------------------+-----------------------------+
|                    BLOCH SPHERE                              |  Sphere · Gate Lab · Circuit |
+-------------------------------------------------------------+-----------------------------+
| PALETTE [X][Y][Z][H][S][T][S†][T†][R(θ)▾] │ [CNOT][CZ][SWAP] │ [Measure] │ My gates ▾      |
|                                                             | AT THE PLAYHEAD             |
|  ● q1 |0⟩ ─────────────────────────────────┊──[M]── |0⟩    |   (3D sphere: every qubit's |
|  ● q2 |0⟩ ──⊕──[X]─────────────────[X]──⊕──┊──[M]── |0⟩    |    arrow, same as the       |
|  ● q3 |0⟩ ──●──[H]──[T]──[T†]──[H]──●──────┊──[M]── |0⟩    |    Sphere room)             |
|  ● q4 |0⟩ ─────[S]──[Z]──[Z]───[S†]───────┊──[M]── |0⟩    |                             |
|  ● q5 |0⟩ ─────[Y]─────────────[Y]─────────┊──[M]── |0⟩    | JOINT STATE                 |
|      c  ═══════════════════════════════════┊═══╧═══ 5 bits |   |00000⟩ ● 100%  (circles)  |
|  [+ qubit]                                 ┊ playhead       | GATE (the selected one)     |
+-------------------------------------------------------------+-----------------------------+
| ⏮ ◀ ⏵ ▶ ⏭  column 6 of 8    [Run 1000 shots]  │ Name [ ] [Save] [Open… ▾] [Run on sphere ▸] |
+------------------------------------------------------------------------------------------+
```

- **Center:** the circuit. Each wire starts with its qubit's color dot, name and starting state, and ends with a small chip naming its state at the playhead (|0⟩, θ/φ, or *entangled*).
- **Sidebar:**
  - **the 3D sphere at the playhead,** with every qubit's arrow, as in the Sphere room;
  - **the joint state** in circle notation;
  - **the selected gate** (matrix, rotation, Open in Gate Lab).
- **Bottom bar:** step and play, shots, save, open, and Run on sphere.

## 2. Building a circuit

- **Drag from the palette** onto a wire. A drop indicator shows the column and wire it will land in. Gates slide left to the earliest free column, as in Composer, so circuits stay compact.
- **Or click to place:**
  - Click a palette gate to "arm" it, then click wire cells to place copies.
  - Escape disarms.
  - This is faster than dragging, and works for people who can't drag.
- **Keyboard:** arrow keys move a cursor over the grid, gate letters place a gate at it, and Delete removes one.
- **Connecting two-qubit gates:**
  - Dropping a CNOT on a wire puts its control ● there and its target ⊕ on the next wire.
  - Drag either end to another wire to reconnect it, and the vertical line follows. This is the "connect" interaction.
- **Moving and deleting:** drag a placed gate to another column or wire; select it and press Delete, or use its ×.
- **Gate settings:** selecting a gate shows it in the sidebar's Gate section. A rotation's angle is edited there, and any gate can be opened in the Gate Lab.
- **Starting states:** click a wire's |0⟩ to pick any of the six axis states.
- **Wires:** **+ qubit** adds one (up to 5, with the qubit colors); a wire's × removes it, along with its gates.

## 3. Running it

- **The playhead** is a vertical line between columns: drag it, or step with ◀ ▶.
  - A column's gates happen together, so stepping over a column animates all of them at once on the sidebar sphere.
  - ⏵ plays to the end.
  - Everything in the sidebar shows the state at the playhead.
- **Run on sphere ▸** sends the circuit to the Sphere room as a journey, one step per column, so all of its replay machinery is reused. **Open journey as circuit** goes the other way.

## 4. Two-qubit gates and entanglement

The CNOT is what makes circuits interesting. Without it, wires never interact, and a circuit is just several independent journeys side by side. The two-qubit gates:
- **CNOT** (● and ⊕), **CZ** (● and ●), and **SWAP** (× and ×);
- **controlled-U** for any gate U, made with the Gate Lab's **Control** operation.

**Entanglement in one paragraph.** Two qubits are entangled when their shared state can't be described as "q1 is like this, and q2 is like that". Example: H on q1, then CNOT from q1 to q2, gives (|00⟩ + |11⟩)/√2. Each qubit on its own is a 50/50 coin, yet the two always agree. Neither qubit has a direction of its own, so on the sphere **both arrows shrink to the center**. An arrow's length is how much of its own state a qubit still has: 1 for not entangled, 0 for fully entangled.

**"Why didn't it entangle?" answered on the spot.** Each two-qubit gate gets a one-line explanation at its column, computed from the state there:

| At that column | What the CNOT does | Caption |
|---|---|---|
| The control is exactly \|0⟩ | nothing | "q3 is \|0⟩ here, so this CNOT does nothing." |
| The control is exactly \|1⟩ | flips the target | "q3 is \|1⟩ here, so this CNOT just flips q2." |
| The control is in a superposition | entangles them | "q3 is in a superposition, so this CNOT entangles q3 and q2." |

The first row is exactly why the example circuit (two CNOTs from q3 to q2, with H·T·T†·H between them) never entangles. Moving its second CNOT one column earlier does entangle them, and both arrows shrink to the center. This was checked by simulation.

**Visuals:**
- arrows that shrink smoothly as the CNOT plays, leaving a faint ring at their full length;
- a thin link between entangled qubits on the sphere, labeled "entangled";
- the wire-end chip reads *entangled*;
- the **joint state** in circle notation: 2ⁿ circles (|00⟩, |01⟩, |10⟩, |11⟩, …). It's the only view that shows the whole state once qubits are entangled, and the same notation students already know from the State panel.
- **Global phase stops being global once a gate is controlled:** Z and −Z are the same rotation, but CZ and controlled-(−Z) are different gates. The Gate Lab can show this side by side.

These were planned from the start, alongside the single-qubit features.

## 5. Measurement and shots

- **Measure** on a wire draws the meter box. A classical-bit line appears under the wires, with a line down to its bit.
- **Stepping over a measurement** collapses the qubit: the arrow snaps to |0⟩ or |1⟩ with the right odds. With entanglement, a partner's arrow snaps at the same moment, which is the surprising part.
- **Run 1000 shots** runs the circuit many times and fills a histogram of the bit strings (00000, 00011, …) in the sidebar. The example circuit gives 00000 every time; a Bell pair gives 00 and 11, about half each, and never 01 or 10.

## 6. The model

```ts
interface Circuit {
  wires: { id: string; colorSlot: number; start: string }[];   // start: one of the six axis states
  ops: Op[];
}
type Op =
  | { id: string; col: number; kind: "gate"; wire: number; tile: Tile }            // any single-qubit gate, by value
  | { id: string; col: number; kind: "controlled"; control: number; target: number; tile: Tile } // CNOT = controlled X
  | { id: string; col: number; kind: "swap"; a: number; b: number }
  | { id: string; col: number; kind: "measure"; wire: number; bit: number };
```

- **The simulation is a register:** 2ⁿ complex amplitudes (n ≤ 5, so at most 32). It lives in `math/register.ts`, with the Python reference doing the same in `register.py` and the two tested against each other.
- **Each qubit's arrow** comes from its reduced state (a partial trace). Its length tells how entangled it is.
- **Built on the register from the start** (C1), even before two-qubit gates exist. A circuit of single-qubit gates is just a register that stays a product state, so adding the CNOT later is a feature, not a restructure.

## 7. Saving circuits

- **Save** a circuit from the Circuit Lab with a name; it joins **My circuits**. Open, rename, duplicate and delete work as they do for gates.
- **Self-contained.** A saved circuit stores the custom gates it uses by value, so it still works after those gates are edited or deleted.
- **Export and import** as `.json`, like gates.
- **Run on sphere** sends a saved circuit to the Sphere room as a journey (§3).
