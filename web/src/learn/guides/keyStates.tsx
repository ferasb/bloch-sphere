import { percentText } from "../../format/angles";
import { labelTex } from "../../format/gateFacts";
import { ketTex } from "../../format/ket";
import { NAMED_STATES } from "../../math/qubit";
import { A, Beside, Figure, k, Note, Section, Tex, TryIt, TryRow } from "../components";
import { SphereFigure } from "../figure";

/** Where each axis state sits in the app's starting view. */
const PLACE: Record<string, string> = {
  "|0⟩": "top",
  "|1⟩": "bottom",
  "|+⟩": "front, toward you",
  "|−⟩": "back",
  "|+i⟩": "right",
  "|−i⟩": "left",
};

/** A Bloch vector of whole numbers, as "(0, 0, 1)". */
function vectorText(v: readonly number[]): string {
  return `(${v.map((c) => (Math.abs(c) < 1e-9 ? "0" : Math.round(c) < 0 ? "−1" : "1")).join(", ")})`;
}

export function KeyStates() {
  return (
    <>
      <Beside
        figure={
          <Figure caption="The six key states sit where the x, y and z axes meet the sphere.">
            <SphereFigure
              id="six-states"
              description="A Bloch sphere with a dot at each of the six points where the axes meet it: |0⟩ at the top, |1⟩ at the bottom, and |+⟩, |−⟩, |+i⟩, |−i⟩ around the equator."
              dots={NAMED_STATES.map(({ state }) => ({ at: state.blochVector() }))}
            />
          </Figure>
        }
      >
        <p className="lead">
          Six states sit where the axes meet the sphere. They come up everywhere in quantum computing, and most gates are easiest to understand
          by where they send these six.
        </p>
        <p>
          Two are the poles, {k`0`} and {k`1`}. The other four are on the equator: equal superpositions of {k`0`} and {k`1`}, with 50/50 odds of
          measuring either, that differ only in their phase.
        </p>
      </Beside>

      <Section id="table" title="The six states">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>As a ket</th>
                <th>(x, y, z)</th>
                <th>P(0)</th>
                <th>Where</th>
              </tr>
            </thead>
            <tbody>
              {NAMED_STATES.map(({ label, state }) => (
                <tr key={label}>
                  <td>
                    <Tex tex={labelTex(label)} />
                  </td>
                  <td>
                    <Tex tex={ketTex(state)} />
                  </td>
                  <td className="motion">{vectorText(state.blochVector())}</td>
                  <td className="motion">{percentText(state.probabilities()[0])}</td>
                  <td className="motion">{PLACE[label]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          "Where" is in the app's starting view; drag the sphere and it turns with you. Some books write {k`+i`} and {k`-i`} as {k`i`} and{" "}
          {k`-i`}, or as {k`\circlearrowright`} and {k`\circlearrowleft`}.
        </p>
      </Section>

      <Section id="bases" title="Opposite pairs are bases">
        <p>
          Each pair of opposite states is a <strong>basis</strong>: two states that are completely distinguishable, so that a measurement can ask
          "which of the two?".
        </p>
        <ul>
          <li>
            <strong>Z basis:</strong> {k`0`} and {k`1`}, along the z axis. This is the "computational basis", the one ordinary measurements use.
          </li>
          <li>
            <strong>X basis:</strong> {k`+`} and {k`-`}, along x.
          </li>
          <li>
            <strong>Y basis:</strong> {k`+i`} and {k`-i`}, along y.
          </li>
        </ul>
        <p>
          The three axes are at right angles, and that has a striking consequence: a state that is certain in one basis is completely random in
          the other two. {k`0`} always measures as 0, but asked "{k`+`} or {k`-`}?" it answers each half the time.
        </p>
      </Section>

      <Note title="Same odds, different states">
        <p>
          {k`+`}, {k`-`}, {k`+i`} and {k`-i`} all give 0 or 1 with equal odds. Measuring them in the Z basis can't tell them apart, but they are
          four different states, a quarter turn apart in phase. Gates can tell: a Hadamard turns {k`+`} into {k`0`} and {k`-`} into {k`1`}, and
          then a measurement separates them every time.
        </p>
      </Note>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=+,-&gates=H">
            H on {k`+`} and {k`-`}: they go to {k`0`} and {k`1`}
          </TryIt>
          <TryIt hash="#/?start=+,-,+i,-i&gates=S">S turns the equator a quarter turn</TryIt>
        </TryRow>
        <p>
          In the app, <strong>Set state ▸ Presets</strong> puts the selected qubit on any of the six. Next:{" "}
          <A to="learn/measurement/">measuring a qubit</A>.
        </p>
      </Section>
    </>
  );
}
