// Schlauchfilter: Filterfläche über die Mantelfläche der Filterschläuche,
// Filterflächenbelastung q = V̇ / A. Alle Größen in SI (m, m², m³/s), q in m³/(m²·s).

/** Standardwerte (aus der Praxis vorgegeben). */
export const STANDARD = {
  durchmesserMm: 200,
  laengenMm: [1500, 2000, 2500, 3000],
  anzahlen: [15, 30, 36, 45, 60, 64, 81, 108, 162, 216, 270],
};

/** Einheiten der Filterflächenbelastung (Faktor zu m³/(m²·s)). */
export const BELASTUNG_EINHEITEN = {
  'm³/(m²·h)': 1 / 3600,
  'm/min': 1 / 60,
};

/** Mantelfläche eines Schlauchs (ohne Boden). */
export const flaecheJeSchlauch = (d, L) => Math.PI * d * L;

/** Gesamte Filterfläche. */
export const filterflaeche = (d, L, n) => n * flaecheJeSchlauch(d, L);

/** Filterflächenbelastung q = V̇ / A. */
export const belastung = (V, A) => V / A;

/** Benötigte Fläche für V̇ bei zulässiger Belastung q. */
export const benoetigteFlaeche = (V, q) => V / q;

/** Benötigte Schlauchanzahl (exakt und aufgerundet). */
export function benoetigteAnzahl(V, q, d, L) {
  const exakt = benoetigteFlaeche(V, q) / flaecheJeSchlauch(d, L);
  // Rundungsrauschen abfangen (z. B. 29,999999999 → 30)
  const gerundet = Math.ceil(exakt - 1e-9);
  return { exakt, gerundet: Math.max(1, gerundet) };
}

/** Kleinste Standardanzahl ≥ n, sonst null. */
export function naechsteStandardanzahl(n, liste = STANDARD.anzahlen) {
  return liste.find((x) => x >= n) ?? null;
}

/**
 * Auslegung für eine Länge: benötigte Anzahl, gewählte Standardanzahl und die
 * damit tatsächlich erreichte Belastung.
 */
export function auslegung(V, q, d, L, liste = STANDARD.anzahlen) {
  const { exakt, gerundet } = benoetigteAnzahl(V, q, d, L);
  const standard = naechsteStandardanzahl(gerundet, liste);
  const A = standard ? filterflaeche(d, L, standard) : NaN;
  return { L, exakt, gerundet, standard, A, qIst: standard ? belastung(V, A) : NaN };
}
