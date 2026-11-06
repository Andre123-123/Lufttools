// Firmendaten: werden ausschließlich auf dem Gerät gespeichert (localStorage)
// und per JSON-Datei exportiert/importiert. Sie gehören NICHT ins Repository.

import { laden, speichern, neueId } from '../ui/dom.js';

const KEY = 'lt.firmendaten';
export const FORMAT = 'lufttools-firmendaten';
export const VERSION = 1;

/** Beschreibung der Datenbereiche (wird auch für die Bearbeitungsmasken genutzt). */
export const BEREICHE = {
  materialien: {
    titel: 'Materialien',
    einzahl: 'Material',
    hinweis: 'Absolute Rauheit k für gerade Leitungen.',
    felder: [
      { key: 'name', label: 'Bezeichnung', typ: 'text', pflicht: true },
      { key: 'k_mm', label: 'Rauheit k', typ: 'zahl', einheit: 'mm', pflicht: true },
      { key: 'bemerkung', label: 'Bemerkung', typ: 'text' },
    ],
    kurz: (e) => `k = ${String(e.k_mm).replace('.', ',')} mm`,
  },
  zeta: {
    titel: 'ζ-Werte',
    einzahl: 'Formteil',
    hinweis: 'Widerstandsbeiwerte für Formteile (bezogen auf die Geschwindigkeit im Anschlussquerschnitt).',
    felder: [
      { key: 'name', label: 'Bezeichnung', typ: 'text', pflicht: true },
      { key: 'kategorie', label: 'Kategorie', typ: 'text', placeholder: 'z. B. Bögen, T-Stücke, Gitter' },
      { key: 'zeta', label: 'ζ-Wert', typ: 'zahl', einheit: '–', pflicht: true },
      { key: 'bemerkung', label: 'Bemerkung / Quelle', typ: 'text' },
    ],
    kurz: (e) => `ζ = ${String(e.zeta).replace('.', ',')}`,
  },
  komponenten: {
    titel: 'Komponenten',
    einzahl: 'Komponente',
    hinweis: 'Bauteile mit bekanntem Druckverlust, z. B. Filter, Schalldämpfer, Klappen. Mit Nennvolumenstrom wird quadratisch umgerechnet.',
    felder: [
      { key: 'name', label: 'Bezeichnung', typ: 'text', pflicht: true },
      { key: 'kategorie', label: 'Kategorie', typ: 'text', placeholder: 'z. B. Filter, Schalldämpfer' },
      { key: 'dp_pa', label: 'Druckverlust Δp_N', typ: 'zahl', einheit: 'Pa', pflicht: true },
      { key: 'v_nenn_m3h', label: 'bei Volumenstrom V̇_N', typ: 'zahl', einheit: 'm³/h', hint: 'leer = konstanter Druckverlust' },
      { key: 'bemerkung', label: 'Bemerkung', typ: 'text' },
    ],
    kurz: (e) =>
      `Δp = ${String(e.dp_pa).replace('.', ',')} Pa` + (e.v_nenn_m3h ? ` bei ${String(e.v_nenn_m3h).replace('.', ',')} m³/h` : ''),
  },
};

const RICHTWERT = 'Richtwert – bitte prüfen';

/** Allgemeine Startwerte (keine Firmendaten). */
export function standardDaten() {
  return {
    format: FORMAT,
    version: VERSION,
    stand: null,
    materialien: [
      { id: 'mat-verzinkt', name: 'Stahlblech verzinkt', k_mm: 0.15, bemerkung: RICHTWERT },
      { id: 'mat-edelstahl', name: 'Edelstahl', k_mm: 0.05, bemerkung: RICHTWERT },
      { id: 'mat-alu', name: 'Aluminium', k_mm: 0.05, bemerkung: RICHTWERT },
      { id: 'mat-kunststoff', name: 'Kunststoff (PVC, PP, PE)', k_mm: 0.01, bemerkung: RICHTWERT },
      { id: 'mat-flex', name: 'Flexschlauch (gewellt)', k_mm: 1.5, bemerkung: RICHTWERT },
      { id: 'mat-mauerwerk', name: 'Mauerwerk / Beton (Schacht)', k_mm: 3, bemerkung: RICHTWERT },
    ],
    zeta: [],
    komponenten: [],
  };
}

let cache = null;

export function holeFirmendaten() {
  if (!cache) cache = normalisiere(laden(KEY, null) ?? standardDaten());
  return cache;
}

export function speichereFirmendaten(daten) {
  daten.stand = new Date().toISOString();
  cache = daten;
  return speichern(KEY, daten);
}

/** Übernimmt importierte Daten unverändert (Stand der Datei bleibt erhalten). */
export function uebernehmeImport(daten) {
  cache = daten;
  return speichern(KEY, daten);
}

export function zuruecksetzen() {
  cache = standardDaten();
  speichern(KEY, cache);
  return cache;
}

function zahl(x) {
  if (x === '' || x === null || x === undefined) return null;
  const n = typeof x === 'number' ? x : Number(String(x).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function normalisiere(d) {
  const out = { format: FORMAT, version: VERSION, stand: d.stand ?? null };
  for (const [bereich, def] of Object.entries(BEREICHE)) {
    const liste = Array.isArray(d[bereich]) ? d[bereich] : [];
    out[bereich] = liste
      .filter((e) => e && typeof e === 'object')
      .map((e) => {
        const n = { id: String(e.id ?? neueId()) };
        for (const f of def.felder) n[f.key] = f.typ === 'zahl' ? zahl(e[f.key]) : String(e[f.key] ?? '');
        return n;
      })
      .filter((e) => def.felder.every((f) => !f.pflicht || (e[f.key] !== null && e[f.key] !== '')));
  }
  return out;
}

/** Prüft und normalisiert eine importierte Datei. Wirft bei falschem Format. */
export function parseImport(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist keine gültige JSON-Datei.');
  }
  if (!d || d.format !== FORMAT) throw new Error('Die Datei enthält keine Lufttools-Firmendaten.');
  if (d.version > VERSION) throw new Error('Die Datei stammt aus einer neueren App-Version. Bitte App aktualisieren.');
  const n = normalisiere(d);
  n.stand = d.stand ?? null;
  return n;
}

export function zuJSON(daten) {
  return JSON.stringify({ ...daten, format: FORMAT, version: VERSION }, null, 2);
}

export function anzahl(daten) {
  return Object.keys(BEREICHE).reduce((s, b) => s + daten[b].length, 0);
}
