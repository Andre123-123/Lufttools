// Firmendaten pflegen: Materialien, ζ-Werte, Komponenten. Import/Export als JSON-Datei.

import {
  BEREICHE, holeFirmendaten, speichereFirmendaten, uebernehmeImport, zuruecksetzen, parseImport, zuJSON, anzahl,
} from '../data/firmendaten.js';
import { parseNum } from '../core/units.js';
import { numField, textField, segmented, esc, el, dialog, toast, neueId, zuEingabe, laden, speichern } from '../ui/dom.js';

const KEY_TAB = 'lt.firmendaten.tab';

export function render(root) {
  let tab = laden(KEY_TAB, 'zeta');
  if (!BEREICHE[tab]) tab = 'zeta';
  let suche = '';

  function info() {
    const d = holeFirmendaten();
    const stand = d.stand ? new Date(d.stand).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Standardwerte';
    return `<section class="card">
      <div class="info-line"><span>Stand</span><b>${esc(stand)}</b></div>
      <div class="info-line"><span>Einträge</span><b>${anzahl(d)}</b></div>
      <div class="btn-row wrap">
        <button type="button" class="btn primary" data-akt="export">Exportieren</button>
        <button type="button" class="btn" data-akt="import">Importieren</button>
        <button type="button" class="btn ghost" data-akt="reset">Zurücksetzen</button>
        <input type="file" id="datei" accept=".json,application/json" hidden>
      </div>
      <p class="note">Die Firmendaten werden <b>nur auf diesem Gerät</b> gespeichert, nicht im Internet und nicht im Repository.
      So verteilst du sie im Team: <b>Exportieren</b>, die Datei z. B. in Teams/SharePoint ablegen, auf den anderen Geräten <b>Importieren</b>.</p>
    </section>`;
  }

  function eintraege() {
    const d = holeFirmendaten();
    const def = BEREICHE[tab];
    const q = suche.trim().toLowerCase();
    const liste = d[tab]
      .filter((e) => !q || [e.name, e.kategorie, e.bemerkung].some((x) => String(x ?? '').toLowerCase().includes(q)))
      .sort((a, b) => String(a.kategorie ?? '').localeCompare(String(b.kategorie ?? ''), 'de') || a.name.localeCompare(b.name, 'de'));
    let gruppe = null;
    const html = liste.map((e) => {
      let kopf = '';
      if ('kategorie' in e && (e.kategorie || 'Ohne Kategorie') !== gruppe) {
        gruppe = e.kategorie || 'Ohne Kategorie';
        kopf = `<h3 class="group-head">${esc(gruppe)}</h3>`;
      }
      return `${kopf}<button type="button" class="data-item" data-id="${esc(e.id)}">
        <span><b>${esc(e.name)}</b>${e.bemerkung ? `<small>${esc(e.bemerkung)}</small>` : ''}</span>
        <span class="data-val">${esc(def.kurz(e))}</span></button>`;
    }).join('');
    return html || `<p class="muted">${q ? 'Keine Treffer.' : `Noch keine Einträge. Lege mit „+ ${def.einzahl}“ den ersten an.`}</p>`;
  }

  function zeichne() {
    const def = BEREICHE[tab];
    root.innerHTML = `
      ${info()}
      <section class="card">
        ${segmented('tab', tab, Object.entries(BEREICHE).map(([k, b]) => ({ value: k, label: b.titel })))}
        <p class="note">${esc(def.hinweis)}</p>
        <div class="search-row">
          <input type="search" id="suche" placeholder="Suchen …" value="${esc(suche)}" aria-label="Suchen">
          <button type="button" class="btn primary" data-akt="neu">+ ${esc(def.einzahl)}</button>
        </div>
        <div id="liste" class="data-list">${eintraege()}</div>
      </section>`;
  }

  function bearbeiten(id) {
    const d = holeFirmendaten();
    const def = BEREICHE[tab];
    const vorhanden = d[tab].find((e) => e.id === id);
    const e = vorhanden ? { ...vorhanden } : { id: neueId() };
    const inhalt = el(`<div>${def.felder
      .map((f) => (f.typ === 'zahl'
        ? numField(f.key, f.label, e[f.key] === null || e[f.key] === undefined ? '' : zuEingabe(e[f.key], 6), { unit: f.einheit, hint: f.hint })
        : textField(f.key, f.label, e[f.key] ?? '', { placeholder: f.placeholder })))
      .join('')}</div>`);
    dialog({
      titel: vorhanden ? `${def.einzahl} bearbeiten` : `${def.einzahl} anlegen`,
      inhalt,
      speichern: 'Speichern',
      loeschen: !!vorhanden,
      beiSpeichern: () => {
        for (const f of def.felder) {
          const roh = inhalt.querySelector(`[name="${f.key}"]`).value.trim();
          if (f.typ === 'zahl') {
            const n = roh === '' ? null : parseNum(roh);
            if (roh !== '' && !Number.isFinite(n)) { toast(`„${f.label}“ ist keine gültige Zahl`); return false; }
            e[f.key] = n;
          } else e[f.key] = roh;
          if (f.pflicht && (e[f.key] === null || e[f.key] === '')) { toast(`Bitte „${f.label}“ ausfüllen`); return false; }
        }
        if (vorhanden) Object.assign(vorhanden, e);
        else d[tab].push(e);
        speichereFirmendaten(d);
        zeichne();
      },
      beiLoeschen: () => {
        if (!confirm(`„${vorhanden.name}“ löschen?`)) return;
        d[tab] = d[tab].filter((x) => x.id !== id);
        speichereFirmendaten(d);
        zeichne();
      },
    });
  }

  async function exportieren() {
    const d = holeFirmendaten();
    const datum = new Date().toISOString().slice(0, 10);
    const name = `lufttools-firmendaten-${datum}.json`;
    const datei = new File([zuJSON(d)], name, { type: 'application/json' });
    const mobil = matchMedia('(pointer: coarse)').matches;
    if (mobil && navigator.canShare?.({ files: [datei] })) {
      try {
        await navigator.share({ files: [datei], title: 'Lufttools Firmendaten' });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(datei);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Datei wird heruntergeladen');
  }

  async function importieren(datei) {
    try {
      const neu = parseImport(await datei.text());
      const stand = neu.stand ? new Date(neu.stand).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'unbekannt';
      const text = Object.entries(BEREICHE).map(([k, b]) => `${b.titel}: ${neu[k].length}`).join(', ');
      if (!confirm(`Firmendaten importieren?\n\nStand: ${stand}\n${text}\n\nDie vorhandenen Firmendaten auf diesem Gerät werden ersetzt.`)) return;
      uebernehmeImport(neu);
      zeichne();
      toast('Firmendaten importiert');
    } catch (err) {
      alert(err.message);
    }
  }

  root.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-set="tab"]');
    if (seg) {
      tab = seg.dataset.value;
      suche = '';
      speichern(KEY_TAB, tab);
      zeichne();
      return;
    }
    const item = e.target.closest('[data-id]');
    if (item) { bearbeiten(item.dataset.id); return; }
    const b = e.target.closest('[data-akt]');
    if (!b) return;
    if (b.dataset.akt === 'neu') bearbeiten(null);
    if (b.dataset.akt === 'export') exportieren();
    if (b.dataset.akt === 'import') root.querySelector('#datei').click();
    if (b.dataset.akt === 'reset' && confirm('Alle Firmendaten auf diesem Gerät löschen und die Standardwerte wiederherstellen?\n\nTipp: Vorher exportieren.')) {
      zuruecksetzen();
      zeichne();
      toast('Standardwerte wiederhergestellt');
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'suche') return;
    suche = e.target.value;
    root.querySelector('#liste').innerHTML = eintraege();
  });
  root.addEventListener('change', (e) => {
    if (e.target.id === 'datei' && e.target.files[0]) {
      importieren(e.target.files[0]);
      e.target.value = '';
    }
  });

  zeichne();
}
