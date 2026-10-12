import { useEffect, useState, type FormEvent } from "react";
import type { Vec3 } from "../../math/vec3";

type AxisChoice = "x" | "y" | "z" | "x+z" | "custom";

const PRESETS: Record<Exclude<AxisChoice, "custom">, Vec3> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
  "x+z": [Math.SQRT1_2, 0, Math.SQRT1_2],
};

const rad = (deg: number) => (deg * Math.PI) / 180;

interface RotationFormProps {
  /** Offer the x+z diagonal and any direction, not just x, y, z. */
  anyAxis: boolean;
  submitLabel: string;
  /** Called on every change, for a live preview on the sphere. */
  onPreview(axis: Vec3, angle: number): void;
  onSubmit(axis: Vec3, angle: number): void;
}

/** Pick a rotation: an axis (x, y, z, or any direction) and an angle. */
export function RotationForm({ anyAxis, submitLabel, onPreview, onSubmit }: RotationFormProps) {
  const [choice, setChoice] = useState<AxisChoice>("x");
  const [angle, setAngle] = useState(90);
  // A custom axis as a direction on the sphere: tilt from z (θ) and turn around z (φ).
  const [tilt, setTilt] = useState(45);
  const [turn, setTurn] = useState(0);

  const axis: Vec3 =
    choice === "custom" ? [Math.sin(rad(tilt)) * Math.cos(rad(turn)), Math.sin(rad(tilt)) * Math.sin(rad(turn)), Math.cos(rad(tilt))] : PRESETS[choice];

  useEffect(() => {
    onPreview(axis, rad(angle));
    // Depends on the inputs, not on `axis` (a new array every render) or the callback.
  }, [choice, angle, tilt, turn]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(axis, rad(angle));
  }

  const choices: AxisChoice[] = anyAxis ? ["x", "y", "z", "x+z", "custom"] : ["x", "y", "z"];
  return (
    <form className="rotation-form" onSubmit={submit}>
      <div className="tabs" role="radiogroup" aria-label="Axis">
        {choices.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={choice === c} className="tab" onClick={() => setChoice(c)}>
            {c === "custom" ? "any" : c}
          </button>
        ))}
      </div>
      {choice === "custom" && (
        <>
          <label className="slider">
            <span title="Tilt of the axis from z">θ</span>
            <input type="range" min={0} max={180} value={tilt} onChange={(e) => setTilt(+e.target.value)} />
            <output>{tilt}°</output>
          </label>
          <label className="slider">
            <span title="Turn of the axis around z">φ</span>
            <input type="range" min={0} max={359} value={turn} onChange={(e) => setTurn(+e.target.value)} />
            <output>{turn}°</output>
          </label>
        </>
      )}
      <label className="slider">
        <span title="How far to turn">∠</span>
        <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(+e.target.value)} />
        <output>{angle}°</output>
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
