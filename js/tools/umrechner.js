// Umrechner: Volumenstrom ↔ Geschwindigkeit ↔ Querschnitt

import { parseNum, toBase, fromBase } from '../core/units.js';
import { querschnitt, dynDruck, durchmesserAusFlaeche, nachbarNenndurchmesser } from '../core/flow.js';
import { dichte, NORMALZUSTAND } from '../core/air.js';
import { numField, unitSelect, segmented, resultRow, fmt, laden, speichern } from '../ui/dom.js';

const KEY = 'lt.umrechner';
const START = {
  gesucht: 'v', form: 'rund', V: '1000', VUnit: 'm³/h', v: '5', vUnit: 'm/s',
  d: '200', a: '300', b: '200', A: '0,1', AUnit: 'm²', lUnit: 'mm',
};

const RHO = dichte(NORMALZUSTAND.t, NORMALZUSTAND.p);

export function render(root) {
  const s = { ...START, ...laden(KEY, {}) };

  function formular() {
    const lenSel = (n) => unitSelect(n, 'laenge', s.lUnit);
    const teile = [];
    teile.push(
      segmented('gesucht', s.gesucht, [
        { value: 'v', label: 'Geschwindigkeit' },
        { value: 'V', label: 'Volumenstrom' },
        { value: 'A', label: 'Querschnitt' },
      ], 'Gesucht')
    );
    teile.push(
      segmented('form', s.form, [
        { value: 'rund', label: 'Rund' },
        { value: 'rechteck', label: 'Rechteckig' },
        { value: 'flaeche', label: 'Fläche' },
      ], 'Querschnitt')
    );
    teile.push('<div class="grid2">');
    if (s.gesucht !== 'V') teile.push(numField('V', 'Volumenstrom V̇', s.V, { unitHtml: unitSelect('VUnit', 'volumenstrom', s.VUnit) }));
    if (s.gesucht !== 'v') teile.push(numField('v', 'Geschwindigkeit v', s.v, { unitHtml: unitSelect('vUnit', 'geschwindigkeit', s.vUnit) }));
    if (s.form === 'rund' && s.gesucht !== 'A') teile.push(numField('d', 'Durchmesser d', s.d, { unitHtml: lenSel('lUnit') }));
    if (s.form === 'rechteck') {
      teile.push(numField('a', 'Seite a', s.a, { unitHtml: lenSel('lUnit') }));
      if (s.gesucht !== 'A') teile.push(numField('b', 'Seite b', s.b, { unitHtml: lenSel('lUnit') }));
    }
    if (s.form === 'flaeche' && s.gesucht !== 'A') teile.push(numField('A', 'Fläche A', s.A, { unitHtml: unitSelect('AUnit', 'flaeche', s.AUnit) }));
    teile.push('</div>');
    return teile.join('');
  }

  function rechne() {
    const V0 = toBase('volumenstrom', parseNum(s.V), s.VUnit);
    const v0 = toBase('geschwindigkeit', parseNum(s.v), s.vUnit);
    const len = (x) => toBase('laenge', parseNum(x), s.lUnit);
    const pos = (x) => Number.isFinite(x) && x > 0;

    let q; // Querschnittsbeschreibung (SI)
    let V, v, A;
    const extra = [];

    if (s.gesucht === 'A') {
      if (!pos(V0) || !pos(v0)) return null;
      V = V0; v = v0; A = V / v;
      if (s.form === 'rund') {
        const d = durchmesserAusFlaeche(A);
        q = { form: 'rund', d };
        const dmm = d * 1000;
        extra.push(resultRow('Durchmesser d', fmt(fromBase('laenge', d, s.lUnit)), s.lUnit, true));
        const { kleiner, groesser } = nachbarNenndurchmesser(dmm);
        const zeile = (dn) => {
          const vn = V / querschnitt({ form: 'rund', d: dn / 1000 }).A;
          return resultRow(`Nenndurchmesser Ø ${dn}`, fmt(vn, 3), 'm/s');
        };
        if (groesser) extra.push(zeile(groesser));
        if (kleiner && kleiner !== groesser) extra.push(zeile(kleiner));
      } else if (s.form === 'rechteck') {
        const a = len(s.a);
        if (!pos(a)) return null;
        const b = A / a;
        q = { form: 'rechteck', a, b };
        extra.push(resultRow('Seite b', fmt(fromBase('laenge', b, s.lUnit)), s.lUnit, true));
      } else {
        q = { form: 'flaeche', A };
      }
    } else {
      if (s.form === 'rund') q = { form: 'rund', d: len(s.d) };
      else if (s.form === 'rechteck') q = { form: 'rechteck', a: len(s.a), b: len(s.b) };
      else q = { form: 'flaeche', A: toBase('flaeche', parseNum(s.A), s.AUnit) };
      if (!Object.values(q).filter((x) => typeof x === 'number').every(pos)) return null;
      A = querschnitt(q).A;
      if (s.gesucht === 'v') {
        if (!pos(V0)) return null;
        V = V0; v = V / A;
      } else {
        if (!pos(v0)) return null;
        v = v0; V = v * A;
      }
    }

    const qs = querschnitt(q);
    const rows = [];
    if (s.gesucht === 'v') rows.push(resultRow('Geschwindigkeit v', fmt(fromBase('geschwindigkeit', v, s.vUnit)), s.vUnit, true));
    if (s.gesucht === 'V') rows.push(resultRow('Volumenstrom V̇', fmt(fromBase('volumenstrom', V, s.VUnit)), s.VUnit, true));
    if (s.gesucht === 'A') rows.push(resultRow('Querschnittsfläche A', fmt(A), 'm²', true));
    rows.push(...extra);

    rows.push('<div class="result-sep"></div>');
    if (s.gesucht !== 'v') rows.push(resultRow('Geschwindigkeit', fmt(v), 'm/s'));
    rows.push(resultRow('Volumenstrom', fmt(V * 3600), 'm³/h'));
    rows.push(resultRow('', fmt(V), 'm³/s'));
    rows.push(resultRow('', fmt(V * 1000), 'l/s'));
    if (s.gesucht !== 'A') rows.push(resultRow('Fläche', fmt(A), 'm²'));
    if (q.form === 'rechteck') {
      rows.push(resultRow('Hydraul. Durchmesser d<sub>h</sub>', fmt(qs.dh * 1000), 'mm'));
      rows.push(resultRow('Gleichwertiger Ø d<sub>gl</sub>', fmt(qs.dgl * 1000), 'mm'));
    }
    rows.push(resultRow('Dynamischer Druck p<sub>d</sub>', fmt(dynDruck(RHO, v), 3), 'Pa'));
    return rows.join('');
  }

  function aktualisiere() {
    const box = root.querySelector('#erg');
    const html = rechne();
    box.innerHTML = html ?? '<p class="muted">Bitte gültige Werte (> 0) eingeben.</p>';
    speichern(KEY, s);
  }

  function zeichne() {
    root.innerHTML = `
      <section class="card">${formular()}</section>
      <section class="card result" id="erg" aria-live="polite"></section>
      <p class="note">p<sub>d</sub> bei Luft 20 °C, 1013 hPa (ρ = ${fmt(RHO)} kg/m³).
      d<sub>gl</sub> nach Huebscher: runder Kanal mit gleichem Druckverlust bei gleichem Volumenstrom.</p>`;
    aktualisiere();
  }

  root.addEventListener('input', (e) => {
    const n = e.target.name;
    if (!n) return;
    s[n] = e.target.value;
    aktualisiere();
  });
  root.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT') zeichne(); // gleiche Längeneinheit in allen Feldern
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    s[b.dataset.set] = b.dataset.value;
    zeichne();
  });

  zeichne();
}
