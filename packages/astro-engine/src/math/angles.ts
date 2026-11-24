// Arithmétique d'angles en degrés.
export const DEG = Math.PI / 180;

export const norm360 = (degrees: number): number => ((degrees % 360) + 360) % 360;

/** Écart signé de `from` vers `to`, dans ]-180, 180]. */
export const signedDelta = (from: number, to: number): number => {
  const delta = norm360(to - from);
  return delta > 180 ? delta - 360 : delta;
};

export const sinD = (degrees: number): number => Math.sin(degrees * DEG);
export const cosD = (degrees: number): number => Math.cos(degrees * DEG);
export const tanD = (degrees: number): number => Math.tan(degrees * DEG);
export const atan2D = (y: number, x: number): number => Math.atan2(y, x) / DEG;
export const asinD = (value: number): number => Math.asin(value) / DEG;
