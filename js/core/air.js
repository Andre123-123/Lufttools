// Stoffwerte trockener Luft.

export const R_LUFT = 287.058; // spezifische Gaskonstante, J/(kg·K)
export const NORMALZUSTAND = { t: 20, p: 101325 }; // °C, Pa

/** Dichte in kg/m³ (ideales Gas). tC in °C, p in Pa. */
export function dichte(tC, p) {
  return p / (R_LUFT * (tC + 273.15));
}

/** Dynamische Viskosität in Pa·s (Sutherland). */
export function dynViskositaet(tC) {
  const T = tC + 273.15;
  return (1.458e-6 * T ** 1.5) / (T + 110.4);
}

/** Kinematische Viskosität in m²/s. */
export function kinViskositaet(tC, p) {
  return dynViskositaet(tC) / dichte(tC, p);
}

/** Luftzustand für Strömungsrechnungen. */
export function luftzustand(tC = NORMALZUSTAND.t, p = NORMALZUSTAND.p) {
  return { t: tC, p, rho: dichte(tC, p), nu: kinViskositaet(tC, p) };
}
