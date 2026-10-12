import { complexTexSigned } from "../../format/exact";
import type { Gate } from "../../math/gate";
import { Tex } from "./Tex";

const BASIS = ["0", "1"] as const;

/**
 * A gate's 2×2 matrix, labeled so it reads as "column j is where |j⟩ goes": columns are the
 * input basis state, rows the output. Each entry shows its exact value.
 *
 * Grid: [row label] [left bracket] [column 0] [column 1] [right bracket]; header row, then 2 rows.
 */
export function GateMatrix({ gate }: { gate: Gate }) {
  return (
    <div className="matrix" role="table" aria-label={`Matrix of ${gate.name ?? "the gate"}`}>
      <div role="row" className="matrix-contents">
        {BASIS.map((j, col) => (
          <span key={j} role="columnheader" className="matrix-header" style={{ gridRow: 1, gridColumn: col + 3 }}>
            from <Tex tex={`|${j}\\rangle`} />
          </span>
        ))}
      </div>
      <span className="matrix-bracket matrix-bracket-left" aria-hidden />
      <span className="matrix-bracket matrix-bracket-right" aria-hidden />
      {gate.matrix.map((row, i) => (
        <div key={i} role="row" className="matrix-contents">
          <span role="rowheader" className="matrix-row-label" style={{ gridRow: i + 2, gridColumn: 1 }}>
            to <Tex tex={`|${BASIS[i]}\\rangle`} />
          </span>
          {row.map((entry, j) => (
            <span key={j} role="cell" className="matrix-cell" style={{ gridRow: i + 2, gridColumn: j + 3 }}>
              <Tex tex={complexTexSigned(entry)} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
