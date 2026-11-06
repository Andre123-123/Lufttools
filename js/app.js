// App-Shell: Startseite, Navigation (Hash-Routing), Service Worker.
// Neue Tools: Eintrag in TOOLS ergänzen + Datei in js/tools/ anlegen + in sw.js eintragen.

import { esc, toast } from './ui/dom.js';

export const APP_VERSION = '1.2.0';

const ICON = {
  umrechner: '<path d="M4 9h13l-3-3M20 15H7l3 3"/>',
  druckverlust: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  geometrie: '<rect x="3" y="11" width="9" height="9"/><circle cx="16.5" cy="7.5" r="4.5"/>',
  firmendaten: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
};

const TOOLS = [
  { id: 'umrechner', titel: 'Umrechner', text: 'Volumenstrom · Geschwindigkeit · Querschnitt', laden: () => import('./tools/umrechner.js') },
  { id: 'druckverlust', titel: 'Druckverlust', text: 'Kanal, Rohr, Formteile (ζ), Komponenten', laden: () => import('./tools/druckverlust.js') },
  { id: 'geometrie', titel: 'Geometrie', text: 'Flächen und Volumen', laden: () => import('./tools/geometrie.js') },
  { id: 'firmendaten', titel: 'Firmendaten', text: 'ζ-Werte, Materialien, Komponenten', laden: () => import('./tools/firmendaten.js'), sekundaer: true },
];

const view = document.getElementById('view');
const titelEl = document.getElementById('title');
const zurueck = document.getElementById('back');

const svg = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[id] ?? ''}</svg>`;

function startseite() {
  titelEl.textContent = 'Lufttools';
  zurueck.hidden = true;
  document.title = 'Lufttools';
  const kachel = (t) => `<a class="tile${t.sekundaer ? ' secondary' : ''}" href="#/${t.id}">
      <span class="tile-icon">${svg(t.id)}</span>
      <span class="tile-text"><b>${esc(t.titel)}</b><small>${esc(t.text)}</small></span>
      <span class="tile-arrow" aria-hidden="true">›</span></a>`;
  view.innerHTML = `<div class="home">
    <section class="hero">
      <h2>Strömungstechnische Rechenhilfen</h2>
      <p>Schnell rechnen auf der Baustelle, im Technikraum und im Büro.</p>
      <svg class="hero-deko" viewBox="0 0 240 120" aria-hidden="true">
        <path d="M10 40 C60 10 100 70 150 40 S220 10 236 24"/><path d="M10 72 C60 42 100 102 150 72 S220 42 236 56"/>
        <path d="M10 104 C50 84 80 112 120 102"/></svg>
    </section>
    <nav class="tiles main">${TOOLS.filter((t) => !t.sekundaer).map(kachel).join('')}</nav>
    <h3 class="section-head">Daten</h3>
    <nav class="tiles">${TOOLS.filter((t) => t.sekundaer).map(kachel).join('')}</nav>
    <p class="footer-note">Lufttools · Version ${APP_VERSION}<br>Ergebnisse sind Rechenhilfen und ersetzen keine Fachplanung.</p></div>`;
}

async function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const tool = TOOLS.find((t) => t.id === id);
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  document.body.dataset.view = tool ? tool.id : 'home';
  if (!tool) {
    startseite();
  } else {
    titelEl.textContent = tool.titel;
    document.title = `${tool.titel} – Lufttools`;
    zurueck.hidden = false;
    // Neuer Container je Aufruf, damit Event-Listener nicht doppelt hängen
    const container = document.createElement('div');
    container.className = 'tool';
    view.replaceChildren(container);
    try {
      const mod = await tool.laden();
      mod.render(container);
    } catch (err) {
      console.error(err);
      container.innerHTML = `<section class="card"><p>Das Tool konnte nicht geladen werden.</p><pre class="muted">${esc(err.message)}</pre></section>`;
    }
  }
  window.scrollTo(0, 0);
}

zurueck.addEventListener('click', () => { location.hash = '#/'; });
window.addEventListener('hashchange', route);
route();

// ---- Offline / Updates ----

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const zeigeUpdate = (w) =>
      toast('Neue Version verfügbar', { aktion: 'Aktualisieren', beiAktion: () => w.postMessage('skipWaiting'), dauer: 0 });
    if (reg.waiting && navigator.serviceWorker.controller) zeigeUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) zeigeUpdate(w);
      });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  });
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen) return;
    neuGeladen = true;
    location.reload();
  });
}

// Speicher als dauerhaft markieren (verhindert automatisches Löschen durch den Browser)
navigator.storage?.persist?.().catch(() => {});

// ---- Hell / Dunkel ----

const themeBtn = document.getElementById('theme');
const systemDunkel = matchMedia('(prefers-color-scheme: dark)');
const istDunkel = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : systemDunkel.matches;
};
function themeAnzeigen() {
  const dunkel = istDunkel();
  document.documentElement.toggleAttribute('data-dark', dunkel);
  themeBtn.setAttribute('aria-label', dunkel ? 'Helles Design' : 'Dunkles Design');
  themeBtn.title = themeBtn.getAttribute('aria-label');
  document.querySelector('meta[name="theme-color"]').content = dunkel ? '#0b4fa8' : '#0057b8';
}
themeBtn.addEventListener('click', () => {
  const neu = istDunkel() ? 'light' : 'dark';
  document.documentElement.dataset.theme = neu;
  try { localStorage.setItem('lt.theme', neu); } catch {}
  themeAnzeigen();
});
systemDunkel.addEventListener('change', themeAnzeigen);
themeAnzeigen();
