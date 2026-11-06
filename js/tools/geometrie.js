// Geometrierechner: Flächen und Körper

import { parseNum, fromBase, toBase } from '../core/units.js';
import { FLAECHEN, KOERPER, findeForm, berechne } from '../core/geometry.js';
import { numField, unitSelect, segmented, resultRow, fmt, esc, laden, speichern } from '../ui/dom.js';

const KEY = 'lt.geometrie';

// Skizzen (viewBox 0 0 120 80), Strichfarbe über CSS
const T = (x, y, t) => `<text x="${x}" y="${y}">${t}</text>`;
const SKIZZEN = {
  rechteck: `<rect x="20" y="15" width="80" height="45"/>${T(60, 72, 'a')}${T(108, 41, 'b')}`,
  quadrat: `<rect x="35" y="10" width="50" height="50"/>${T(60, 72, 'a')}`,
  kreis: `<circle cx="60" cy="38" r="28"/><line class="dim" x1="32" y1="38" x2="88" y2="38"/>${T(60, 33, 'd')}`,
  kreisring: `<circle cx="60" cy="38" r="30"/><circle cx="60" cy="38" r="16"/>${T(60, 76, 'D')}${T(60, 42, 'd')}`,
  ellipse: `<ellipse cx="60" cy="38" rx="42" ry="24"/><line class="dim" x1="18" y1="38" x2="102" y2="38"/><line class="dim" x1="60" y1="14" x2="60" y2="62"/>${T(84, 34, 'a')}${T(66, 24, 'b')}`,
  dreieck: `<polygon points="15,62 105,62 70,12"/><line class="dim" x1="70" y1="12" x2="70" y2="62"/>${T(60, 75, 'g')}${T(76, 42, 'h')}`,
  dreieck3: `<polygon points="15,62 105,62 70,12"/>${T(60, 75, 'a')}${T(94, 34, 'b')}${T(36, 34, 'c')}`,
  trapez: `<polygon points="12,62 108,62 85,15 35,15"/><line class="dim" x1="60" y1="15" x2="60" y2="62"/>${T(60, 75, 'a')}${T(60, 11, 'c')}${T(66, 42, 'h')}`,
  parallelogramm: `<polygon points="10,62 85,62 110,15 35,15"/><line class="dim" x1="35" y1="15" x2="35" y2="62"/>${T(48, 75, 'a')}${T(41, 42, 'h')}`,
  kreisausschnitt: `<path d="M60,62 L20,30 A50,50 0 0 1 100,30 Z"/>${T(36, 52, 'r')}${T(60, 50, 'α')}`,
  kreisabschnitt: `<path d="M18,50 A48,48 0 0 1 102,50 Z"/><path class="dim" d="M18,50 L60,74 L102,50"/>${T(60, 46, 's')}${T(66, 70, 'α')}${T(32, 66, 'r')}`,
  vieleck: `<polygon points="60,8 89,25 89,55 60,72 31,55 31,25"/>${T(100, 44, 'a')}`,
  wuerfel: `<rect x="25" y="25" width="45" height="45"/><path d="M25,25 L45,8 L90,8 L70,25 M90,8 L90,53 L70,70"/>${T(47, 78, 'a')}`,
  quader: `<rect x="15" y="28" width="65" height="40"/><path d="M15,28 L35,10 L100,10 L80,28 M100,10 L100,50 L80,68"/>${T(47, 78, 'a')}${T(96, 64, 'b')}${T(8, 50, 'c')}`,
  zylinder: `<ellipse cx="60" cy="15" rx="30" ry="8"/><path d="M30,15 L30,62 A30,8 0 0 0 90,62 L90,15"/>${T(60, 19, 'd')}${T(98, 42, 'h')}`,
  hohlzylinder: `<ellipse cx="60" cy="15" rx="32" ry="9"/><ellipse cx="60" cy="15" rx="16" ry="4.5"/><path d="M28,15 L28,62 A32,9 0 0 0 92,62 L92,15"/>${T(60, 32, 'D / d')}${T(100, 42, 'h')}`,
  kegel: `<path d="M30,62 L60,8 L90,62"/><ellipse cx="60" cy="62" rx="30" ry="8"/><line class="dim" x1="60" y1="8" x2="60" y2="62"/>${T(60, 78, 'd')}${T(66, 40, 'h')}`,
  kegelstumpf: `<ellipse cx="60" cy="16" rx="16" ry="5"/><path d="M44,16 L28,62 M76,16 L92,62"/><ellipse cx="60" cy="62" rx="32" ry="8"/>${T(60, 12, 'd')}${T(60, 79, 'D')}${T(98, 42, 'h')}`,
  kugel: `<circle cx="60" cy="38" r="30"/><ellipse class="dim" cx="60" cy="38" rx="30" ry="8"/>${T(60, 33, 'd')}`,
  pyramide: `<path d="M15,62 L80,62 L105,45 M15,62 L60,8 L80,62 M60,8 L105,45"/><path class="dim" d="M15,62 L40,45 L105,45 M40,45 L60,8"/>${T(47, 75, 'a')}${T(100, 60, 'b')}`,
  pyramidenstumpf: `<path d="M10,66 L80,66 L108,48 M10,66 L40,22 L72,22 L80,66 M72,22 L90,12 L108,48"/><path class="dim" d="M10,66 L38,48 L108,48 M38,48 L58,12 L90,12 M40,22 L58,12"/>${T(45, 78, 'a₁')}${T(64, 9, 'a₂')}${T(4, 45, 'h')}`,
  prisma: `<path d="M15,62 L50,62 L32,25 Z M32,25 L82,12 L100,49 L50,62 M100,49 L65,49"/><path class="dim" d="M15,62 L65,49 L82,12"/>${T(32, 75, 'g')}${T(82, 64, 'l')}`,
};

export function render(root) {
  const s = { formId: 'kreis', lUnit: 'mm', werte: {}, ...laden(KEY, {}) };
  if (!findeForm(s.formId)) s.formId = 'kreis';

  const gruppe = () => (KOERPER.some((k) => k.id === s.formId) ? 'koerper' : 'flaeche');

  function auswahl() {
    const liste = gruppe() === 'koerper' ? KOERPER : FLAECHEN;
    return `<div class="shape-grid">${liste
      .map(
        (f) => `<button type="button" class="shape-btn${f.id === s.formId ? ' active' : ''}" data-form="${f.id}">
          <svg viewBox="0 0 120 80" aria-hidden="true">${SKIZZEN[f.id] ?? ''}</svg><span>${esc(f.name)}</span></button>`
      )
      .join('')}</div>`;
  }

  function eingaben(form) {
    const w = s.werte[form.id] ?? {};
    return `<div class="grid2">${form.eingaben
      .map((e) => {
        const opts =
          e.typ === 'laenge' ? { unitHtml: unitSelect('lUnit', 'laenge', s.lUnit) } : e.typ === 'winkel' ? { unit: '°' } : { unit: 'Stk.' };
        return numField(`w.${e.key}`, e.label, w[e.key] ?? '', opts);
      })
      .join('')}</div>`;
  }

  function ergebnis() {
    const form = findeForm(s.formId);
    const w = s.werte[form.id] ?? {};
    const werte = {};
    for (const e of form.eingaben) {
      const n = parseNum(w[e.key]);
      werte[e.key] = e.typ === 'laenge' ? toBase('laenge', n, s.lUnit) : n;
    }
    if (form.eingaben.every((e) => (w[e.key] ?? '') === '')) return '<p class="muted">Bitte Maße eingeben.</p>';
    let erg;
    try {
      erg = berechne(form, werte);
    } catch (err) {
      return `<p class="muted">${esc(err.message)}</p>`;
    }
    const lu = s.lUnit;
    return erg
      .map((r) => {
        if (r.dim === 1) return resultRow(r.label, fmt(fromBase('laenge', r.wert, lu)), lu, r.haupt);
        if (r.dim === 2) {
          const zeilen = [resultRow(r.label, fmt(r.wert), 'm²', r.haupt)];
          if (lu !== 'm') zeilen.push(resultRow('', fmt(r.wert / toBase('laenge', 1, lu) ** 2), `${lu}²`));
          return zeilen.join('');
        }
        const zeilen = [resultRow(r.label, fmt(r.wert), 'm³', r.haupt)];
        if (r.haupt) zeilen.push(resultRow('', fmt(r.wert * 1000), 'Liter'));
        return zeilen.join('');
      })
      .join('');
  }

  function aktualisiere() {
    root.querySelector('#erg').innerHTML = ergebnis();
    speichern(KEY, s);
  }

  function zeichne() {
    const form = findeForm(s.formId);
    root.innerHTML = `
      <section class="card">
        ${segmented('gruppe', gruppe(), [
          { value: 'flaeche', label: 'Flächen' },
          { value: 'koerper', label: 'Körper' },
        ])}
        ${auswahl()}
      </section>
      <section class="card">
        <div class="sketch-head"><svg class="sketch" viewBox="0 0 120 80" aria-hidden="true">${SKIZZEN[form.id] ?? ''}</svg>
          <h2>${esc(form.name)}</h2></div>
        ${eingaben(form)}
      </section>
      <section class="card result" id="erg" aria-live="polite"></section>`;
    aktualisiere();
  }

  root.addEventListener('input', (e) => {
    const n = e.target.name;
    if (!n?.startsWith('w.')) return;
    (s.werte[s.formId] ??= {})[n.slice(2)] = e.target.value;
    aktualisiere();
  });
  root.addEventListener('change', (e) => {
    if (e.target.name === 'lUnit') {
      s.lUnit = e.target.value;
      zeichne();
    }
  });
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-form]');
    if (f) {
      s.formId = f.dataset.form;
      zeichne();
      return;
    }
    const g = e.target.closest('[data-set="gruppe"]');
    if (g && g.dataset.value !== gruppe()) {
      s.formId = g.dataset.value === 'koerper' ? KOERPER[0].id : FLAECHEN[0].id;
      zeichne();
    }
  });

  zeichne();
}
