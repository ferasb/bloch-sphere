import { matrixTex, phaseFactorTex } from "../../format/gateFacts";
import { Gate } from "../../math/gate";
import { Qubit } from "../../math/qubit";
import { normalize } from "../../math/vec3";
import { A, Beside, Figure, k, m, md, Note, Section, Tex, TryIt, TryRow } from "../components";
import { SphereFigure } from "../figure";
import { GatePage, KeyStateTable } from "./gatePage";

const DEG = Math.PI / 180;

/** √X, as the Gate Lab makes it (X, Fraction ½). */
const SQRT_X = Gate.X.power(0.5);

/** "Next" and "see also" links at the end of a gate page. */
function Related({ links }: { links: [string, string][] }) {
  return (
    <p>
      See also:{" "}
      {links.map(([to, name], i) => (
        <span key={to}>
          {i > 0 && " · "}
          <A to={to}>{name}</A>
        </span>
      ))}
    </p>
  );
}

export function PauliX() {
  return (
    <GatePage
      symbol="X"
      gate={Gate.X}
      rotation={{ gate: Gate.rx(Math.PI), tex: "R_x(180^\\circ)" }}
      example={{ from: Qubit.ZERO, caption: <>X turns {k`0`} (dashed) half a turn about the x axis, over to {k`1`}.</> }}
      lead={
        <p className="lead">
          Pauli-X is the quantum NOT gate. It turns {k`0`} into {k`1`} and {k`1`} into {k`0`}, just as NOT flips a bit. On a superposition, it
          swaps the two amplitudes.
        </p>
      }
      matrixNote={
        <>
          <p>
            Column 0 is {m`(0, 1)`}, so X sends {k`0`} to {k`1`}; column 1 sends {k`1`} to {k`0`}. On any state, X swaps the amplitudes:
          </p>
          {md`X\,(\alpha|0\rangle + \beta|1\rangle) = \beta|0\rangle + \alpha|1\rangle`}
        </>
      }
    >
      <Section id="axis" title="States on its axis don't move">
        <p>
          {k`+`} and {k`-`} lie on the x axis, X's own axis, so X leaves them where they are: {m`X|{+}\rangle = |{+}\rangle`}, and{" "}
          {m`X|{-}\rangle = -|{-}\rangle`}, where the minus sign is only a global phase. Swapping equal amplitudes changes nothing, which is the
          same fact in algebra. The NOT only flips states along z.
        </p>
        <p>
          Any other state turns half a turn about x: its tip goes from {m`(x, y, z)`} to {m`(x, -y, -z)`}.
        </p>
      </Section>

      <Section id="twice" title="Twice is nothing">
        <p>
          Two half turns make a full turn, so X followed by X does nothing: {m`X\,X = I`}. X is its own inverse, like NOT.
        </p>
        <p>
          The name comes from Wolfgang Pauli: X, Y and Z are the three <strong>Pauli matrices</strong>, the half turns about the three axes.
        </p>
      </Section>

      <Section id="square-root" title="A square root of NOT">
        <p>
          A puzzle: find a gate that, applied twice, is NOT. For an ordinary bit there isn't one. A gate on one bit can only keep the bit, flip
          it, or set it to 0 or to 1, and doing any of those twice keeps the bit or sets it, never flips it.
        </p>
        <p>
          For a qubit it's easy. X is a half turn about x, so a quarter turn about x, done twice, is X. That quarter turn is the{" "}
          <strong>square root of X</strong>, written √X:
        </p>
        <Tex tex={`\\sqrt{X} = ${matrixTex(SQRT_X)}`} display />
        <p>
          After one √X, {k`0`} is at {k`-i`}, on the equator, where a measurement gives 0 or 1 at random. After the second, it's at {k`1`},
          every time. Two steps that each look like a coin toss add up to a certain flip, because their amplitudes interfere: see{" "}
          <A to="learn/interference/">Interference</A>. To build √X yourself, put X on the Gate Lab's bench and choose{" "}
          <strong>Fraction ½</strong>.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=0&gates=X">X on {k`0`}</TryIt>
          <TryIt hash="#/?start=60:45&gates=X">X on a tilted state</TryIt>
          <TryIt hash="#/?start=+&gates=X">X on {k`+`}: nothing moves</TryIt>
          <TryIt hash="#/?start=0&gates=Rx(90),Rx(90)">Two quarter turns about x make X</TryIt>
        </TryRow>
        <Related
          links={[
            ["learn/gates/pauli-y/", "Pauli-Y"],
            ["learn/gates/pauli-z/", "Pauli-Z"],
            ["learn/gates/", "All gates"],
          ]}
        />
      </Section>
    </GatePage>
  );
}

export function PauliY() {
  return (
    <GatePage
      symbol="Y"
      gate={Gate.Y}
      rotation={{ gate: Gate.ry(Math.PI), tex: "R_y(180^\\circ)" }}
      example={{ from: Qubit.ZERO, caption: <>Y turns {k`0`} half a turn about the y axis. It passes {k`+`} on the way to {k`1`}.</> }}
      lead={
        <p className="lead">
          Pauli-Y also swaps {k`0`} and {k`1`}, but it turns the sphere about the y axis instead of x, and it adds phases on the way:{" "}
          {m`Y|0\rangle = i|1\rangle`} and {m`Y|1\rangle = -i|0\rangle`}.
        </p>
      }
      matrixNote={
        <>
          <p>
            Column 0 is {m`(0, i)`}, so Y sends {k`0`} to {m`i|1\rangle`}. On any state:
          </p>
          {md`Y\,(\alpha|0\rangle + \beta|1\rangle) = -i\beta\,|0\rangle + i\alpha\,|1\rangle`}
        </>
      }
    >
      <Section id="x-and-y" title="X and Y: the same flip by a different road">
        <p>
          On {k`0`} and {k`1`}, X and Y look alike: both flip one to the other, and the {m`i`} in front is a global phase. They differ on the
          equator. X leaves {k`+`} where it is and swaps {k`+i`} with {k`-i`}; Y leaves {k`+i`} where it is and swaps {k`+`} with {k`-`}. Each
          gate keeps the states on its own axis.
        </p>
        <p>
          Y is X and Z combined: {m`Y = i\,X Z`}. As turns, a half turn about z followed by a half turn about x is a half turn about y.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=0&gates=Y">Y on {k`0`}</TryIt>
          <TryIt hash="#/?start=+&gates=Y">Y on {k`+`}</TryIt>
          <TryIt hash="#/?start=+&gates=X">X on {k`+`}, to compare</TryIt>
        </TryRow>
        <Related
          links={[
            ["learn/gates/pauli-x/", "Pauli-X"],
            ["learn/gates/pauli-z/", "Pauli-Z"],
            ["learn/gates/", "All gates"],
          ]}
        />
      </Section>
    </GatePage>
  );
}

export function PauliZ() {
  return (
    <GatePage
      symbol="Z"
      gate={Gate.Z}
      rotation={{ gate: Gate.rz(Math.PI), tex: "R_z(180^\\circ)" }}
      example={{ from: Qubit.PLUS, caption: <>Z turns {k`+`} half a turn about the vertical axis, around the equator to {k`-`}.</> }}
      lead={
        <p className="lead">
          Pauli-Z is the phase flip. It leaves {k`0`} alone and puts a minus sign on {k`1`}. It never changes the odds of measuring 0 or 1, yet
          it changes the state: it turns {k`+`} into {k`-`}.
        </p>
      }
      matrixNote={
        <>
          <p>Z keeps the amplitude of {k`0`} and flips the sign of the amplitude of {k`1`}:</p>
          {md`Z\,(\alpha|0\rangle + \beta|1\rangle) = \alpha|0\rangle - \beta|1\rangle`}
          <p>The sizes stay the same, so the probabilities do too. Only the relative phase changes, by 180°.</p>
        </>
      }
    >
      <Section id="poles" title="Nothing moves at the poles">
        <p>
          {k`0`} and {k`1`} lie on the z axis, so Z leaves them in place. {m`Z|1\rangle = -|1\rangle`} is the same point as {k`1`}: the minus
          sign is a global phase. Apply Z to {k`0`} in the app and nothing moves; the Gate panel points out that the qubit is on the rotation
          axis.
        </p>
      </Section>

      <Section id="seeing-z" title="A change you can't measure directly">
        <p>
          Because Z keeps the height of the arrow, measuring right after Z gives the same odds as before. To see what Z did, turn the sphere so
          the phase becomes a height: a Hadamard gate does that. Sandwiched between two Hadamards, Z becomes a bit flip:
        </p>
        {md`H\,Z\,H = X`}
        <p>
          That's the idea behind many quantum algorithms: work on phases, where gates can make amplitudes add up or cancel, then turn the phases
          into something a measurement can see.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=+&gates=Z">Z on {k`+`}</TryIt>
          <TryIt hash="#/?start=0&gates=Z">Z on {k`0`}: nothing moves</TryIt>
          <TryIt hash="#/?start=0&gates=H,Z,H">H, Z, H on {k`0`}: a bit flip</TryIt>
        </TryRow>
        <Related
          links={[
            ["learn/gates/s-and-t/", "S and T"],
            ["learn/gates/hadamard/", "Hadamard"],
            ["learn/gates/", "All gates"],
          ]}
        />
      </Section>
    </GatePage>
  );
}

const DIAGONAL = normalize([1, 0, 1]);

export function Hadamard() {
  return (
    <GatePage
      symbol="H"
      gate={Gate.H}
      rotation={{ gate: Gate.rotation(DIAGONAL, Math.PI), tex: "R_{\\hat n}(180^\\circ)", where: "\\hat n = \\tfrac{1}{\\sqrt{2}}(1, 0, 1)" }}
      example={{ from: Qubit.ZERO, caption: <>H turns {k`0`} half a turn about the diagonal halfway between x and z, landing on {k`+`}.</> }}
      lead={
        <p className="lead">
          The Hadamard gate, H, makes equal superpositions. It turns {k`0`} into {k`+`} and {k`1`} into {k`-`}, and back again. Most quantum
          algorithms start with it, and it's the gate that switches between the z and x bases.
        </p>
      }
      matrixNote={
        <>
          <p>
            Column 0 is {k`+`} and column 1 is {k`-`}. On any state, H adds and subtracts the amplitudes:
          </p>
          {md`H\,(\alpha|0\rangle + \beta|1\rangle) = \tfrac{\alpha + \beta}{\sqrt{2}}\,|0\rangle + \tfrac{\alpha - \beta}{\sqrt{2}}\,|1\rangle`}
        </>
      }
    >
      <Note title="A half turn, not a quarter turn">
        <p>
          Going from {k`0`} to {k`+`} moves the arrow by 90°, so H is often pictured as a quarter turn about y. It isn't. The quarter turn{" "}
          {m`R_y(90^\circ)`} also takes {k`0`} to {k`+`}, but it takes {k`+`} on to {k`1`}, while H takes {k`+`} back to {k`0`}. H is a half
          turn about the diagonal between x and z, which is why applying it twice does nothing: {m`H\,H = I`}.
        </p>
      </Note>

      <Section id="basis" title="Switching bases">
        <p>
          A half turn about the x–z diagonal swaps the x and z axes, and flips y. So H swaps {k`0`} with {k`+`} and {k`1`} with {k`-`}, and swaps{" "}
          {k`+i`} with {k`-i`}. That makes it a translator between the z basis and the x basis:
        </p>
        {md`H\,Z\,H = X, \qquad H\,X\,H = Z`}
        <p>
          Putting a gate between two Hadamards turns its axis: Z's axis, turned by H, becomes X's. It's also how hardware that only measures
          along z can measure along x: apply H first.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=0&gates=H">H on {k`0`}</TryIt>
          <TryIt hash="#/?start=0&gates=H,H">H twice: back to {k`0`}</TryIt>
          <TryIt hash="#/?start=+&gates=H">H on {k`+`}</TryIt>
          <TryIt hash="#/?start=+&gates=Ry(90)">
            {m`R_y(90^\circ)`} on {k`+`}, to compare
          </TryIt>
        </TryRow>
        <Related
          links={[
            ["learn/gates/pauli-z/", "Pauli-Z"],
            ["learn/key-states/", "The six key states"],
            ["learn/gates/", "All gates"],
          ]}
        />
      </Section>
    </GatePage>
  );
}

const S_FROM_PLUS = Gate.S.apply(Qubit.PLUS).blochVector();
const T_FROM_PLUS = Gate.T.apply(Qubit.PLUS).blochVector();

export function SAndT() {
  const sFactor = phaseFactorTex(Gate.S, Gate.rz(90 * DEG))!;
  const tFactor = phaseFactorTex(Gate.T, Gate.rz(45 * DEG))!;
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>From {k`+`} (dashed), S turns the arrow 90° to {k`+i`} (green), and T turns it 45° (violet).</>}>
            <SphereFigure
              id="s-and-t"
              description="A Bloch sphere seen with z up: from |+⟩, a green arrow turned 90 degrees around the equator to |+i⟩ by S, and a violet arrow turned 45 degrees by T."
              axes={[{ axis: [0, 0, 1] }]}
              arcs={[
                { from: [1, 0, 0], axis: [0, 0, 1], angle: Math.PI / 2, color: 1 },
                { from: [1, 0, 0], axis: [0, 0, 1], angle: Math.PI / 4, color: 2 },
              ]}
              arrows={[{ to: [1, 0, 0], ghost: true }, { to: S_FROM_PLUS, color: 1, label: "S" }, { to: T_FROM_PLUS, color: 2, label: "T" }]}
            />
          </Figure>
        }
      >
        <p className="lead">
          S and T turn the sphere about the z axis: S by a quarter turn (90°), T by an eighth of a turn (45°). Like Z, they leave {k`0`} and{" "}
          {k`1`} in place and change only the phase, so they never change the odds of measuring 0 or 1.
        </p>
        <p>
          They're called <strong>phase gates</strong>: each multiplies the amplitude of {k`1`} by a phase and leaves {k`0`} alone. S† and T†
          turn the other way.
        </p>
      </Beside>

      <Section id="matrices" title="The matrices">
        <Tex tex={`S = ${matrixTex(Gate.S)}, \\qquad T = ${matrixTex(Gate.T)}`} display />
        {md`S\,(\alpha|0\rangle + \beta|1\rangle) = \alpha|0\rangle + i\beta\,|1\rangle, \qquad T\,(\alpha|0\rangle + \beta|1\rangle) = \alpha|0\rangle + e^{i\pi/4}\beta\,|1\rangle`}
        <p>
          Multiplying {m`\beta`} by {m`i = e^{i\pi/2}`} adds 90° to the phase φ; multiplying by {m`e^{i\pi/4}`} adds 45°.
        </p>
      </Section>

      <Section id="rotations" title="As rotations">
        <Tex tex={`S = ${sFactor}\\,R_z(90^\\circ), \\qquad T = ${tFactor}\\,R_z(45^\\circ)`} display />
        <p>
          The factors in front are global phases, so S and T turn the sphere exactly like {m`R_z(90^\circ)`} and {m`R_z(45^\circ)`}. The factor{" "}
          {m`e^{i\pi/8}`} is why T is also called the <strong>π/8 gate</strong>, though it turns the sphere by π/4.
        </p>
      </Section>

      <Section id="roots" title="Square roots of Z">
        <p>
          Two quarter turns make a half turn, and two eighth turns make a quarter turn:
        </p>
        {md`S\,S = Z, \qquad T\,T = S, \qquad T^4 = Z, \qquad T^8 = I`}
        <p>
          So S is a square root of Z and T a square root of S. Their inverses, S† and T†, turn back by 90° and 45°: {m`S^\dagger S = I`}.
        </p>
      </Section>

      <Section id="key-states" title="What they do to the six key states">
        <h3>S</h3>
        <KeyStateTable symbol="S" gate={Gate.S} />
        <h3>T</h3>
        <KeyStateTable symbol="T" gate={Gate.T} />
        <p>
          T moves the equator states off the six named points: {k`+`} goes to the state with φ = 45°, halfway between {k`+`} and {k`+i`}.
        </p>
      </Section>

      <Note title="Why T matters">
        <p>
          Using only H and T (and their combinations), you can get as close as you like to any one-qubit gate. That makes T a key ingredient of
          error-corrected quantum computers, which can only perform a small, fixed set of gates reliably.
        </p>
      </Note>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=+&gates=S">S on {k`+`}</TryIt>
          <TryIt hash="#/?start=+&gates=T,T,T,T">T four times: a half turn, like Z</TryIt>
          <TryIt hash="#/?start=+&gates=Sdg">S† on {k`+`}: the other way</TryIt>
        </TryRow>
        <Related
          links={[
            ["learn/gates/pauli-z/", "Pauli-Z"],
            ["learn/gates/rotation-gates/", "Rotation gates"],
            ["learn/gates/", "All gates"],
          ]}
        />
      </Section>
    </>
  );
}

const X60_END = Gate.rx(60 * DEG).apply(Qubit.ZERO).blochVector();

/** The named gates as rotations about x, y or z, with the global phase between them. */
const AS_ROTATIONS: [string, Gate, Gate, string][] = [
  ["X", Gate.X, Gate.rx(Math.PI), "R_x(180^\\circ)"],
  ["Y", Gate.Y, Gate.ry(Math.PI), "R_y(180^\\circ)"],
  ["Z", Gate.Z, Gate.rz(Math.PI), "R_z(180^\\circ)"],
  ["S", Gate.S, Gate.rz(90 * DEG), "R_z(90^\\circ)"],
  ["T", Gate.T, Gate.rz(45 * DEG), "R_z(45^\\circ)"],
  ["S^\\dagger", Gate.S_DAG, Gate.rz(-90 * DEG), "R_z(-90^\\circ)"],
  ["T^\\dagger", Gate.T_DAG, Gate.rz(-45 * DEG), "R_z(-45^\\circ)"],
];

export function RotationGates() {
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>{m`R_x(60^\circ)`} tilts {k`0`} by 60° about the x axis, toward {k`-i`}. Now P(0) is 75%.</>}>
            <SphereFigure
              id="rx60"
              description="A Bloch sphere: the x-rotation by 60 degrees turns the arrow from the top 60 degrees toward |−i⟩."
              axes={[{ axis: [1, 0, 0] }]}
              arcs={[{ from: [0, 0, 1], axis: [1, 0, 0], angle: 60 * DEG }]}
              arrows={[{ to: [0, 0, 1], ghost: true }, { to: X60_END }]}
            />
          </Figure>
        }
      >
        <p className="lead">
          The rotation gates {m`R_x(\theta)`}, {m`R_y(\theta)`} and {m`R_z(\theta)`} turn the sphere by any angle θ about the x, y or z axis.
          The Pauli gates, S and T are special cases, and together these rotations can make any one-qubit gate.
        </p>
        <p>
          In the app, <strong>R(θ) ▾</strong> on the gate bar picks the axis and the angle. A ghost arrow previews the result while you drag the
          slider; Apply plays it.
        </p>
      </Beside>

      <Section id="matrices" title="The matrices">
        {md`R_x(\theta) = \begin{bmatrix} \cos\frac{\theta}{2} & -i\sin\frac{\theta}{2} \\ -i\sin\frac{\theta}{2} & \cos\frac{\theta}{2} \end{bmatrix}, \quad R_y(\theta) = \begin{bmatrix} \cos\frac{\theta}{2} & -\sin\frac{\theta}{2} \\ \sin\frac{\theta}{2} & \cos\frac{\theta}{2} \end{bmatrix}, \quad R_z(\theta) = \begin{bmatrix} e^{-i\theta/2} & 0 \\ 0 & e^{i\theta/2} \end{bmatrix}`}
        <p>
          All three are the general rotation {m`R_{\hat n}(\theta) = \cos\tfrac{\theta}{2}\, I - i\sin\tfrac{\theta}{2}\,(\hat n \cdot \vec\sigma)`}{" "}
          with the axis {m`\hat n`} along x, y or z, where {m`\vec\sigma = (X, Y, Z)`}.
        </p>
      </Section>

      <Section id="half-angles" title="Half angles, again">
        <p>
          The matrices use {m`\theta/2`} for the same reason the <A to="learn/bloch-sphere/">Bloch sphere</A> does: a turn of θ on the sphere is
          a turn of θ/2 between state vectors. One surprise follows. A full turn, {m`R_x(360^\circ)`}, brings every arrow back where it started,
          but its matrix is {m`-I`}, not {m`I`}: the state comes back with a global phase of {m`-1`}. Only two full turns give {m`I`}.
        </p>
      </Section>

      <Section id="named" title="The named gates as rotations">
        <p>Each named gate is a rotation times a global phase, which doesn't change how it turns the sphere:</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Gate</th>
                <th>As a rotation</th>
              </tr>
            </thead>
            <tbody>
              {AS_ROTATIONS.map(([name, gate, rotation, tex]) => {
                const factor = phaseFactorTex(gate, rotation);
                if (factor === null) {
                  throw new Error(`${name} isn't ${tex}`);
                }
                return (
                  <tr key={name}>
                    <td>
                      <Tex tex={name} />
                    </td>
                    <td>
                      <Tex tex={`${name} = ${factor === "" ? "" : `${factor}\\,`}${tex}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="any-gate" title="Any gate from rotations">
        <p>
          Every one-qubit gate can be written as three rotations, about z, then y, then z, times a global phase. These are its{" "}
          <strong>Z-Y-Z Euler angles</strong>:
        </p>
        {md`U = e^{i\alpha}\,R_z(\beta)\,R_y(\gamma)\,R_z(\delta)`}
        <p>
          Or as one rotation, by some angle about some axis: that's what the app's Gate panel reports for every gate, and what the{" "}
          <A to="learn/gate-lab/">Gate Lab</A> finds for any sequence.
        </p>
      </Section>

      <Section id="try" title="Try it">
        <TryRow>
          <TryIt hash="#/?start=0&gates=Rx(60)">{m`R_x(60^\circ)`} on {k`0`}</TryIt>
          <TryIt hash="#/?start=0&gates=Rx(90)">
            {m`R_x(90^\circ)`} on {k`0`}: to {k`-i`}
          </TryIt>
          <TryIt hash="#/?start=+&gates=Rz(45)">{m`R_z(45^\circ)`} on {k`+`}: like T</TryIt>
        </TryRow>
        <Related
          links={[
            ["learn/gates/", "Gates are rotations"],
            ["learn/gates/s-and-t/", "S and T"],
            ["learn/gate-lab/", "The Gate Lab"],
          ]}
        />
      </Section>
    </>
  );
}
