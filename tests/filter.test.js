import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  flaecheJeSchlauch, filterflaeche, belastung, benoetigteAnzahl, naechsteStandardanzahl, auslegung, BELASTUNG_EINHEITEN,
} from '../js/core/filter.js';

const nahe = (ist, soll, relTol = 1e-9) => assert.ok(Math.abs(ist - soll) <= Math.abs(soll) * relTol, `ist=${ist} soll=${soll}`);

test('Filterfläche: Mantelfläche × Anzahl', () => {
  nahe(flaecheJeSchlauch(0.2, 2), Math.PI * 0.4); // 1,2566 m²
  nahe(filterflaeche(0.2, 2, 36), 36 * Math.PI * 0.4); // 45,24 m²
});

test('Belastung und Einheiten', () => {
  const A = filterflaeche(0.2, 2, 36);
  const V = 4000 / 3600;
  const q = belastung(V, A); // m³/(m²·s)
  nahe(q / BELASTUNG_EINHEITEN['m³/(m²·h)'], 4000 / A);
  nahe(q / BELASTUNG_EINHEITEN['m/min'], 4000 / A / 60);
});

test('Benötigte Anzahl wird aufgerundet, exakte Treffer nicht', () => {
  const d = 0.2, L = 2, Aj = flaecheJeSchlauch(d, L);
  const q = 100 / 3600; // 100 m³/(m²·h)
  assert.equal(benoetigteAnzahl(30 * Aj * q, q, d, L).gerundet, 30);
  assert.equal(benoetigteAnzahl(30.2 * Aj * q, q, d, L).gerundet, 31);
});

test('Nächste Standardanzahl', () => {
  assert.equal(naechsteStandardanzahl(31), 36);
  assert.equal(naechsteStandardanzahl(36), 36);
  assert.equal(naechsteStandardanzahl(1), 15);
  assert.equal(naechsteStandardanzahl(271), null);
});

test('Auslegung: 6000 m³/h, 100 m³/(m²·h), Ø200 × 2000', () => {
  const a = auslegung(6000 / 3600, 100 / 3600, 0.2, 2);
  // A_erf = 60 m², je Schlauch 1,2566 m² → 47,75 → 48 → Standard 60
  nahe(a.exakt, 60 / (Math.PI * 0.4));
  assert.equal(a.gerundet, 48);
  assert.equal(a.standard, 60);
  nahe(a.qIst * 3600, 6000 / (60 * Math.PI * 0.4));
});
