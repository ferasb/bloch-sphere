import { degreesText, percentText } from "../../format/angles";
import { Gate } from "../../math/gate";
import { Qubit } from "../../math/qubit";
import { A, Beside, Figure, k, m, md, Note, Section, Tex, TryIt, TryRow } from "../components";
import { SphereFigure, type FigureArc } from "../figure";

const DEG = Math.PI / 180;

/** The turn about z in the figure. */
const PHI = 60 * DEG;

/** Gates in time order, first applied first, as one gate. */
function seq(...gates: Gate[]): Gate {
  return gates.reduce((u, g) => Gate.mult(g, u), Gate.I);
}

/** The figure's path: |0⟩ through H, the turn, and H, then dashed, the one turn about x they add up to. */
function pathArcs(): { arcs: FigureArc[]; end: Qubit } {
  const arcs: FigureArc[] = [];
  let state = Qubit.ZERO;
  for (const gate of [Gate.H, Gate.rz(PHI), Gate.H]) {
    const { axis, angle } = gate.axisAngle();
    arcs.push({ from: state.blochVector(), axis, angle });
    state = gate.apply(state);
  }
  const total = seq(Gate.H, Gate.rz(PHI), Gate.H).axisAngle();
  arcs.push({ from: Qubit.ZERO.blochVector(), axis: total.axis, angle: total.angle, dashed: true });
  return { arcs, end: state };
}

/** The table's middle gates: none, then turns about z of growing angle. */
const MIDDLE: { tex: string; gate: Gate }[] = [
  { tex: "I", gate: Gate.I },
  { tex: "T", gate: Gate.T },
  { tex: "S", gate: Gate.S },
  { tex: "R_z(120^\\circ)", gate: Gate.rz(120 * DEG) },
  { tex: "Z", gate: Gate.Z },
];

/** H, a gate, then H on |0⟩: the turn the gate makes, and the odds at the end. */
function OddsTable() {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>In the middle</th>
            <th>Turn about z, φ</th>
            <th>P(0)</th>
            <th>P(1)</th>
          </tr>
        </thead>
        <tbody>
          {MIDDLE.map(({ tex, gate }) => {
            const [p0, p1] = seq(Gate.H, gate, Gate.H).apply(Qubit.ZERO).probabilities();
            return (
              <tr key={tex}>
                <td>{tex === "I" ? "nothing" : <Tex tex={tex} />}</td>
                <td>{degreesText(gate.axisAngle().angle)}</td>
                <td>{percentText(p0)}</td>
                <td>{percentText(p1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Interference() {
  const { arcs, end } = pathArcs();
  const [p0] = end.probabilities();
  return (
    <>
      <Beside
        figure={
          <Figure
            caption={
              <>
                {k`0`} through H, a {degreesText(PHI)} turn about z, and H again: a solid arc for each turn. Together they make one{" "}
                {degreesText(PHI)} turn about x (dashed), which leaves the arrow at height {+end.blochVector()[2].toFixed(2)}, so P(0) ={" "}
                {percentText(p0)}.
              </>
            }
          >
            <SphereFigure
              id="h-phase-h"
              description="A Bloch sphere: the path of |0⟩ through H, a 60-degree turn about z, and H again, as three solid arcs, and a dashed arc for the single 60-degree turn about x that has the same effect. A level line marks the arrow's height at the end."
              arcs={arcs}
              arrows={[{ to: Qubit.ZERO.blochVector(), ghost: true }, { to: end.blochVector() }]}
              height={end.blochVector()}
            />
          </Figure>
        }
      >
        <p className="lead">
          A measurement only sees the arrow's height. Turning a qubit about the z axis changes its phase but not its height, so on its own it
          doesn't change the odds at all. Yet phase is what quantum algorithms work with. The way they use it is <strong>interference</strong>:
          a gate mixes the two amplitudes so that they add up or cancel out, and the phase decides which.
        </p>
        <p>
          The simplest example takes three gates: H, a turn by an angle φ about z, and H again. Change φ, and measuring 0 at the end goes from
          certain to impossible.
        </p>
      </Beside>

      <Section id="steps" title="Step by step">
        <p>Follow {k`0`} through the three gates.</p>
        <ol>
          <li>
            <strong>H</strong> takes {k`0`} to {k`+`}: equal amplitudes, with the arrow on the equator.
          </li>
          <li>
            <strong>A turn by φ about z</strong> changes only the relative phase. The arrow moves around the equator, and the odds stay 50/50,
            so measuring now would tell you nothing about φ. Up to a global phase, the state is
            {md`\tfrac{1}{\sqrt{2}}\,\big(|0\rangle + e^{i\varphi}\,|1\rangle\big)`}
          </li>
          <li>
            <strong>H again</strong> mixes the amplitudes. The new amplitude of {k`0`} is the sum of the old two, and the new amplitude of{" "}
            {k`1`} is their difference, each divided by {m`\sqrt{2}`}:
            {md`\tfrac{1 + e^{i\varphi}}{2}\,|0\rangle + \tfrac{1 - e^{i\varphi}}{2}\,|1\rangle`}
          </li>
        </ol>
      </Section>

      <Section id="add-or-cancel" title="Adding up and canceling out">
        <p>
          The second H gives each new amplitude two contributions, one from the old {k`0`} part and one from the old {k`1`} part. How they
          combine depends on the angle between them, which is the phase φ:
        </p>
        <ul>
          <li>
            <strong>φ = 0°:</strong> the two contributions point the same way. They add up for {k`0`} and cancel out for {k`1`}, so the qubit
            ends at {k`0`}: P(0) = 100%. This adding up is called <strong>constructive</strong> interference, and the canceling out{" "}
            <strong>destructive</strong> interference.
          </li>
          <li>
            <strong>φ = 180°:</strong> the other way round. They cancel for {k`0`} and add up for {k`1`}, so the qubit ends at {k`1`}.
          </li>
          <li>
            <strong>In between,</strong> they partly cancel:
          </li>
        </ul>
        {md`P(0) = \left|\tfrac{1 + e^{i\varphi}}{2}\right|^2 = \cos^2\tfrac{\varphi}{2}, \qquad P(1) = \sin^2\tfrac{\varphi}{2}`}
        <p>With gates from the app's gate bar in the middle:</p>
        <OddsTable />
        <p>
          The phase that no measurement could see after step 2 now sets the odds. The app's State panel shows it happening in circle notation:
          after the turn, the line in the {k`1`} circle points φ around, and after the second H, how full each circle is depends on that angle.
        </p>
      </Section>

      <Section id="sphere" title="On the sphere">
        <p>
          On the Bloch sphere the three gates add up to one turn. H swaps the x and z axes, so a turn about z between two Hadamards becomes the
          same turn about x (see <A to="learn/gates/hadamard/">Hadamard</A>):
        </p>
        {md`H\,R_z(\varphi)\,H = R_x(\varphi)`}
        <p>
          A turn by φ about x tilts {k`0`} down by φ, to height {m`\cos\varphi`}, and the rule from{" "}
          <A to="learn/measurement/">Measuring a qubit</A> gives {m`P(0) = \tfrac{1 + \cos\varphi}{2} = \cos^2\tfrac{\varphi}{2}`}: the same
          answer as adding up amplitudes. The figure shows it for φ = {degreesText(PHI)}.
        </p>
      </Section>

      <Note title='Not "every answer at once"'>
        <p>
          Quantum computers are often said to be fast because they try every answer at once. A superposition can hold many possibilities, but a
          measurement returns only one of them, at random, so on its own it's no better than guessing. A quantum algorithm works more like the
          three steps above: spread the amplitude over many possibilities, let the computation put phases on them, then bring them back
          together so that the wrong answers cancel out and the right one adds up. Only some problems can be arranged this way, which is why
          quantum computers are faster for some problems and not for others.
        </p>
      </Note>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=0&gates=H,Rz(60),H">H, a 60° turn, H: P(0) = 75%</TryIt>
          <TryIt hash="#/?start=90:0,90:60,90:120,90:180&gates=H">Four phases, one H: P(0) = 100%, 75%, 25%, 0%</TryIt>
          <TryIt hash="#/lab?start=0&gates=H,Rz(60),H">In the Gate Lab: the same as {m`R_x(60^\circ)`}</TryIt>
        </TryRow>
        <p>
          The second link starts four qubits on the equator, a different phase each, so one H shows the whole table at once. For another case of
          interference, see the <A to="learn/gates/pauli-x/#square-root">square root of NOT</A>.
        </p>
      </Section>
    </>
  );
}
