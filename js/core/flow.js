// Querschnitte, Volumenstrom, Geschwindigkeit. Alle Größen in SI (m, m², m³/s, m/s).

/**
 * Querschnittswerte.
 * @param {{form:'rund',d:number}|{form:'rechteck',a:number,b:number}|{form:'flaeche',A:number}} q
 * @returns {{A:number,U:number,dh:number,dgl:number}}
 *   A   Fläche
 *   U   Umfang
 *   dh  hydraulischer Durchmesser 4A/U (für Reibungsrechnung)
 *   dgl gleichwertiger Durchmesser nach Huebscher (gleicher Druckverlust bei gleichem Volumenstrom)
 */
export function querschnitt(q) {
  if (q.form === 'rund') {
    const { d } = q;
    return { A: (Math.PI * d * d) / 4, U: Math.PI * d, dh: d, dgl: d };
  }
  if (q.form === 'rechteck') {
    const { a, b } = q;
    const A = a * b;
    const U = 2 * (a + b);
    return { A, U, dh: (4 * A) / U, dgl: (1.3 * (a * b) ** 0.625) / (a + b) ** 0.25 };
  }
  if (q.form === 'flaeche') {
    return { A: q.A, U: NaN, dh: NaN, dgl: Math.sqrt((4 * q.A) / Math.PI) };
  }
  throw new Error(`Unbekannte Querschnittsform ${q.form}`);
}

export const geschwindigkeit = (V, A) => V / A;
export const volumenstrom = (v, A) => v * A;
export const flaecheFuer = (V, v) => V / v;
export const durchmesserAusFlaeche = (A) => Math.sqrt((4 * A) / Math.PI);

/** Dynamischer Druck in Pa. */
export const dynDruck = (rho, v) => (rho / 2) * v * v;

/** Gängige Nenndurchmesser runder Luftleitungen in mm (Reihe nach DIN EN 1506, Auszug). */
export const NENNDURCHMESSER_MM = [
  80, 100, 125, 140, 150, 160, 180, 200, 224, 250, 280, 300, 315, 355, 400, 450, 500, 560, 600,
  630, 710, 800, 900, 1000, 1120, 1250,
];

/** Nächstkleinerer und nächstgrößerer Nenndurchmesser zu d (mm). */
export function nachbarNenndurchmesser(dmm) {
  let kleiner = null;
  let groesser = null;
  for (const n of NENNDURCHMESSER_MM) {
    if (n <= dmm) kleiner = n;
    if (n >= dmm && groesser === null) groesser = n;
  }
  return { kleiner, groesser };
}
