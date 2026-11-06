// Druckverlustberechnung für Luftleitungen. Alle Größen in SI.
//
// Gerade Leitung:  Δp = λ · L/dh · ρ/2 · v²          (Darcy-Weisbach)
// Formteil:        Δp = n · ζ · ρ/2 · v²
// Komponente:      Δp = n · Δp_N · (V̇/V̇_N)²          (quadratische Kennlinie)
//                  oder konstant, wenn kein Nennvolumenstrom angegeben ist.

import { querschnitt, dynDruck } from './flow.js';

export const RE_KRITISCH = 2320;

export function reynolds(v, dh, nu) {
  return (v * dh) / nu;
}

/**
 * Rohrreibungszahl λ.
 * Laminar (Re < 2320): 64/Re, sonst Colebrook-White (iterativ).
 * @param {number} Re Reynolds-Zahl
 * @param {number} kRel relative Rauheit k/dh
 */
export function reibungszahl(Re, kRel) {
  if (!(Re > 0)) return 0;
  if (Re < RE_KRITISCH) return 64 / Re;
  // Startwert nach Swamee-Jain
  let lambda = 0.25 / Math.log10(kRel / 3.7 + 5.74 / Re ** 0.9) ** 2;
  for (let i = 0; i < 100; i++) {
    const x = -2 * Math.log10(kRel / 3.71 + 2.51 / (Re * Math.sqrt(lambda)));
    const neu = 1 / (x * x);
    if (Math.abs(neu - lambda) < 1e-14) return neu;
    lambda = neu;
  }
  return lambda;
}

/**
 * Gerade Leitung.
 * @param {{V:number, querschnitt:object, L:number, k:number}} el  k = absolute Rauheit in m
 * @param {{rho:number, nu:number}} luft
 */
export function geradeLeitung({ V, querschnitt: q, L, k }, luft) {
  const { A, dh } = querschnitt(q);
  const v = V / A;
  const Re = reynolds(v, dh, luft.nu);
  const lambda = reibungszahl(Re, k / dh);
  const pd = dynDruck(luft.rho, v);
  const R = (lambda / dh) * pd; // Pa/m
  return { A, dh, v, Re, lambda, pd, R, dp: R * L };
}

/** Formteil mit Widerstandsbeiwert ζ (bezogen auf die Geschwindigkeit im angegebenen Querschnitt). */
export function formteil({ V, querschnitt: q, zeta, n = 1 }, luft) {
  const { A } = querschnitt(q);
  const v = V / A;
  const pd = dynDruck(luft.rho, v);
  return { A, v, pd, dp: n * zeta * pd };
}

/** Komponente mit bekanntem Druckverlust Δp_N bei V̇_N. */
export function komponente({ V, dpN, VN, n = 1 }) {
  const faktor = VN > 0 ? (V / VN) ** 2 : 1;
  return { dp: n * dpN * faktor, faktor };
}

const RECHNER = { gerade: geradeLeitung, zeta: formteil, komponente };

/**
 * Summe eines Strangs (Reihenschaltung).
 * @param {Array<{typ:'gerade'|'zeta'|'komponente'}>} elemente in SI
 */
export function strang(elemente, luft) {
  const ergebnisse = elemente.map((el) => RECHNER[el.typ](el, luft));
  const summe = ergebnisse.reduce((s, e) => s + (Number.isFinite(e.dp) ? e.dp : 0), 0);
  return { ergebnisse, summe };
}
