import { Color, SRGBColorSpace } from "three";

let ctx: CanvasRenderingContext2D | null = null;

/**
 * Read a color token from the stylesheet as a three.js Color, so styles.css stays the single
 * source of truth. The token can use any CSS color syntax (e.g. oklch); painting it on a 1x1
 * canvas lets the browser do the conversion to sRGB.
 */
function cssColor(name: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) {
    throw new Error(`Color token ${name} is not defined in styles.css`);
  }
  ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.canvas.width = ctx.canvas.height = 1;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

export interface ScenePalette {
  background: Color;
  sphere: Color;
  sphereLine: Color;
  axis: Color;
  rotationAxis: Color;
  /** Indexed by color slot: qubits[1] is --qubit-1. */
  qubits: Color[];
}

let scene: ScenePalette | null = null;

/** The 3D scene's colors, read from styles.css once. */
export function scenePalette(): ScenePalette {
  scene ??= {
    background: cssColor("--scene-bg"),
    sphere: cssColor("--sphere"),
    sphereLine: cssColor("--sphere-line"),
    axis: cssColor("--axis"),
    rotationAxis: cssColor("--rotation-axis"),
    qubits: [0, 1, 2, 3, 4, 5].map((slot) => (slot === 0 ? new Color() : cssColor(`--qubit-${slot}`))),
  };
  return scene;
}
