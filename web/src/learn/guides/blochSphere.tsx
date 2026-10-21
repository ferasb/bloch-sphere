import { Qubit } from "../../math/qubit";
import { A, Beside, Figure, k, m, md, Note, Section, TryIt, TryRow } from "../components";
import { SphereFigure } from "../figure";

const EXAMPLE = Qubit.fromBlochAngles(Math.PI / 3, Math.PI / 3);

export function BlochSphere() {
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>The state with θ = 60° and φ = 60°: tilted 60° down from {k`0`}, and turned 60° around from {k`+`} toward {k`+i`}.</>}>
            <SphereFigure
              id="angles"
              description="A Bloch sphere with an arrow tilted 60 degrees down from the top and turned 60 degrees around the equator, with the angles θ and φ marked."
              arrows={[{ to: EXAMPLE.blochVector() }]}
              angles={EXAMPLE.blochVector()}
            />
          </Figure>
        }
      >
        <p className="lead">
          The Bloch sphere is a picture of every state one qubit can be in. Each state is a point on the surface of a ball, drawn as an arrow from
          the center. Gates turn the arrow, and the arrow's height tells you the odds of measuring 0 or 1.
        </p>
        <p>
          It's named after the physicist Felix Bloch. It works for any qubit, whatever the qubit is made of (an atom, a photon, a superconducting
          circuit), because the math of one qubit is the same for all of them.
        </p>
      </Beside>

      <Section id="reading" title="Reading the sphere">
        <ul>
          <li>
            <strong>Top and bottom:</strong> {k`0`} is at the top (the north pole) and {k`1`} at the bottom.
          </li>
          <li>
            <strong>Height is probability.</strong> The higher the arrow, the likelier a measurement gives 0. At the top it's certain, at the
            equator it's 50/50, at the bottom it never happens.
          </li>
          <li>
            <strong>Around is phase.</strong> States at the same height have the same odds; where they sit around the sphere is their relative
            phase. On the equator, {k`+`} points toward you, {k`+i`} to the right, {k`-`} at the back and {k`-i`} to the left (in the app's starting
            view).
          </li>
          <li>
            <strong>Opposite points are opposite answers.</strong> Two states on opposite sides, like {k`0`} and {k`1`}, or {k`+`} and {k`-`}, can
            be told apart perfectly by the right measurement.
          </li>
        </ul>
      </Section>

      <Section id="angles" title="Two angles: θ and φ">
        <p>Like latitude and longitude, two angles say where the arrow points:</p>
        <ul>
          <li>
            <strong>θ (theta)</strong> is how far the arrow tilts down from the top: 0° at {k`0`}, 90° on the equator, 180° at {k`1`}.
          </li>
          <li>
            <strong>φ (phi)</strong> is how far it has turned around the vertical axis, measured from {k`+`} toward {k`+i`}: 0° at {k`+`}, 90° at{" "}
            {k`+i`}, 180° at {k`-`}, 270° at {k`-i`}. At the poles φ has no meaning, the way longitude has none at the North Pole.
          </li>
        </ul>
        <p>The two angles give the state directly:</p>
        {md`|\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}\,|1\rangle`}
        <p>
          Check the corners: {m`\theta = 0`} gives {k`0`}; {m`\theta = 180^\circ`} gives {m`e^{i\varphi}|1\rangle`}, which is {k`1`} up to a
          global phase; {m`\theta = 90^\circ, \varphi = 0`} gives {m`\tfrac{1}{\sqrt{2}}(|0\rangle + |1\rangle) = |{+}\rangle`}.
        </p>
      </Section>

      <Section id="coordinates" title="The arrow as coordinates (x, y, z)">
        <p>
          The arrow's tip is a point {m`(x, y, z)`} with length 1, called the <strong>Bloch vector</strong>. The x axis points to {k`+`}, y to{" "}
          {k`+i`} and z to {k`0`}. From the angles, or straight from the amplitudes {m`\alpha`} and {m`\beta`}:
        </p>
        {md`(x, y, z) = (\sin\theta\cos\varphi,\ \sin\theta\sin\varphi,\ \cos\theta)`}
        {md`x = 2\,\mathrm{Re}(\bar\alpha\beta), \quad y = 2\,\mathrm{Im}(\bar\alpha\beta), \quad z = |\alpha|^2 - |\beta|^2`}
        <p>
          The height z gives the probabilities: {m`P(0) = \tfrac{1 + z}{2}`} and {m`P(1) = \tfrac{1 - z}{2}`}. The app's State panel shows θ, φ
          and {m`(x, y, z)`} for the selected qubit as it moves.
        </p>
      </Section>

      <Note title="Why are |0⟩ and |1⟩ opposite, not at right angles?">
        <p>
          As vectors, {k`0`} and {k`1`} are orthogonal: at right angles, with nothing in common. On the sphere they're 180° apart. The reason is
          the half angle in the formula above: the state uses {m`\theta/2`}, so every angle on the sphere is twice the angle between the state
          vectors. Orthogonal states, 90° apart as vectors, always land on opposite points of the sphere.
        </p>
      </Note>

      <Section id="global-phase" title="What the sphere leaves out: global phase">
        <p>
          Multiplying a whole state by a factor such as {m`-1`}, {m`i`} or {m`e^{i\gamma}`} changes nothing that any measurement can detect, so
          the sphere doesn't show it: {k`1`} and {m`-|1\rangle`} are the same point. This is why the formula above can start with a real,
          positive {m`\cos\tfrac{\theta}{2}`}. The app writes every state that way (α real and at least 0), so the ket and the arrow always
          agree.
        </p>
        <p>
          The relative phase between {k`0`} and {k`1`} is a different matter: it is the angle φ, and it changes where the arrow points.
        </p>
      </Section>

      <Section id="limits" title="One qubit at a time">
        <p>
          The sphere shows one qubit. Several qubits can each have their own arrow while they're independent, which is what the app's five
          colored qubits are. Once qubits are <strong>entangled</strong>, no single arrow can describe one of them, and a sphere per qubit no
          longer shows the whole state.
        </p>
        <p>
          Points <em>inside</em> the ball also mean something: they're <strong>mixed states</strong>, a qubit whose state is uncertain, for
          example one that is {k`0`} or {k`1`} with equal chances, which sits at the center. This site sticks to pure states, on the surface.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=60:60">The state above: θ 60°, φ 60°</TryIt>
          <TryIt hash="#/?start=0,60:0,120:0,1">Four heights: P(0) = 100%, 75%, 25%, 0%</TryIt>
        </TryRow>
        <p>
          In the app, <strong>Set state ▸ Angles</strong> has sliders for θ and φ: drag them and a ghost arrow previews the state before you set
          it. Drag the sphere to look at it from any side. Next: <A to="learn/key-states/">the six key states</A>.
        </p>
      </Section>
    </>
  );
}
