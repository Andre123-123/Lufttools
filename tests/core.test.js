import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseNum, toBase, fromBase } from '../js/core/units.js';
import { dichte, kinViskositaet, luftzustand } from '../js/core/air.js';
import { querschnitt, nachbarNenndurchmesser } from '../js/core/flow.js';
import { reibungszahl, geradeLeitung, formteil, komponente, strang } from '../js/core/pressure.js';
import { FORMEN, findeForm, berechne } from '../js/core/geometry.js';

const nahe = (ist, soll, relTol = 1e-3, msg = '') =>
  assert.ok(Math.abs(ist - soll) <= Math.abs(soll) * relTol, `${msg} ist=${ist} soll=${soll}`);

test('parseNum: deutsche und englische Schreibweise', () => {
  assert.equal(parseNum('0,15'), 0.15);
  assert.equal(parseNum('1.234,5'), 1234.5);
  assert.equal(parseNum('1013.25'), 1013.25);
  assert.equal(parseNum(' 2 500 '), 2500);
  assert.equal(parseNum('1e-3'), 0.001);
  assert.ok(Number.isNaN(parseNum('')));
  assert.ok(Number.isNaN(parseNum('abc')));
  assert.ok(Number.isNaN(parseNum('1,2,3')));
});

test('Einheiten: Volumenstrom und Druck', () => {
  nahe(toBase('volumenstrom', 3600, 'm³/h'), 1);
  nahe(fromBase('volumenstrom', 1, 'l/s'), 1000);
  nahe(toBase('druck', 1, 'mbar'), 100);
});

test('Luft: Dichte und Viskosität bei 20 °C / 1013,25 hPa', () => {
  nahe(dichte(20, 101325), 1.204, 1e-3);
  nahe(kinViskositaet(20, 101325), 1.51e-5, 5e-3);
  nahe(dichte(0, 101325), 1.293, 1e-3);
});

test('Querschnitt: rund und rechteckig', () => {
  const r = querschnitt({ form: 'rund', d: 0.2 });
  nahe(r.A, 0.0314159, 1e-5);
  const q = querschnitt({ form: 'rechteck', a: 0.3, b: 0.2 });
  nahe(q.A, 0.06);
  nahe(q.dh, 0.24);
  nahe(q.dgl, 0.266, 2e-3, 'Huebscher-Tabellenwert 300×200 ≈ 266 mm');
});

test('Nenndurchmesser: Nachbarn', () => {
  assert.deepEqual(nachbarNenndurchmesser(190), { kleiner: 180, groesser: 200 });
  assert.deepEqual(nachbarNenndurchmesser(200), { kleiner: 200, groesser: 200 });
});

test('Reibungszahl: laminar und Colebrook (Moody-Referenzwerte)', () => {
  nahe(reibungszahl(1000, 0), 0.064);
  nahe(reibungszahl(1e5, 1e-4), 0.0185, 3e-3);
  nahe(reibungszahl(1e6, 0), 0.01165, 3e-3);
  nahe(reibungszahl(1e5, 0.01), 0.0385, 1e-2);
  // Colebrook-Gleichung muss erfüllt sein
  const Re = 3e5, k = 5e-4, l = reibungszahl(Re, k);
  nahe(1 / Math.sqrt(l), -2 * Math.log10(k / 3.71 + 2.51 / (Re * Math.sqrt(l))), 1e-10);
  assert.equal(reibungszahl(0, 0), 0);
});

test('Gerade Leitung: Ø200, 1000 m³/h, verzinkt, 10 m', () => {
  const luft = luftzustand(20, 101325);
  const e = geradeLeitung({ V: 1000 / 3600, querschnitt: { form: 'rund', d: 0.2 }, L: 10, k: 0.15e-3 }, luft);
  nahe(e.v, 8.842, 1e-3);
  nahe(e.R, 4.93, 1e-2, 'Druckgefälle Pa/m');
  nahe(e.dp, 49.3, 1e-2);
});

test('Formteil und Komponente', () => {
  const luft = luftzustand(20, 101325);
  const f = formteil({ V: 1000 / 3600, querschnitt: { form: 'rund', d: 0.2 }, zeta: 0.3, n: 2 }, luft);
  nahe(f.pd, 47.07, 1e-3);
  nahe(f.dp, 2 * 0.3 * 47.07, 1e-3);
  nahe(komponente({ V: 2000, dpN: 50, VN: 1000 }).dp, 200);
  nahe(komponente({ V: 2000, dpN: 50, VN: 0 }).dp, 50);
});

test('Strang: Summe', () => {
  const luft = luftzustand();
  const q = { form: 'rund', d: 0.2 };
  const V = 1000 / 3600;
  const s = strang(
    [
      { typ: 'gerade', V, querschnitt: q, L: 10, k: 0.15e-3 },
      { typ: 'zeta', V, querschnitt: q, zeta: 0.3, n: 2 },
      { typ: 'komponente', V, dpN: 80, VN: V, n: 1 },
    ],
    luft
  );
  nahe(s.summe, s.ergebnisse[0].dp + s.ergebnisse[1].dp + 80, 1e-12);
});

test('Geometrie: Flächen', () => {
  const r = (id, w) => berechne(findeForm(id), w)[0].wert;
  nahe(r('kreis', { d: 2 }), Math.PI);
  nahe(r('dreieck3', { a: 3, b: 4, c: 5 }), 6);
  nahe(r('trapez', { a: 4, c: 2, h: 3 }), 9);
  nahe(r('kreisausschnitt', { r: 1, alpha: 360 }), Math.PI);
  nahe(r('kreisabschnitt', { r: 1, alpha: 180 }), Math.PI / 2);
  nahe(r('vieleck', { n: 4, a: 2 }), 4);
  nahe(r('vieleck', { n: 6, a: 1 }), (3 * Math.sqrt(3)) / 2);
  nahe(berechne(findeForm('ellipse'), { a: 2, b: 2 })[1].wert, 2 * Math.PI, 1e-9);
});

test('Geometrie: Körper', () => {
  const r = (id, w) => berechne(findeForm(id), w)[0].wert;
  nahe(r('quader', { a: 2, b: 3, c: 4 }), 24);
  nahe(r('zylinder', { d: 2, h: 1 }), Math.PI);
  nahe(r('kugel', { d: 2 }), (4 / 3) * Math.PI);
  nahe(r('kegel', { d: 2, h: 3 }), Math.PI);
  nahe(r('kegelstumpf', { D: 2, d: 2, h: 1 }), Math.PI, 1e-9);
  nahe(r('pyramide', { a: 3, b: 3, h: 3 }), 9);
  // Pyramidenstumpf mit gleichen Flächen = Quader, mit Spitze = Pyramide
  nahe(r('pyramidenstumpf', { a1: 2, b1: 3, a2: 2, b2: 3, h: 4 }), 24);
  nahe(r('pyramidenstumpf', { a1: 3, b1: 3, a2: 1e-12, b2: 1e-12, h: 3 }), 9, 1e-6);
});

test('Geometrie: ungültige Eingaben werden gemeldet', () => {
  assert.throws(() => berechne(findeForm('dreieck3'), { a: 1, b: 1, c: 5 }), /kein Dreieck/);
  assert.throws(() => berechne(findeForm('kreisring'), { D: 1, d: 2 }), /Innendurchmesser/);
  assert.throws(() => berechne(findeForm('kreis'), { d: NaN }), /eingeben/);
  assert.throws(() => berechne(findeForm('kreis'), { d: -1 }), /größer als 0/);
});

test('Geometrie: alle Formen liefern ein Hauptergebnis', () => {
  for (const f of FORMEN) {
    const w = Object.fromEntries(f.eingaben.map((e) => [e.key, e.typ === 'anzahl' ? 5 : e.typ === 'winkel' ? 90 : e.key === 'd' ? 1 : 2]));
    const erg = berechne(f, w);
    assert.ok(erg.some((e) => e.haupt && Number.isFinite(e.wert) && e.wert > 0), f.id);
  }
});
