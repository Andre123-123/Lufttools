// Einheiten-Umrechnung. Alle Faktoren beziehen sich auf die SI-Basiseinheit
// der jeweiligen Kategorie (Wert_SI = Wert * Faktor).

export const UNITS = {
  volumenstrom: { 'm³/h': 1 / 3600, 'm³/s': 1, 'm³/min': 1 / 60, 'l/s': 1e-3 },
  geschwindigkeit: { 'm/s': 1, 'm/min': 1 / 60, 'km/h': 1 / 3.6 },
  laenge: { mm: 1e-3, cm: 1e-2, m: 1 },
  flaeche: { 'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1 },
  volumen: { 'cm³': 1e-6, 'l': 1e-3, 'm³': 1 },
  druck: { Pa: 1, kPa: 1e3, mbar: 100, hPa: 100, mmWS: 9.80665 },
};

export function toBase(kategorie, wert, einheit) {
  const f = UNITS[kategorie]?.[einheit];
  if (f === undefined) throw new Error(`Unbekannte Einheit ${einheit} (${kategorie})`);
  return wert * f;
}

export function fromBase(kategorie, wert, einheit) {
  const f = UNITS[kategorie]?.[einheit];
  if (f === undefined) throw new Error(`Unbekannte Einheit ${einheit} (${kategorie})`);
  return wert / f;
}

/**
 * Liest eine Zahl in deutscher oder englischer Schreibweise.
 * "1.234,5" -> 1234.5, "0,15" -> 0.15, "1e-3" -> 0.001, "" -> NaN
 */
export function parseNum(input) {
  if (typeof input === 'number') return input;
  if (input === null || input === undefined) return NaN;
  let s = String(input).trim().replace(/\s/g, '').replace(/[’']/g, '');
  if (s === '') return NaN;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}
