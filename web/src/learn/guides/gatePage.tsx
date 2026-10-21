import type { ReactNode } from "react";
import { keyStateMoves, labelTex, matrixTex, phaseFactorTex } from "../../format/gateFacts";
import { rotationText } from "../../format/rotation";
import type { Gate } from "../../math/gate";
import type { Qubit } from "../../math/qubit";
import { normalize, type Vec3 } from "../../math/vec3";
import { A, Beside, Figure, Section, Tex } from "../components";
import { SphereFigure } from "../figure";

/** What a gate page shows: the parts written by hand, and the gate whose numbers it computes. */
export interface GatePageProps {
  /** The symbol, as on the app's buttons: "H". */
  symbol: string;
  gate: Gate;
  /** The same rotation as an R gate, with its LaTeX name, for "H = i·R(…)"; `where` defines its axis. */
  rotation: { gate: Gate; tex: string; where?: string };
  /** The state the figure starts from, and its caption. */
  example: { from: Qubit; caption: ReactNode };
  /** Opening paragraphs. */
  lead: ReactNode;
  /** What the matrix does, in words, after the matrix itself. */
  matrixNote: ReactNode;
  /** Sections particular to this gate, after the table of key states. */
  children?: ReactNode;
}

/** The figure: the example state turned by the gate, its path, and the gate's axis. */
export function GateFigure({ id, symbol, gate, from }: { id: string; symbol: string; gate: Gate; from: Qubit }) {
  const { axis, angle } = gate.axisAngle();
  const start = from.blochVector();
  const end = gate.apply(from).blochVector();
  return (
    <SphereFigure
      id={id}
      description={`A Bloch sphere: ${symbol} turns the arrow ${rotationText(gate)}, from where it starts (dashed) along the arc to where it ends.`}
      // Name the axis only off the x, y and z axes, whose ends already carry state labels.
      axes={[{ axis: normalize(axis as Vec3), label: axis.filter((c) => Math.abs(c) > 1e-9).length > 1 ? `${symbol} axis` : undefined }]}
      arcs={[{ from: start, axis, angle }]}
      arrows={[{ to: start, ghost: true }, { to: end }]}
    />
  );
}

/** The six axis states before and after a gate, computed from the gate itself. */
export function KeyStateTable({ symbol, gate }: { symbol: string; gate: Gate }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Before</th>
            <th>After {symbol}</th>
            <th>On the sphere</th>
          </tr>
        </thead>
        <tbody>
          {keyStateMoves(gate).map((move) => (
            <tr key={move.from}>
              <td>
                <Tex tex={labelTex(move.from)} />
              </td>
              <td>
                <Tex tex={move.tex} />
              </td>
              <td className="motion">{move.motion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The matrix, the rotation, and the six key states for one gate, around its hand-written parts. */
export function GatePage({ symbol, gate, rotation, example, lead, matrixNote, children }: GatePageProps) {
  const factor = phaseFactorTex(gate, rotation.gate);
  if (factor === null) {
    throw new Error(`${symbol} isn't the rotation ${rotation.tex}`);
  }
  const id = symbol.toLowerCase().replace(/[^a-z]/g, "");
  return (
    <>
      <Beside
        figure={
          <Figure caption={example.caption}>
            <GateFigure id={`${id}-figure`} symbol={symbol} gate={gate} from={example.from} />
          </Figure>
        }
      >
        {lead}
        <p>
          On the Bloch sphere, {symbol} turns the whole sphere <strong>{rotationText(gate)}</strong>.
        </p>
      </Beside>

      <Section id="matrix" title="The matrix">
        <Tex tex={`${symbol} = ${matrixTex(gate)}`} display />
        {matrixNote}
      </Section>

      <Section id="rotation" title="As a rotation">
        <Tex tex={`${symbol} = ${factor === "" ? "" : `${factor}\\,`}${rotation.tex}${rotation.where ? `, \\quad ${rotation.where}` : ""}`} display />
        <p>
          {factor === "" ? (
            <>
              {symbol} is exactly the rotation <Tex tex={rotation.tex} />.
            </>
          ) : (
            <>
              The factor <Tex tex={factor} /> in front is a global phase: it changes the matrix but not what any measurement sees, so {symbol}{" "}
              and <Tex tex={rotation.tex} /> turn the sphere the same way. See <A to="learn/gates/rotation-gates/">rotation gates</A>.
            </>
          )}
        </p>
      </Section>

      <Section id="key-states" title="What it does to the six key states">
        <KeyStateTable symbol={symbol} gate={gate} />
        <p>
          A factor in front of a result, such as a minus sign or <Tex tex="i" />, is a global phase: the arrow lands on the named state all the
          same.
        </p>
      </Section>

      {children}
    </>
  );
}
