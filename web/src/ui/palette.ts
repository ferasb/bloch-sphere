import { Color, SRGBColorSpace } from "three";
import type { Theme } from "../persist/theme";
import { useTheme } from "./theme";

let ctx: CanvasRenderingContext2D | null = null;
let probe: HTMLElement | null = null;

/**
 * Read a color token from the stylesheets as a three.js Color, so theme.css and styles.css stay the
 * single source of truth. Tokens are light-dark() pairs of oklch colors: a hidden element resolves
 * the token for the current color scheme, and painting the result on a 1x1 canvas converts it to sRGB.
 */
function cssColor(name: string): Color {
  if (!getComputedStyle(document.documentElement).getPropertyValue(name).trim()) {
    throw new Error(`Color token ${name} is not defined in theme.css or styles.css`);
  }
  probe ??= document.body.appendChild(document.createElement("span"));
  probe.hidden = true;
  probe.style.color = `var(${name})`;
  ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.canvas.width = ctx.canvas.height = 1;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = getComputedStyle(probe).color;
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

const palettes: Partial<Record<Theme, ScenePalette>> = {};

/**
 * The 3D scene's colors in the current theme, read once per theme. The scene rebuilds when the
 * theme changes (Scene.tsx), so components just call this while rendering.
 */
export function scenePalette(): ScenePalette {
  return (palettes[useTheme.getState().theme] ??= {
    background: cssColor("--scene-bg"),
    sphere: cssColor("--sphere"),
    sphereLine: cssColor("--sphere-line"),
    axis: cssColor("--axis"),
    rotationAxis: cssColor("--rotation-axis"),
    qubits: [0, 1, 2, 3, 4, 5].map((slot) => (slot === 0 ? new Color() : cssColor(`--qubit-${slot}`))),
  });
}
