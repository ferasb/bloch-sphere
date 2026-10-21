import { coordinateText, degreesText } from "../../format/angles";
import { canonical, columnTex, ketTex } from "../../format/ket";
import { useApp } from "../store";
import { frameOf } from "../view";
import { AmplitudeCircle } from "../widgets/AmplitudeCircle";
import { ProbabilityBar } from "../widgets/ProbabilityBar";
import { QubitTag } from "../widgets/QubitTag";
import { Term } from "../widgets/Term";
import { Tex } from "../widgets/Tex";

/** The selected qubit at the playhead, in several representations. Moves with the animation. */
export function StatePanel() {
  // The cached frame hands back the same object until something moves, so this re-renders only then.
  const frame = useApp((s) => {
    const qubits = frameOf(s).qubits;
    return qubits.find((q) => q.entry.id === s.selected) ?? qubits[0];
  });
  const { state, entry } = frame;
  const { a, b } = canonical(state);
  const [p0, p1] = state.probabilities();
  const [theta, phi] = state.blochAngles();
  const [x, y, z] = state.blochVector();
  const onPole = degreesText(theta) === "0°" || degreesText(theta) === "180°";
  const fill = `var(--qubit-${entry.colorSlot})`;

  return (
    <section className="panel-section" aria-labelledby="state-heading">
      <h2 id="state-heading">
        <Term id="state">State</Term> <QubitTag name={entry.name} colorSlot={entry.colorSlot} />
      </h2>

      <div className="ket">
        <Tex tex={`|\\psi\\rangle = ${ketTex(state)}`} display />
      </div>

      <div className="state-views">
        <figure className="state-view">
          <Tex tex={columnTex(state)} />
          <figcaption>
            <Term id="vector">vector</Term>
          </figcaption>
        </figure>
        <figure className="state-view">
          <div className="circle-pair">
            <span>
              <AmplitudeCircle amplitude={a} size={52} fill={fill} label="Amplitude of |0⟩" />
              <Tex tex="|0\rangle" />
            </span>
            <span>
              <AmplitudeCircle amplitude={b} size={52} fill={fill} label="Amplitude of |1⟩" />
              <Tex tex="|1\rangle" />
            </span>
          </div>
        </figure>
      </div>
      <p className="circle-legend">
        <Term id="circles" align="end">
          circle area = probability · line = phase
        </Term>
      </p>

      <div className="probabilities">
        <ProbabilityBar
          label={
            <Term id="probability">
              <Tex tex="P(0)" />
            </Term>
          }
          p={p0}
          colorSlot={entry.colorSlot}
        />
        <ProbabilityBar
          label={
            <Term id="probability">
              <Tex tex="P(1)" />
            </Term>
          }
          p={p1}
          colorSlot={entry.colorSlot}
        />
      </div>

      <dl className="readout">
        <div>
          <dt>
            <Term id="theta">
              <Tex tex="\theta" />
            </Term>
          </dt>
          <dd>{degreesText(theta)}</dd>
        </div>
        <div>
          <dt>
            <Term id="phi">
              <Tex tex="\varphi" />
            </Term>
          </dt>
          <dd title={onPole ? "φ is undefined at the poles" : undefined}>{onPole ? "—" : degreesText(phi)}</dd>
        </div>
        <div>
          <dt>
            <Term id="coordinates">(x, y, z)</Term>
          </dt>
          <dd>
            ({coordinateText(x)}, {coordinateText(y)}, {coordinateText(z)})
          </dd>
        </div>
      </dl>
    </section>
  );
}
