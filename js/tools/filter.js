// Filterflächenrechner für Schlauchfilter

import { parseNum, toBase, fromBase } from '../core/units.js';
import {
  STANDARD, BELASTUNG_EINHEITEN, flaecheJeSchlauch, filterflaeche, belastung, benoetigteFlaeche, auslegung,
} from '../core/filter.js';
import { numField, unitSelect, segmented, resultRow, fmt, esc, laden, speichern } from '../ui/dom.js';

const KEY = 'lt.filter';
const START = {
  gesucht: 'n', V: '6000', VUnit: 'm³/h', q: '100', qUnit: 'm³/(m²·h)',
  d: String(STANDARD.durchmesserMm), L: String(STANDARD.laengenMm[1]), n: String(STANDARD.anzahlen[2]),
};

const qZuSI = (wert, einheit) => wert * BELASTUNG_EINHEITEN[einheit];
const qAusSI = (wert, einheit) => wert / BELASTUNG_EINHEITEN[einheit];
const ANDERE = (u) => Object.keys(BELASTUNG_EINHEITEN).find((x) => x !== u);
const tausend = (x) => fmt(x, 6).replace(/,\d+$/, '');

function qSelect(aktuell) {
  return `<select name="qUnit" class="unit-select" aria-label="Einheit">${Object.keys(BELASTUNG_EINHEITEN)
    .map((u) => `<option${u === aktuell ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select>`;
}

function chips(feld, werte, aktuell, format = String) {
  const a = parseNum(aktuell);
  return `<div class="chips" role="group">${werte
    .map((w) => `<button type="button" class="chip${w === a ? ' active' : ''}" data-chip="${feld}" data-value="${w}">${format(w)}</button>`)
    .join('')}</div>`;
}

export function render(root) {
  const s = { ...START, ...laden(KEY, {}) };

  function formular() {
    const f = [];
    f.push(segmented('gesucht', s.gesucht, [
      { value: 'n', label: 'Anzahl Schläuche' },
      { value: 'q', label: 'Belastung' },
      { value: 'V', label: 'Volumenstrom' },
    ], 'Gesucht'));
    f.push('<div class="grid2">');
    if (s.gesucht !== 'V') f.push(numField('V', 'Volumenstrom V̇', s.V, { unitHtml: unitSelect('VUnit', 'volumenstrom', s.VUnit) }));
    if (s.gesucht !== 'q') f.push(numField('q', 'Filterflächenbelastung q', s.q, { unitHtml: qSelect(s.qUnit), hint: 'spezifische Belastung (zulässig)' }));
    f.push('</div>');
    f.push(numField('d', 'Schlauchdurchmesser d', s.d, { unit: 'mm' }));
    f.push(chips('d', [STANDARD.durchmesserMm], s.d, (w) => `Ø ${w}`));
    f.push(numField('L', 'Schlauchlänge L', s.L, { unit: 'mm' }));
    f.push(chips('L', STANDARD.laengenMm, s.L, tausend));
    if (s.gesucht !== 'n') {
      f.push(numField('n', 'Anzahl Schläuche n', s.n, { unit: 'Stk.' }));
      f.push(chips('n', STANDARD.anzahlen, s.n));
    }
    return f.join('');
  }

  function rechne() {
    const pos = (x) => Number.isFinite(x) && x > 0;
    const V = toBase('volumenstrom', parseNum(s.V), s.VUnit);
    const q = qZuSI(parseNum(s.q), s.qUnit);
    const d = parseNum(s.d) / 1000;
    const L = parseNum(s.L) / 1000;
    const n = parseNum(s.n);
    if (!pos(d) || !pos(L)) return null;
    const Aj = flaecheJeSchlauch(d, L);
    const qText = (wert) => resultRow('', fmt(qAusSI(wert, ANDERE(s.qUnit)), 4), ANDERE(s.qUnit));
    const r = [];

    if (s.gesucht === 'n') {
      if (!pos(V) || !pos(q)) return null;
      const a = auslegung(V, q, d, L);
      r.push(resultRow('Benötigte Anzahl', `${fmt(a.gerundet)}`, 'Stk.', true));
      r.push(resultRow('Erforderliche Filterfläche', fmt(benoetigteFlaeche(V, q), 4), 'm²'));
      r.push(resultRow('rechnerisch', fmt(a.exakt, 4), 'Schläuche'));
      r.push(resultRow('Fläche je Schlauch', fmt(Aj, 4), 'm²'));
      if (a.standard) {
        r.push(`<h3 class="result-head">Nächste Standardgröße</h3>`);
        r.push(resultRow(`${a.standard} Schläuche`, fmt(a.A, 4), 'm²'));
        r.push(resultRow('Belastung q<sub>ist</sub>', fmt(qAusSI(a.qIst, s.qUnit), 4), s.qUnit));
        r.push(qText(a.qIst));
      } else {
        r.push(`<p class="note warn">Mehr als ${STANDARD.anzahlen.at(-1)} Schläuche nötig – größer als die größte Standardanzahl.</p>`);
      }
      // Übersicht über alle Standardlängen
      const zeilen = STANDARD.laengenMm.map((Lmm) => {
        const x = auslegung(V, q, d, Lmm / 1000);
        const aktiv = Math.abs(Lmm / 1000 - L) < 1e-9 ? ' class="active"' : '';
        return `<tr data-l="${Lmm}"${aktiv}><td>${tausend(Lmm)}</td><td>${fmt(x.gerundet)}</td><td><b>${x.standard ?? '–'}</b></td>
          <td>${x.standard ? fmt(x.A, 3) : '–'}</td><td>${x.standard ? fmt(qAusSI(x.qIst, s.qUnit), 3) : '–'}</td></tr>`;
      }).join('');
      r.push(`<h3 class="result-head">Übersicht Standardlängen (Ø ${esc(s.d)} mm)</h3>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>L [mm]</th><th>n erf.</th><th>n Std.</th><th>A [m²]</th><th>q<sub>ist</sub></th></tr></thead>
          <tbody>${zeilen}</tbody></table></div>
        <p class="note">q<sub>ist</sub> in ${esc(s.qUnit)}. Antippen einer Zeile übernimmt die Länge.</p>`);
      return r.join('');
    }

    if (!pos(n)) return null;
    const A = filterflaeche(d, L, n);
    if (s.gesucht === 'q') {
      if (!pos(V)) return null;
      const qi = belastung(V, A);
      r.push(resultRow('Filterflächenbelastung q', fmt(qAusSI(qi, s.qUnit), 4), s.qUnit, true));
      r.push(qText(qi));
    } else {
      if (!pos(q)) return null;
      const Vi = q * A;
      r.push(resultRow('Volumenstrom V̇', fmt(fromBase('volumenstrom', Vi, s.VUnit)), s.VUnit, true));
      if (s.VUnit !== 'm³/h') r.push(resultRow('', fmt(Vi * 3600), 'm³/h'));
      r.push(resultRow('', fmt(Vi), 'm³/s'));
    }
    r.push(resultRow('Filterfläche gesamt', fmt(A, 4), 'm²'));
    r.push(resultRow('Fläche je Schlauch', fmt(Aj, 4), 'm²'));
    return r.join('');
  }

  function aktualisiere() {
    root.querySelector('#erg').innerHTML = rechne() ?? '<p class="muted">Bitte gültige Werte (> 0) eingeben.</p>';
    root.querySelectorAll('[data-chip]').forEach((c) => {
      const an = parseNum(s[c.dataset.chip]) === Number(c.dataset.value);
      c.classList.toggle('active', an);
    });
    speichern(KEY, s);
  }

  function zeichne() {
    root.innerHTML = `
      <section class="card">${formular()}</section>
      <section class="card result" id="erg" aria-live="polite"></section>
      <p class="note">Filterfläche = Anzahl × Mantelfläche (π · d · L) der Filterschläuche, ohne Schlauchboden.
      1 m/min = 60 m³/(m²·h).</p>`;
    aktualisiere();
  }

  root.addEventListener('input', (e) => {
    const n = e.target.name;
    if (!n || e.target.tagName === 'SELECT') return;
    s[n] = e.target.value;
    aktualisiere();
  });
  root.addEventListener('change', (e) => {
    if (e.target.tagName !== 'SELECT') return;
    if (e.target.name === 'qUnit') {
      // Wert mit umrechnen, damit die physikalische Größe gleich bleibt
      const alt = s.qUnit, w = parseNum(s.q);
      s.qUnit = e.target.value;
      if (Number.isFinite(w)) s.q = fmt(qAusSI(qZuSI(w, alt), s.qUnit), 6).replace(/\./g, '');
    } else s[e.target.name] = e.target.value;
    zeichne();
  });
  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-chip]');
    if (c) {
      s[c.dataset.chip] = c.dataset.value;
      const inp = root.querySelector(`[name="${c.dataset.chip}"]`);
      if (inp) inp.value = c.dataset.value;
      aktualisiere();
      return;
    }
    const zeile = e.target.closest('.tbl tbody tr');
    if (zeile) {
      s.L = zeile.dataset.l;
      root.querySelector('[name="L"]').value = s.L;
      aktualisiere();
      return;
    }
    const b = e.target.closest('[data-set]');
    if (b) {
      s[b.dataset.set] = b.dataset.value;
      zeichne();
    }
  });

  zeichne();
}
