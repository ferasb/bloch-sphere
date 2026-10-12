/** Radians as degrees with at most one decimal: "90°", "22.5°". */
export function degreesText(radians: number): string {
  const degrees = +((radians * 180) / Math.PI).toFixed(1);
  // -0 and 360 after rounding both mean 0.
  return `${degrees === 360 || Object.is(degrees, -0) ? 0 : degrees}°`;
}

/** A number for a readout: 3 decimals, and no "-0.000". */
export function coordinateText(x: number): string {
  const text = x.toFixed(3);
  return text === "-0.000" ? "0.000" : text;
}

/** A probability as a percentage: "50%", "14.6%". */
export function percentText(p: number): string {
  return `${+(p * 100).toFixed(1)}%`;
}
