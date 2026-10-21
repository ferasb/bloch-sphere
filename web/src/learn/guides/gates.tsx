import { gateLearnPath, gateName } from "../../format/gateNames";
import { labelTex } from "../../format/gateFacts";
import { stateName } from "../../format/ket";
import { rotationText } from "../../format/rotation";
import { Gate } from "../../math/gate";
import { Qubit } from "../../math/qubit";
import { A, Beside, Figure, k, m, md, Note, Section, Tex, TryIt, TryRow } from "../components";
import { GateFigure } from "./gatePage";

const BUILT_INS: Gate[] = [Gate.X, Gate.Y, Gate.Z, Gate.H, Gate.S, Gate.T, Gate.S_DAG, Gate.T_DAG];

/** Where a sequence of gates (first one first) takes |0⟩, as the sphere labels it. */
function fromZero(...gates: Gate[]): string {
  return labelTex(stateName(gates.reduce((q, g) => g.apply(q), Qubit.ZERO))!);
}

export function Gates() {
  return (
    <>
      <Beside
        figure={
          <Figure caption={<>S turns the sphere 90° about z. Seen from above, the turn is counterclockwise, so {k`+`} goes to {k`+i`}.</>}>
            <GateFigure id="s-turn" symbol="S" gate={Gate.S} from={Qubit.PLUS} />
          </Figure>
        }
      >
        <p className="lead">
          A quantum gate changes a qubit's state. For a single qubit, every gate does the same kind of thing to the Bloch sphere: it turns the
          whole sphere about an axis, by an angle. Learn a gate's axis and angle, and you know what it does to every state.
        </p>
        <p>
          The turn is rigid, like turning a globe: every point moves together, the arrow with it, and points on the axis stay where they are.
        </p>
      </Beside>

      <Section id="matrices" title="Gates are matrices">
        <p>
          In the math, a gate is a 2×2 matrix {m`U`} of complex numbers, and applying it multiplies the state's column vector:
        </p>
        {md`U\begin{bmatrix} \alpha \\ \beta \end{bmatrix} = \begin{bmatrix} u_{00} & u_{01} \\ u_{10} & u_{11} \end{bmatrix} \begin{bmatrix} \alpha \\ \beta \end{bmatrix} = \begin{bmatrix} u_{00}\,\alpha + u_{01}\,\beta \\ u_{10}\,\alpha + u_{11}\,\beta \end{bmatrix}`}
        <p>
          A handy way to read a matrix: <strong>column j is where {m`|j\rangle`} goes</strong>. The first column is {m`U|0\rangle`}, the second{" "}
          {m`U|1\rangle`}.
        </p>
        <p>
          Gate matrices are <strong>unitary</strong>: they keep the total probability at 1, so the arrow stays on the sphere. That's exactly why
          each one is a rotation.
        </p>
      </Section>

      <Section id="rotations" title="Every gate is a rotation">
        <p>The gates on the app's gate bar, and the turn each one makes:</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Gate</th>
                <th>Name</th>
                <th>Turns the sphere</th>
              </tr>
            </thead>
            <tbody>
              {BUILT_INS.map((gate) => (
                <tr key={gate.name}>
                  <td>
                    <Tex tex={gate.name!.replace("†", "^\\dagger")} />
                  </td>
                  <td>
                    <A to={gateLearnPath(gate.name!)!}>{gateName(gate.name!)}</A>
                  </td>
                  <td className="motion">{rotationText(gate)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <Tex tex="R_x(\theta),\ R_y(\theta),\ R_z(\theta)" />
                </td>
                <td>
                  <A to="learn/gates/rotation-gates/">Rotation gates</A>
                </td>
                <td className="motion">θ about x, y or z</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Angles follow the <strong>right-hand rule</strong>: point your right thumb along the axis, and your fingers curl the way the sphere
          turns. Put another way, looking down at the sphere from the axis's tip, the turn is counterclockwise.
        </p>
      </Section>

      <Section id="global-phase" title="Different matrices, same rotation">
        <p>
          Two matrices that differ only by a factor in front, such as {m`-1`} or {m`i`}, make the same rotation: the factor is a global phase,
          which no measurement can detect. For example, Pauli-Z and the 180° rotation about z differ by a factor of {m`i`}:
        </p>
        {md`Z = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix} = i \begin{bmatrix} e^{-i\pi/2} & 0 \\ 0 & e^{i\pi/2} \end{bmatrix} = i\,R_z(180^\circ)`}
        <p>
          In general, a rotation by θ about the unit axis {m`\hat n = (n_x, n_y, n_z)`} is the matrix below, and every one-qubit gate is one of
          these times a phase {m`e^{i\gamma}`}:
        </p>
        {md`R_{\hat n}(\theta) = \cos\tfrac{\theta}{2}\, I - i\sin\tfrac{\theta}{2}\,(n_x X + n_y Y + n_z Z)`}
      </Section>

      <Section id="order" title="Order matters">
        <p>
          Two gates in a row are two turns in a row, and turns about different axes don't commute: doing them in the other order usually lands
          somewhere else. Starting from {k`0`}:
        </p>
        <ul>
          <li>
            H, then S: {k`0`} goes to <Tex tex={fromZero(Gate.H, Gate.S)} />.
          </li>
          <li>
            S, then H: {k`0`} goes to <Tex tex={fromZero(Gate.S, Gate.H)} />.
          </li>
        </ul>
        <p>
          Written as matrices, "H, then S" is the product {m`S\,H`}: the gate applied first stands nearest the state, on the right.
        </p>
        <TryRow>
          <TryIt hash="#/?start=0&gates=H,S">H, then S</TryIt>
          <TryIt hash="#/?start=0&gates=S,H">S, then H</TryIt>
        </TryRow>
      </Section>

      <Section id="undo" title="Undoing and combining">
        <p>
          Every gate can be undone by turning back the same angle about the same axis. That reverse gate is written {m`U^\dagger`} ("U dagger"):
          S† undoes S, and X, Y, Z and H, being half turns, undo themselves.
        </p>
        <p>
          Any sequence of turns adds up to a single turn, so any sequence of gates is one gate. For example, H, then Z, then H is the same as X:
        </p>
        {md`H\,Z\,H = X`}
        <p>
          The <A to="learn/gate-lab/">Gate Lab</A> shows this for any sequence you build.
        </p>
      </Section>

      <Note title="Why rotations?">
        <p>
          The 2×2 unitary matrices with determinant 1 behave, when they act on the sphere, exactly like the rotations of 3D space; this is the
          link between the group SU(2) and the rotation group SO(3). Each rotation comes from two matrices, {m`U`} and {m`-U`}, which is the global
          phase showing up again.
        </p>
      </Note>

      <Section id="gates" title="The gates, one by one">
        <ul>
          <li>
            <A to="learn/gates/pauli-x/">Pauli-X</A>: the quantum NOT, a half turn about x.
          </li>
          <li>
            <A to="learn/gates/pauli-y/">Pauli-Y</A>: a half turn about y.
          </li>
          <li>
            <A to="learn/gates/pauli-z/">Pauli-Z</A>: the phase flip, a half turn about z.
          </li>
          <li>
            <A to="learn/gates/hadamard/">Hadamard</A>: a half turn about the diagonal between x and z.
          </li>
          <li>
            <A to="learn/gates/s-and-t/">S and T</A>: quarter and eighth turns about z.
          </li>
          <li>
            <A to="learn/gates/rotation-gates/">Rotation gates</A>: any angle about x, y or z.
          </li>
        </ul>
      </Section>
    </>
  );
}
