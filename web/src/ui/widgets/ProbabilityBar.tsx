import type { ReactNode } from "react";
import { percentText } from "../../format/angles";

export function ProbabilityBar({ label, p, colorSlot }: { label: ReactNode; p: number; colorSlot: number }) {
  return (
    <div className="probability">
      <span className="probability-label">{label}</span>
      <div className="probability-track" role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={p}>
        <div className="probability-fill" style={{ width: `${p * 100}%`, background: `var(--qubit-${colorSlot})` }} />
      </div>
      <span className="probability-value">{percentText(p)}</span>
    </div>
  );
}
