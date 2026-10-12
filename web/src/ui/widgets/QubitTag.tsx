/** A qubit's color dot and name. The dot carries identity; the name stays in text color. */
export function QubitTag({ name, colorSlot }: { name: string; colorSlot: number }) {
  return (
    <span className="qubit-tag">
      <span className="qubit-dot" style={{ background: `var(--qubit-${colorSlot})` }} aria-hidden />
      {name}
    </span>
  );
}
