import { Qubit as State } from "../../math/qubit";
import { A, Beside, Figure, k, m, md, Note, Section, TryIt, TryRow } from "../components";
import { SphereFigure } from "../figure";

export function Qubit() {
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>Three qubits: one in {k`0`}, one in {k`1`}, and one in an equal superposition of the two, {k`+`}.</>}>
            <SphereFigure
              id="three-qubits"
              description="A Bloch sphere with three arrows: green pointing up to |0⟩, violet down to |1⟩, and amber out to |+⟩ on the equator."
              arrows={[
                { to: State.ZERO.blochVector(), color: 1, label: "q1" },
                { to: State.ONE.blochVector(), color: 2, label: "q2" },
                { to: State.PLUS.blochVector(), color: 3, label: "q3" },
              ]}
            />
          </Figure>
        }
      >
        <p className="lead">
          A qubit is the quantum version of a bit. A bit is always 0 or 1. A qubit can also be in a <strong>superposition</strong>: a combination
          of 0 and 1 with a direction to it. That direction is why a qubit's state can be drawn as an arrow on a sphere.
        </p>
        <p>
          The two basic states of a qubit are written {k`0`} and {k`1`}, read "ket zero" and "ket one". The bracket notation is called a ket; it just
          marks something as a quantum state. Any other state of the qubit is a mix of these two, with a number in front of each:
        </p>
        {md`|\psi\rangle = \alpha\,|0\rangle + \beta\,|1\rangle`}
        <p>
          The numbers {m`\alpha`} (alpha) and {m`\beta`} (beta) are the <strong>amplitudes</strong>, and {m`|\psi\rangle`} (psi) is the usual name
          for "the state".
        </p>
      </Beside>

      <Section id="measuring" title="What the amplitudes tell you">
        <p>
          When you measure a qubit you always get a plain 0 or 1, never something in between. The amplitudes set the odds. The chance of 0 is the
          size of {m`\alpha`} squared, and the chance of 1 is the size of {m`\beta`} squared:
        </p>
        {md`P(0) = |\alpha|^2, \qquad P(1) = |\beta|^2, \qquad |\alpha|^2 + |\beta|^2 = 1`}
        <p>
          The last part says the two chances add up to 100%. For example, the state with {m`\alpha = \beta = \tfrac{1}{\sqrt{2}}`} gives 0 or 1 with
          equal odds, since {m`(\tfrac{1}{\sqrt{2}})^2 = \tfrac{1}{2}`}. That state has a name, {k`+`}:
        </p>
        {md`|{+}\rangle = \tfrac{1}{\sqrt{2}}\,|0\rangle + \tfrac{1}{\sqrt{2}}\,|1\rangle`}
        <p>
          After the measurement, the superposition is gone: the qubit is now in {k`0`} or {k`1`}, whichever you got. More in{" "}
          <A to="learn/measurement/">Measuring a qubit</A>.
        </p>
      </Section>

      <Note title='Not "0 and 1 at the same time"'>
        <p>
          Qubits are often described as being 0 and 1 at once. That picture misleads: you can never read out both, and a measurement gives one
          answer. What a superposition has that a coin toss doesn't is <strong>phase</strong>, the next part of this page. Phase is what lets gates
          make amplitudes add up or cancel out, and that is where quantum algorithms get their power.
        </p>
      </Note>

      <Section id="phase" title="Phase: the part probabilities miss">
        <p>
          Amplitudes are complex numbers, so each one has a size and an angle. The sizes give the probabilities. The angle between the two
          amplitudes is the <strong>relative phase</strong>, and it is just as much a part of the state. Take {k`+`} and its partner {k`-`}:
        </p>
        {md`|{+}\rangle = \tfrac{1}{\sqrt{2}}\,|0\rangle + \tfrac{1}{\sqrt{2}}\,|1\rangle, \qquad |{-}\rangle = \tfrac{1}{\sqrt{2}}\,|0\rangle - \tfrac{1}{\sqrt{2}}\,|1\rangle`}
        <p>
          Measured right away, both give 0 or 1 with equal odds, so you can't tell them apart that way. Yet they are different states: the
          minus sign is a phase of 180° on {k`1`}. A Hadamard gate turns {k`+`} into {k`0`} and {k`-`} into {k`1`}, after which a measurement tells
          them apart every time.
        </p>
        <p>
          The angle of the state as a whole, the <strong>global phase</strong>, is different: multiplying the whole state by a factor such as{" "}
          {m`-1`} or {m`i`} changes nothing that any measurement can detect. So {m`-|1\rangle`} is the same physical state as {k`1`}.
        </p>
        <p>
          The app's State panel draws amplitudes in <strong>circle notation</strong>: one circle for {k`0`} and one for {k`1`}. The filled area is
          the probability, and the line shows the phase, pointing up for a phase of 0 and turning counterclockwise as the phase grows.
        </p>
      </Section>

      <Section id="sphere" title="From two numbers to one arrow">
        <p>
          Two complex amplitudes sound like four numbers, but two of them are spoken for: the probabilities must add up to 1, and the global
          phase doesn't matter. What's left is two angles: how far the state is between {k`0`} and {k`1`}, and its relative phase. Two angles pick
          a point on a sphere, the way latitude and longitude pick a place on Earth.
        </p>
        <p>
          That sphere is the <A to="learn/bloch-sphere/">Bloch sphere</A>. {k`0`} sits at the top, {k`1`} at the bottom, and the equal
          superpositions such as {k`+`} and {k`-`} go around the equator. Every state of one qubit is a point on its surface, drawn as an arrow
          from the center.
        </p>
      </Section>

      <Section id="math" title="The math, in one place">
        <p>A qubit's state is a vector of two complex numbers with total probability 1:</p>
        {md`|\psi\rangle = \alpha\,|0\rangle + \beta\,|1\rangle = \begin{bmatrix} \alpha \\ \beta \end{bmatrix}, \qquad |\alpha|^2 + |\beta|^2 = 1`}
        <p>
          Here {m`|0\rangle = \left[\begin{smallmatrix} 1 \\ 0 \end{smallmatrix}\right]`} and{" "}
          {m`|1\rangle = \left[\begin{smallmatrix} 0 \\ 1 \end{smallmatrix}\right]`}. Two vectors that differ only by a factor{" "}
          {m`e^{i\gamma}`} are the same state. Gates are 2×2 matrices that multiply this vector; see{" "}
          <A to="learn/gates/">Gates are rotations</A>.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <p>Each link opens the sphere set up for you; the gates play after a moment.</p>
        <TryRow>
          <TryIt hash="#/?start=0&gates=H">
            Make a superposition: H on {k`0`}
          </TryIt>
          <TryIt hash="#/?start=+,-&gates=H">
            Tell {k`+`} and {k`-`} apart with H
          </TryIt>
        </TryRow>
        <p>
          In the app, the State panel shows the selected qubit's ket, its amplitudes in circle notation, and its probabilities, all moving as
          the arrow turns.
        </p>
      </Section>
    </>
  );
}
