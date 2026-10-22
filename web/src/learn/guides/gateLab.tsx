import { phaseFactorTex } from "../../format/gateFacts";
import { rotationText } from "../../format/rotation";
import { Gate } from "../../math/gate";
import { Qubit } from "../../math/qubit";
import { A, Beside, Figure, k, m, md, Note, Section, Tex, TryIt, TryRow } from "../components";
import { SphereFigure, type FigureArc } from "../figure";

const HTH = [Gate.H, Gate.T, Gate.H];

/** Each tile's arc for H, T, H on |0⟩, and the one rotation they add up to. */
function pathArcs(): { arcs: FigureArc[]; end: Qubit } {
  const arcs: FigureArc[] = [];
  let state = Qubit.ZERO;
  for (const gate of HTH) {
    const { axis, angle } = gate.axisAngle();
    arcs.push({ from: state.blochVector(), axis, angle });
    state = gate.apply(state);
  }
  const total = HTH.reduce((u, g) => Gate.mult(g, u), Gate.I).axisAngle();
  arcs.push({ from: Qubit.ZERO.blochVector(), axis: total.axis, angle: total.angle, dashed: true });
  return { arcs, end: state };
}

export function GateLab() {
  const { arcs, end } = pathArcs();
  const hth = Gate.mult(Gate.H, Gate.mult(Gate.T, Gate.H));
  const factor = phaseFactorTex(hth, Gate.rx(Math.PI / 4))!;
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>H, T, H on {k`0`}: one solid arc for each turn, and dashed, the single turn they add up to: 45° about x.</>}>
            <SphereFigure
              id="hth"
              description="A Bloch sphere: the path of |0⟩ through H, then T, then H, as three solid arcs, and a dashed arc for the single 45-degree turn about x that has the same effect."
              arcs={arcs}
              arrows={[{ to: Qubit.ZERO.blochVector(), ghost: true }, { to: end.blochVector() }]}
            />
          </Figure>
        }
      >
        <p className="lead">
          The Gate Lab is where you build your own gates. Line up gates on a bench, and the lab shows what they add up to: however many you use,
          the answer is always one rotation of the sphere.
        </p>
        <p>
          Open it with <strong>Gate Lab</strong> at the top of the app, on a computer or a tablet held sideways: it needs a wider screen than a
          phone's. It keeps its bench while you go back and forth, and gates you save there show up on the sphere's gate bar.
        </p>
      </Beside>

      <Section id="building" title="Building a gate">
        <ol>
          <li>
            Click gates under <strong>Ingredients</strong> (X, Y, Z, H, S, T, their daggers, or a rotation by any angle). Each one lands on the{" "}
            <strong>bench</strong> as a tile, left to right in time order.
          </li>
          <li>
            The <strong>Result</strong> panel shows the gate the tiles make: its formula, its exact matrix, the single rotation it performs, and
            the known gate it equals, if any.
          </li>
          <li>
            The test sphere plays it: each tile's turn as a solid arc, then the one equivalent rotation, dashed. Pick the state to test on under{" "}
            <strong>Test on</strong>, and replay with <strong>▶ Play</strong>.
          </li>
        </ol>
        <p>For example, H, then T, then H adds up to a 45° turn about x:</p>
        <Tex tex={`H\\,T\\,H = ${factor}\\,R_x(45^\\circ)`} display />
        <p>
          The lab reports the rotation ({rotationText(hth)}) and the match, "≡ Rx(45°)", up to the global phase {m`${factor}`}.
        </p>
      </Section>

      <Note title="Why the formula reads backwards">
        <p>
          Tiles run left to right in time, but the formula reads right to left: H, then S on the bench is {m`U = S\,H`}. In a matrix product the
          gate that acts first stands nearest the state, on the right: {m`S\,H\,|\psi\rangle`} means H first. This trips up almost everyone at
          first.
        </p>
      </Note>

      <Section id="operations" title="Taking gates apart">
        <p>Under the bench, operations act on the selected tile, or on the whole bench when none is selected:</p>
        <ul>
          <li>
            <strong>Undo †</strong> makes the inverse, {m`U^\dagger`}: the same turn backward. For a whole bench it reverses the order and undoes
            each tile, since {m`(A\,B)^\dagger = B^\dagger A^\dagger`}.
          </li>
          <li>
            <strong>Repeat ×2, ×3, ×4</strong> applies a gate several times: {m`T^2 = S`}, {m`S^2 = Z`}, and {m`T^8 = I`}.
          </li>
          <li>
            <strong>Fraction ½, ⅓, ¼</strong> takes part of a turn: {m`X^{1/2}`}, the square root of X, is a quarter turn about x.
          </li>
          <li>
            <strong>Compare reversed order</strong> plays the tiles backward too, to show whether order matters for them.
          </li>
        </ul>
      </Section>

      <Section id="saving" title="Saving and using your gates">
        <p>
          Give the gate a <strong>Name</strong> and a short <strong>Label</strong> (up to four characters, for its button), and choose{" "}
          <strong>Save to My gates</strong>. With <strong>Pin to gate bar</strong> on, it appears next to the built-in gates on the sphere.{" "}
          <strong>Apply</strong> takes it straight back to the sphere and plays it there. Saved gates are kept in this browser.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <p>Each link opens the lab with these tiles on the bench:</p>
        <TryRow>
          <TryIt hash="#/lab?start=0&gates=H,T,H">H, T, H: a 45° turn about x</TryIt>
          <TryIt hash="#/lab?start=0&gates=H,Z,H">H, Z, H: the same as X</TryIt>
          <TryIt hash="#/lab?start=+&gates=Sdg,X,S">S†, X, S: the same as Y</TryIt>
        </TryRow>
        <p>
          The last one moves X's axis: turning by S† first and by S after turns the x axis a quarter turn, onto y. More on why in{" "}
          <A to="learn/gates/">Gates are rotations</A>.
        </p>
        {md`S\,X\,S^\dagger = Y`}
      </Section>
    </>
  );
}
