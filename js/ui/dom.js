// Kleine UI-Helfer ohne Framework.

import { UNITS } from '../core/units.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nfCache = new Map();
function nf(digits) {
  if (!nfCache.has(digits)) {
    nfCache.set(digits, new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 }));
  }
  return nfCache.get(digits);
}

/** Zahl mit sinnvoller Stellenzahl (ca. 4 signifikante Stellen), deutsches Format. */
export function fmt(x, sig = 4) {
  if (!Number.isFinite(x)) return '–';
  if (x === 0) return '0';
  const mag = Math.floor(Math.log10(Math.abs(x)));
  const digits = Math.min(10, Math.max(0, sig - 1 - mag));
  return nf(digits).format(x);
}

/** Zahl mit fester Nachkommastellenzahl. */
export const fmtFix = (x, d = 1) => (Number.isFinite(x) ? nf(d).format(Number(x.toFixed(d))) : '–');

/** Zahl als Eingabetext (deutsches Komma, ohne Tausenderpunkte). */
export const zuEingabe = (x, sig = 4) => (Number.isFinite(x) ? fmt(x, sig).replace(/\./g, '') : '');

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function unitSelect(name, kategorie, aktuell, nur) {
  const liste = nur ?? Object.keys(UNITS[kategorie]);
  return `<select name="${name}" class="unit-select" aria-label="Einheit">${liste
    .map((u) => `<option${u === aktuell ? ' selected' : ''}>${esc(u)}</option>`)
    .join('')}</select>`;
}

/**
 * Zahlen-Eingabefeld.
 * opts: unit (Text) | unitHtml (z.B. unitSelect), hint, placeholder, readonly
 */
export function numField(name, label, value, opts = {}) {
  const unit = opts.unitHtml ?? (opts.unit ? `<span class="unit">${esc(opts.unit)}</span>` : '');
  return `<label class="field">
    <span class="field-label">${label}</span>
    <span class="field-input">
      <input name="${name}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"
        value="${esc(value)}" placeholder="${esc(opts.placeholder ?? '')}"${opts.readonly ? ' readonly' : ''}>
      ${unit}
    </span>
    ${opts.hint ? `<small class="field-hint">${opts.hint}</small>` : ''}
  </label>`;
}

export function textField(name, label, value, opts = {}) {
  return `<label class="field">
    <span class="field-label">${label}</span>
    <span class="field-input"><input name="${name}" type="text" autocomplete="off" value="${esc(value)}" placeholder="${esc(opts.placeholder ?? '')}"></span>
  </label>`;
}

export function selectField(name, label, value, options) {
  // options: [{value,label,group?}]
  let html = '';
  let gruppe = null;
  for (const o of options) {
    if ((o.group ?? null) !== gruppe) {
      if (gruppe !== null) html += '</optgroup>';
      gruppe = o.group ?? null;
      if (gruppe !== null) html += `<optgroup label="${esc(gruppe)}">`;
    }
    html += `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`;
  }
  if (gruppe !== null) html += '</optgroup>';
  return `<label class="field">
    <span class="field-label">${label}</span>
    <span class="field-input"><select name="${name}">${html}</select></span>
  </label>`;
}

/** Segment-Umschalter. Klick setzt state[key] = value (über data-set / data-value). */
export function segmented(key, value, options, label = '') {
  return `<div class="seg-wrap">${label ? `<span class="field-label">${label}</span>` : ''}
    <div class="seg" role="radiogroup">${options
      .map(
        (o) => `<button type="button" role="radio" aria-checked="${o.value === value}" data-set="${key}" data-value="${esc(o.value)}"
        class="${o.value === value ? 'active' : ''}">${o.label}</button>`
      )
      .join('')}</div></div>`;
}

export function resultRow(label, wert, einheit, haupt = false) {
  return `<div class="result-row${haupt ? ' main' : ''}"><span class="r-label">${label}</span><span class="r-value">${wert}<span class="r-unit">${
    einheit ? ` ${esc(einheit)}` : ''
  }</span></span></div>`;
}

// ---- Speicher (localStorage, fehlertolerant) ----

export function laden(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function speichern(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const neueId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ---- Toast ----

let toastTimer;
export function toast(text, { aktion, beiAktion, dauer = 2600 } = {}) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${esc(text)}</span>${aktion ? `<button type="button">${esc(aktion)}</button>` : ''}`;
  if (aktion) t.querySelector('button').onclick = () => { t.classList.remove('show'); beiAktion?.(); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  if (dauer) toastTimer = setTimeout(() => t.classList.remove('show'), dauer);
}

// ---- Dialog ----

/**
 * Modaler Dialog (Bottom-Sheet auf dem Handy).
 * @param {{titel:string, inhalt:HTMLElement|string, speichern?:string, loeschen?:boolean,
 *          beiSpeichern?:()=>boolean|void, beiLoeschen?:()=>void, beiSchliessen?:()=>void}} o
 */
export function dialog(o) {
  const d = el(`<dialog class="sheet">
    <form method="dialog" class="sheet-inner">
      <header class="sheet-head"><h2>${esc(o.titel)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Schließen">✕</button></header>
      <div class="sheet-body"></div>
      <footer class="sheet-foot">
        ${o.loeschen ? '<button type="button" class="btn danger" data-del>Löschen</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>Abbrechen</button>
        ${o.speichern !== null ? `<button type="submit" class="btn primary">${esc(o.speichern ?? 'Übernehmen')}</button>` : ''}
      </footer>
    </form></dialog>`);
  const body = d.querySelector('.sheet-body');
  if (typeof o.inhalt === 'string') body.innerHTML = o.inhalt;
  else body.append(o.inhalt);

  const schliessen = () => { d.close(); };
  d.addEventListener('close', () => { d.remove(); o.beiSchliessen?.(); });
  d.querySelectorAll('[data-close]').forEach((b) => (b.onclick = schliessen));
  d.querySelector('[data-del]')?.addEventListener('click', () => { o.beiLoeschen?.(); schliessen(); });
  d.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (o.beiSpeichern?.() !== false) schliessen();
  });
  d.addEventListener('click', (e) => { if (e.target === d) schliessen(); });
  document.body.append(d);
  d.showModal();
  return d;
}

/** Teilt Text über das System-Teilen-Menü, sonst Zwischenablage. */
export async function teilenText(titel, text) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titel, text });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('In die Zwischenablage kopiert');
  } catch {
    toast('Teilen nicht möglich');
  }
}
