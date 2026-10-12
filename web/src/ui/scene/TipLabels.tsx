import { useMemo } from "react";
import { toVector3 } from "./geometry";
import { OverlayLabel } from "./overlay";
import { useSceneSource } from "./source";

/**
 * With two or more qubits, each arrow tip carries its name, so identity never rests on color
 * alone. Rendered over the canvas.
 */
export function TipLabels() {
  const source = useSceneSource();
  // "id|name|slot" per qubit: a string, so this re-renders only when the qubits change.
  const wires = source
    .use((s) =>
      s.timeline
        .at(s.playhead)
        .arrows.map((a) => `${a.wire.id}|${a.wire.name}|${a.wire.colorSlot}`)
        .join(" "),
    )
    .split(" ");
  const selected = source.use((s) => s.selected);
  if (wires.length < 2) {
    return null;
  }
  return wires.map((w) => {
    const [id, name, colorSlot] = w.split("|");
    return <TipLabel key={id} id={id} name={name} colorSlot={colorSlot} selected={id === selected} />;
  });
}

function TipLabel({ id, name, colorSlot, selected }: { id: string; name: string; colorSlot: string; selected: boolean }) {
  const source = useSceneSource();
  const position = useMemo(
    () => () => {
      const s = source.get();
      const a = s.timeline.at(s.playhead).arrows.find((arrow) => arrow.wire.id === id);
      // Just inside the tip, so it never sits on the state labels outside the sphere.
      return a && a.presence >= 0.5 ? toVector3(a.vector).multiplyScalar(0.88) : null;
    },
    [source, id],
  );
  return (
    // Inside the sphere, the hidden-by-sphere test would always say "hidden", so don't dim.
    <OverlayLabel id={`tip ${id}`} position={position} dimBehindSphere={false} className={selected ? "tip-label selected" : "tip-label"}>
      <span className="qubit-dot" style={{ background: `var(--qubit-${colorSlot})` }} aria-hidden />
      {name}
    </OverlayLabel>
  );
}
