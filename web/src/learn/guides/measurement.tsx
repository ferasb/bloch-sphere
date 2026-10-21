import { Qubit } from "../../math/qubit";
import { A, Beside, Figure, k, m, md, Note, Section, TryIt, TryRow } from "../components";
import { SphereFigure } from "../figure";

const EXAMPLE = Qubit.fromBlochAngles(Math.PI / 3, Math.PI / 2);

export function Measurement() {
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>Tilted 60° from {k`0`}, the arrow's tip is at height z = 0.5, so P(0) = (1 + 0.5) / 2 = 75%.</>}>
            <SphereFigure
              id="height"
              description="A Bloch sphere with an arrow tilted 60 degrees from the top, and a level line from its tip across to the z axis at height one half."
              arrows={[{ to: EXAMPLE.blochVector() }]}
              height={EXAMPLE.blochVector()}
            />
          </Figure>
        }
      >
        <p className="lead">
          Measuring a qubit gives 0 or 1, at random, with odds set by its state. On the Bloch sphere the odds are easy to read: they're the
          arrow's height.
        </p>
        <p>
          An arrow at the top, {k`0`}, gives 0 every time. At the bottom, {k`1`}, it gives 1 every time. Anywhere on the equator it's a coin
          toss. In between, the higher the tip, the likelier 0.
        </p>
      </Beside>

      <Section id="height" title="Odds from the height">
        <p>
          With the tip's height written z (from −1 at the bottom to 1 at the top), the chances are:
        </p>
        {md`P(0) = \frac{1 + z}{2}, \qquad P(1) = \frac{1 - z}{2}`}
        <p>
          The same numbers come from the amplitudes, {m`P(0) = |\alpha|^2`} and {m`P(1) = |\beta|^2`}, or from the angle θ down from the top:{" "}
          {m`P(0) = \cos^2\tfrac{\theta}{2}`}. All three agree, since {m`\cos^2\tfrac{\theta}{2} = \tfrac{1 + \cos\theta}{2}`} and{" "}
          {m`z = \cos\theta`}.
        </p>
        <p>
          The phase, where the arrow points around the sphere, doesn't change these odds at all. Turning the arrow about the vertical axis keeps
          its height.
        </p>
      </Section>

      <Section id="collapse" title="After the measurement">
        <p>
          A measurement changes the qubit. If you got 0, the qubit is now {k`0`}, and measuring it again gives 0 again; if you got 1, it's now{" "}
          {k`1`}. The arrow jumps to the top or the bottom, and the superposition is gone. This is often called the state's{" "}
          <strong>collapse</strong>.
        </p>
        <p>
          It's also why you can't read a qubit's state from one copy of it. One measurement gives one bit. To estimate the odds, and so the
          arrow's height, you prepare the same state many times and count how often 0 comes up.
        </p>
      </Section>

      <Section id="other-axes" title="Measuring along other axes">
        <p>
          The usual measurement asks "{k`0`} or {k`1`}?", the z axis. You can also ask "{k`+`} or {k`-`}?" (the x axis) or "{k`+i`} or{" "}
          {k`-i`}?" (y). The rule is the same with that axis's coordinate in place of z: for example {m`P({+}) = \tfrac{1 + x}{2}`}.
        </p>
        <p>
          Hardware usually only measures along z, so other axes are measured by turning the sphere first. A Hadamard gate swaps the x and z
          axes: apply H, then measure, and "0" means the qubit was {k`+`} and "1" means it was {k`-`}.
        </p>
      </Section>

      <Note title="In the app">
        <p>
          This site doesn't simulate measurement yet. The State panel shows P(0) and P(1) for the selected qubit as bars, and they move as gates
          turn the arrow, so you can watch the odds change.
        </p>
      </Note>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=0&gates=Ry(60)">Tilt {k`0`} by 60°: P(0) drops to 75%</TryIt>
          <TryIt hash="#/?start=+&gates=Rz(90)">Turn {k`+`} about z: the odds stay 50/50</TryIt>
        </TryRow>
        <p>
          Next: <A to="learn/gates/">gates are rotations</A>.
        </p>
      </Section>
    </>
  );
}
