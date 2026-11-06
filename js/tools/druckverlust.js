// Druckverlustrechner: Strang aus geraden Leitungen, Formteilen (ζ) und Komponenten (Δp)

import { parseNum, toBase } from '../core/units.js';
import { luftzustand } from '../core/air.js';
import { geradeLeitung, formteil, komponente } from '../core/pressure.js';
import { holeFirmendaten } from '../data/firmendaten.js';
import {
  numField, textField, selectField, unitSelect, segmented, resultRow, fmt, fmtFix, esc, el,
  laden, speichern, neueId, dialog, toast, teilenText, zuEingabe,
} from '../ui/dom.js';

const KEY = 'lt.dp.aktuell';
const KEY_GESPEICHERT = 'lt.dp.gespeichert';

const TYPEN = {
  gerade: { label: 'Gerade Leitung', kurz: 'Leitung', icon: '━' },
  zeta: { label: 'Formteil (ζ)', kurz: 'Formteil', icon: 'ζ' },
  komponente: { label: 'Komponente (Δp)', kurz: 'Komponente', icon: 'Δp' },
};

const neuerStrang = () => ({ name: 'Strang 1', V: '1000', VUnit: 'm³/h', t: '20', p: '1013,25', elemente: [] });

function neuesElement(typ, vorlage) {
  const q = vorlage && vorlage.typ !== 'komponente'
    ? { form: vorlage.form, d: vorlage.d, a: vorlage.a, b: vorlage.b }
    : { form: 'rund', d: '200', a: '300', b: '200' };
  const basis = { id: neueId(), typ, titel: '', V: '' };
  if (typ === 'gerade') {
    const mat = holeFirmendaten().materialien[0];
    return { ...basis, ...q, L: '10', materialId: mat?.id ?? '', k: mat ? zuEingabe(mat.k_mm) : '0,15' };
  }
  if (typ === 'zeta') return { ...basis, ...q, zeta: '', zetaId: '', n: '1' };
  return { ...basis, dp: '', VN: '', komponenteId: '', n: '1' };
}

// ---- Rechnen ----

function luftAus(s) {
  return luftzustand(parseNum(s.t), toBase('druck', parseNum(s.p), 'hPa'));
}

function volumenstrom(s, el) {
  const txt = String(el.V ?? '').trim();
  return toBase('volumenstrom', parseNum(txt || s.V), s.VUnit);
}

function querschnittSI(el) {
  return el.form === 'rechteck'
    ? { form: 'rechteck', a: parseNum(el.a) / 1000, b: parseNum(el.b) / 1000 }
    : { form: 'rund', d: parseNum(el.d) / 1000 };
}

const positiv = (x) => Number.isFinite(x) && x > 0;

/** Rechnet ein Element. Liefert {dp, ...} oder {fehler}. */
function rechneElement(s, el, luft) {
  const V = volumenstrom(s, el);
  if (!positiv(V)) return { fehler: 'Volumenstrom fehlt' };
  if (!positiv(luft.rho) || !positiv(luft.nu)) return { fehler: 'Luftzustand ungültig' };
  if (el.typ === 'komponente') {
    const dpN = parseNum(el.dp);
    const VN = toBase('volumenstrom', parseNum(el.VN), 'm³/h');
    const n = parseNum(el.n) || 1;
    if (!(dpN >= 0)) return { fehler: 'Δp fehlt' };
    return { V, ...komponente({ V, dpN, VN: positiv(VN) ? VN : 0, n }) };
  }
  const q = querschnittSI(el);
  if (!Object.values(q).filter((x) => typeof x === 'number').every(positiv)) return { fehler: 'Abmessungen fehlen' };
  if (el.typ === 'gerade') {
    const L = parseNum(el.L);
    const k = parseNum(el.k) / 1000;
    if (!(L >= 0)) return { fehler: 'Länge fehlt' };
    if (!(k >= 0)) return { fehler: 'Rauheit fehlt' };
    return { V, ...geradeLeitung({ V, querschnitt: q, L, k }, luft) };
  }
  const zeta = parseNum(el.zeta);
  const n = parseNum(el.n) || 1;
  if (!Number.isFinite(zeta)) return { fehler: 'ζ-Wert fehlt' };
  return { V, ...formteil({ V, querschnitt: q, zeta, n }, luft) };
}

function rechneStrang(s) {
  const luft = luftAus(s);
  const ergebnisse = s.elemente.map((e) => rechneElement(s, e, luft));
  const summe = ergebnisse.reduce((acc, r) => acc + (Number.isFinite(r.dp) ? r.dp : 0), 0);
  const fehler = ergebnisse.filter((r) => r.fehler).length;
  return { luft, ergebnisse, summe, fehler };
}

// ---- Texte ----

const qText = (e) => (e.form === 'rechteck' ? `${e.a || '?'} × ${e.b || '?'} mm` : `Ø ${e.d || '?'} mm`);

function beschreibung(e) {
  const n = parseNum(e.n);
  const anzahl = n > 1 ? ` · ${fmt(n)}×` : '';
  const vAbw = String(e.V ?? '').trim() ? ` · V̇ = ${e.V}` : '';
  if (e.typ === 'gerade') return `${qText(e)} · L = ${e.L || '?'} m · k = ${e.k || '?'} mm${vAbw}`;
  if (e.typ === 'zeta') return `${qText(e)} · ζ = ${e.zeta || '?'}${anzahl}${vAbw}`;
  return `Δp<sub>N</sub> = ${e.dp || '?'} Pa${e.VN ? ` bei ${e.VN} m³/h` : ' (konstant)'}${anzahl}${vAbw}`;
}

const titel = (e) => e.titel?.trim() || TYPEN[e.typ].label;

function zusammenfassung(s, r) {
  const zeilen = [
    `Druckverlust – ${s.name || 'Strang'}`,
    `Volumenstrom: ${s.V} ${s.VUnit} · Luft ${s.t} °C / ${s.p} hPa (ρ = ${fmt(r.luft.rho)} kg/m³)`,
    '',
  ];
  s.elemente.forEach((e, i) => {
    const er = r.ergebnisse[i];
    const det = beschreibung(e).replace(/<\/?sub>/g, '');
    const w = er.fehler ? er.fehler : `${er.v ? `v = ${fmt(er.v, 3)} m/s · ` : ''}Δp = ${fmtFix(er.dp, 1)} Pa`;
    zeilen.push(`${i + 1}. ${titel(e)} (${det}): ${w}`);
  });
  zeilen.push('', `Summe Δp = ${fmtFix(r.summe, 1)} Pa`);
  return zeilen.join('\n');
}

// ---- Ansicht ----

export function render(root) {
  let s = { ...neuerStrang(), ...laden(KEY, {}) };
  const sichere = () => speichern(KEY, s);

  function strangFormular() {
    return `<section class="card">
      <div class="row-between"><h2 class="card-title">Strang</h2>
        <div class="btn-row">
          <button type="button" class="btn small" data-akt="neu">Neu</button>
          <button type="button" class="btn small" data-akt="laden">Öffnen</button>
          <button type="button" class="btn small" data-akt="speichern">Speichern</button>
        </div></div>
      ${textField('name', 'Bezeichnung', s.name)}
      <div class="grid2">
        ${numField('V', 'Volumenstrom V̇', s.V, { unitHtml: unitSelect('VUnit', 'volumenstrom', s.VUnit) })}
        <div class="grid2 tight">
          ${numField('t', 'Temperatur', s.t, { unit: '°C' })}
          ${numField('p', 'Luftdruck', s.p, { unit: 'hPa' })}
        </div>
      </div>
      <p class="note" id="luft"></p>
    </section>`;
  }

  function liste() {
    const r = rechneStrang(s);
    root.querySelector('#luft').innerHTML = Number.isFinite(r.luft.rho)
      ? `ρ = ${fmt(r.luft.rho)} kg/m³ · ν = ${fmt(r.luft.nu * 1e6)}·10⁻⁶ m²/s`
      : 'Bitte Temperatur und Luftdruck prüfen.';

    const box = root.querySelector('#elemente');
    if (!s.elemente.length) {
      box.innerHTML = `<div class="empty">Noch keine Elemente.<br>Füge unten gerade Leitungen, Formteile oder Komponenten hinzu.</div>`;
    } else {
      box.innerHTML = s.elemente
        .map((e, i) => {
          const er = r.ergebnisse[i];
          const wert = er.fehler
            ? `<span class="warn">${esc(er.fehler)}</span>`
            : `<span><b>${fmtFix(er.dp, 1)}</b> Pa</span>`;
          const v = !er.fehler && er.v ? `<small>${fmt(er.v, 3)} m/s</small>` : '';
          return `<article class="el-card" data-idx="${i}">
            <button type="button" class="el-main" data-akt="bearbeiten" data-idx="${i}">
              <span class="el-icon t-${e.typ}">${TYPEN[e.typ].icon}</span>
              <span class="el-text"><span class="el-title">${i + 1}. ${esc(titel(e))}</span>
                <span class="el-desc">${beschreibung(e)}</span></span>
              <span class="el-value">${wert}${v}</span>
            </button>
            <div class="el-actions">
              <button type="button" class="icon-btn" data-akt="hoch" data-idx="${i}" aria-label="Nach oben"${i === 0 ? ' disabled' : ''}>↑</button>
              <button type="button" class="icon-btn" data-akt="runter" data-idx="${i}" aria-label="Nach unten"${i === s.elemente.length - 1 ? ' disabled' : ''}>↓</button>
              <button type="button" class="icon-btn" data-akt="kopie" data-idx="${i}" aria-label="Duplizieren">⧉</button>
              <button type="button" class="icon-btn" data-akt="loeschen" data-idx="${i}" aria-label="Löschen">🗑</button>
            </div>
          </article>`;
        })
        .join('');
    }
    root.querySelector('#summe').innerHTML = `<span>Σ Δp${r.fehler ? ` <small class="warn">(${r.fehler} unvollständig)</small>` : ''}</span>
      <b>${fmtFix(r.summe, 1)} Pa</b>`;
    sichere();
  }

  function zeichne() {
    root.innerHTML = `
      ${strangFormular()}
      <div id="elemente" class="el-list"></div>
      <div class="add-row">
        ${Object.entries(TYPEN)
          .map(([t, d]) => `<button type="button" class="btn add" data-akt="neu-el" data-typ="${t}"><span class="el-icon t-${t}">${d.icon}</span>${d.label}</button>`)
          .join('')}
      </div>
      <div class="sum-bar"><div id="summe" class="sum-value"></div>
        <button type="button" class="btn primary small" data-akt="teilen">Teilen</button></div>`;
    liste();
  }

  // ---- Element-Dialog ----

  function elementDialog(idx, istNeu) {
    const entwurf = { ...(istNeu ? idx : s.elemente[idx]) };
    const fd = holeFirmendaten();
    const form = el('<div class="el-form"></div>');

    const felder = () => {
      const q = entwurf.typ === 'komponente' ? '' : `
        ${segmented('form', entwurf.form, [{ value: 'rund', label: 'Rund' }, { value: 'rechteck', label: 'Rechteckig' }], 'Querschnitt')}
        <div class="grid2">${entwurf.form === 'rechteck'
          ? numField('a', 'Seite a', entwurf.a, { unit: 'mm' }) + numField('b', 'Seite b', entwurf.b, { unit: 'mm' })
          : numField('d', 'Durchmesser d', entwurf.d, { unit: 'mm' })}</div>`;
      let spezifisch = '';
      if (entwurf.typ === 'gerade') {
        spezifisch = `
          ${numField('L', 'Länge L', entwurf.L, { unit: 'm' })}
          ${selectField('materialId', 'Material', entwurf.materialId, [
            ...fd.materialien.map((m) => ({ value: m.id, label: `${m.name} (k = ${zuEingabe(m.k_mm)} mm)` })),
            { value: '', label: 'Eigene Rauheit …' },
          ])}
          ${numField('k', 'Rauheit k', entwurf.k, { unit: 'mm', readonly: !!entwurf.materialId })}`;
      } else if (entwurf.typ === 'zeta') {
        spezifisch = `
          ${fd.zeta.length ? selectField('zetaId', 'Aus Firmendaten', entwurf.zetaId, [
            { value: '', label: '– manuell eingeben –' },
            ...[...fd.zeta].sort((a, b) => (a.kategorie || '').localeCompare(b.kategorie || '') || a.name.localeCompare(b.name))
              .map((z) => ({ value: z.id, label: `${z.name} (ζ = ${zuEingabe(z.zeta)})`, group: z.kategorie || 'Ohne Kategorie' })),
          ]) : '<p class="note">Tipp: ζ-Werte lassen sich unter „Firmendaten“ hinterlegen.</p>'}
          <div class="grid2">
            ${numField('zeta', 'ζ-Wert', entwurf.zeta, { unit: '–' })}
            ${numField('n', 'Anzahl', entwurf.n, { unit: 'Stk.' })}
          </div>`;
      } else {
        spezifisch = `
          ${fd.komponenten.length ? selectField('komponenteId', 'Aus Firmendaten', entwurf.komponenteId, [
            { value: '', label: '– manuell eingeben –' },
            ...fd.komponenten.map((k) => ({ value: k.id, label: k.name, group: k.kategorie || 'Ohne Kategorie' })),
          ]) : '<p class="note">Tipp: Komponenten lassen sich unter „Firmendaten“ hinterlegen.</p>'}
          <div class="grid2">
            ${numField('dp', 'Druckverlust Δp<sub>N</sub>', entwurf.dp, { unit: 'Pa' })}
            ${numField('VN', 'bei V̇<sub>N</sub>', entwurf.VN, { unit: 'm³/h', hint: 'leer = konstant' })}
          </div>
          ${numField('n', 'Anzahl', entwurf.n, { unit: 'Stk.' })}`;
      }
      return `
        ${textField('titel', 'Bezeichnung (optional)', entwurf.titel, { placeholder: TYPEN[entwurf.typ].label })}
        ${q}${spezifisch}
        ${numField('V', 'Abweichender Volumenstrom', entwurf.V, { unit: s.VUnit, placeholder: `Strang: ${s.V}`, hint: 'leer = Volumenstrom des Strangs' })}
        <div class="result mini" id="vorschau"></div>`;
    };

    const vorschau = () => {
      const r = rechneElement(s, entwurf, luftAus(s));
      const box = form.querySelector('#vorschau');
      if (r.fehler) { box.innerHTML = `<p class="muted">${esc(r.fehler)}</p>`; return; }
      const z = [];
      if (r.v !== undefined) z.push(resultRow('Geschwindigkeit v', fmt(r.v, 3), 'm/s'));
      if (r.pd !== undefined) z.push(resultRow('Dyn. Druck p<sub>d</sub>', fmt(r.pd, 3), 'Pa'));
      if (r.Re !== undefined) {
        z.push(resultRow('Reynolds-Zahl Re', fmt(r.Re, 3), ''));
        z.push(resultRow('Reibungszahl λ', fmt(r.lambda, 3), ''));
        z.push(resultRow('Druckgefälle R', fmt(r.R, 3), 'Pa/m'));
      }
      if (r.faktor !== undefined && r.faktor !== 1) z.push(resultRow('Umrechnung (V̇/V̇<sub>N</sub>)²', fmt(r.faktor, 3), ''));
      z.push(resultRow('Druckverlust Δp', fmtFix(r.dp, 1), 'Pa', true));
      box.innerHTML = z.join('');
    };

    const neuZeichnen = () => { form.innerHTML = felder(); vorschau(); };

    form.addEventListener('input', (e) => {
      const n = e.target.name;
      if (!n || e.target.tagName === 'SELECT') return;
      entwurf[n] = e.target.value;
      if (n === 'zeta') entwurf.zetaId = '';
      if (n === 'dp' || n === 'VN') entwurf.komponenteId = '';
      vorschau();
    });
    form.addEventListener('change', (e) => {
      const n = e.target.name;
      if (e.target.tagName !== 'SELECT') return;
      entwurf[n] = e.target.value;
      if (n === 'materialId' && entwurf.materialId) {
        const m = fd.materialien.find((x) => x.id === entwurf.materialId);
        if (m) entwurf.k = zuEingabe(m.k_mm);
      }
      if (n === 'zetaId' && entwurf.zetaId) {
        const z = fd.zeta.find((x) => x.id === entwurf.zetaId);
        if (z) { entwurf.zeta = zuEingabe(z.zeta); entwurf.titel = z.name; }
      }
      if (n === 'komponenteId' && entwurf.komponenteId) {
        const k = fd.komponenten.find((x) => x.id === entwurf.komponenteId);
        if (k) { entwurf.dp = zuEingabe(k.dp_pa); entwurf.VN = k.v_nenn_m3h ? zuEingabe(k.v_nenn_m3h) : ''; entwurf.titel = k.name; }
      }
      neuZeichnen();
    });
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-set]');
      if (!b) return;
      entwurf[b.dataset.set] = b.dataset.value;
      neuZeichnen();
    });

    neuZeichnen();
    dialog({
      titel: istNeu ? `${TYPEN[entwurf.typ].label} hinzufügen` : TYPEN[entwurf.typ].label,
      inhalt: form,
      speichern: istNeu ? 'Hinzufügen' : 'Übernehmen',
      loeschen: !istNeu,
      beiSpeichern: () => {
        if (istNeu) s.elemente.push(entwurf);
        else s.elemente[idx] = entwurf;
        liste();
      },
      beiLoeschen: () => loescheElement(idx),
    });
  }

  function loescheElement(i) {
    const [weg] = s.elemente.splice(i, 1);
    liste();
    toast(`„${titel(weg)}“ gelöscht`, {
      aktion: 'Rückgängig',
      beiAktion: () => { s.elemente.splice(i, 0, weg); liste(); },
      dauer: 5000,
    });
  }

  // ---- Gespeicherte Stränge ----

  function speichernDialog() {
    const gespeichert = laden(KEY_GESPEICHERT, {});
    const inhalt = el(`<div>${textField('sname', 'Name', s.name)}
      <p class="note">Gespeicherte Stränge liegen nur auf diesem Gerät.</p></div>`);
    dialog({
      titel: 'Strang speichern', inhalt, speichern: 'Speichern',
      beiSpeichern: () => {
        const name = inhalt.querySelector('[name=sname]').value.trim();
        if (!name) { toast('Bitte einen Namen eingeben'); return false; }
        if (gespeichert[name] && !confirm(`„${name}“ überschreiben?`)) return false;
        s.name = name;
        gespeichert[name] = { ...s, gespeichertAm: new Date().toISOString() };
        speichern(KEY_GESPEICHERT, gespeichert);
        root.querySelector('[name=name]').value = name;
        sichere();
        toast(`„${name}“ gespeichert`);
      },
    });
  }

  function ladenDialog() {
    const gespeichert = laden(KEY_GESPEICHERT, {});
    const namen = Object.keys(gespeichert).sort((a, b) => a.localeCompare(b, 'de'));
    const inhalt = el(`<div class="saved-list">${namen.length
      ? namen.map((n) => {
        const g = gespeichert[n];
        const datum = g.gespeichertAm ? new Date(g.gespeichertAm).toLocaleDateString('de-DE') : '';
        return `<div class="saved-item">
          <button type="button" class="saved-open" data-name="${esc(n)}"><b>${esc(n)}</b>
            <small>${g.elemente.length} Elemente · ${esc(g.V)} ${esc(g.VUnit)} · ${datum}</small></button>
          <button type="button" class="icon-btn" data-del="${esc(n)}" aria-label="Löschen">🗑</button></div>`;
      }).join('')
      : '<p class="muted">Noch keine gespeicherten Stränge.</p>'}</div>`);
    const d = dialog({ titel: 'Strang öffnen', inhalt, speichern: null });
    inhalt.addEventListener('click', (e) => {
      const o = e.target.closest('[data-name]');
      if (o) {
        const { gespeichertAm, ...rest } = gespeichert[o.dataset.name];
        s = { ...neuerStrang(), ...structuredClone(rest) };
        d.close();
        zeichne();
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del && confirm(`„${del.dataset.del}“ löschen?`)) {
        delete gespeichert[del.dataset.del];
        speichern(KEY_GESPEICHERT, gespeichert);
        del.closest('.saved-item').remove();
      }
    });
  }

  // ---- Ereignisse ----

  root.addEventListener('input', (e) => {
    if (e.target.closest('dialog')) return;
    const n = e.target.name;
    if (!n || !(n in s)) return;
    s[n] = e.target.value;
    liste();
  });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-akt]');
    if (!b) return;
    const i = Number(b.dataset.idx);
    switch (b.dataset.akt) {
      case 'neu-el': elementDialog(neuesElement(b.dataset.typ, s.elemente.findLast((x) => x.typ !== 'komponente')), true); break;
      case 'bearbeiten': elementDialog(i, false); break;
      case 'hoch': [s.elemente[i - 1], s.elemente[i]] = [s.elemente[i], s.elemente[i - 1]]; liste(); break;
      case 'runter': [s.elemente[i + 1], s.elemente[i]] = [s.elemente[i], s.elemente[i + 1]]; liste(); break;
      case 'kopie': s.elemente.splice(i + 1, 0, { ...s.elemente[i], id: neueId() }); liste(); break;
      case 'loeschen': loescheElement(i); break;
      case 'teilen': teilenText(`Druckverlust ${s.name}`, zusammenfassung(s, rechneStrang(s))); break;
      case 'speichern': speichernDialog(); break;
      case 'laden': ladenDialog(); break;
      case 'neu':
        if (!s.elemente.length || confirm('Neuen Strang beginnen? Nicht gespeicherte Änderungen gehen verloren.')) {
          s = neuerStrang();
          zeichne();
        }
        break;
    }
  });

  zeichne();
}
