import type { ReactNode } from "react";
import { percentText } from "../../format/angles";

/**
 * A probability as a bar. The label is what's seen (math, a glossary term); name is what a screen
 * reader says for the bar ("Probability of measuring 0"), with the value as a percentage.
 */
export function ProbabilityBar({ label, name, p, colorSlot }: { label: ReactNode; name: string; p: number; colorSlot: number }) {
  return (
    <div className="probability">
      <span className="probability-label">{label}</span>
      <div
        className="probability-track"
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={p}
        aria-valuetext={percentText(p)}
      >
        <div className="probability-fill" style={{ width: `${p * 100}%`, background: `var(--qubit-${colorSlot})` }} />
      </div>
      <span className="probability-value">{percentText(p)}</span>
    </div>
  );
}
