# Lufttools

Strömungstechnische Rechenhilfen als installierbare Web-App (PWA) für iPhone und Android.
Die App ist nur für den internen Gebrauch im Team gedacht. Sie läuft offline, und alle Berechnungen passieren auf dem Gerät.

## Tools

| Tool | Inhalt |
|---|---|
| **Umrechner** | Volumenstrom ↔ Geschwindigkeit ↔ Querschnitt (rund, rechteckig, Fläche), Nenndurchmesser-Vorschlag, hydraulischer und gleichwertiger Durchmesser, dynamischer Druck |
| **Druckverlust** | Strang aus geraden Leitungen (Darcy-Weisbach, Colebrook-White), Formteilen (ζ) und Komponenten (Δp, quadratisch umgerechnet); Luftzustand aus Temperatur und Luftdruck; Stränge speichern und als Text teilen |
| **Geometrie** | 12 Flächen und 10 Körper mit Skizze, darunter Kreisabschnitt und Pyramidenstumpf (Übergangsstück) |
| **Firmendaten** | Materialien (Rauheit k), ζ-Werte, Komponenten pflegen; Import und Export als JSON-Datei |

## Firmendaten – bewusst nicht im Repository

Firmendaten werden **nur im Speicher des jeweiligen Geräts** abgelegt (localStorage). Im Repository stehen nur allgemeine Startwerte für Rauheiten, als Richtwerte gekennzeichnet.

So verteilst du die Daten im Team:
1. Daten auf einem Gerät pflegen, dann **Firmendaten → Exportieren**. Es entsteht `lufttools-firmendaten-JJJJ-MM-TT.json`.
2. Die Datei intern ablegen (Teams, SharePoint, Netzlaufwerk).
3. Auf den anderen Geräten: **Firmendaten → Importieren**. Dabei werden die vorhandenen Firmendaten ersetzt.

Die `.gitignore` verhindert, dass exportierte Dateien versehentlich ins Repository geraten.

> Hinweis: Wird die App auf einem iPhone gelöscht, sind auch die Daten weg. Die exportierte Datei dient deshalb gleichzeitig als Sicherung.

## Installation auf dem Handy

- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm“
- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“

## Hosting (GitHub Pages)

Repository → *Settings* → *Pages* → *Source: Deploy from a branch* → Branch `main`, Ordner `/ (root)`.
Ein Build-Schritt ist nicht nötig, weil die App aus reinem HTML, CSS und JavaScript (ES-Module) besteht.

## Entwicklung

```bash
npm test        # Rechenkern prüfen (Node ≥ 20, keine Abhängigkeiten)
npm start       # lokaler Server auf http://localhost:8080
```

Aufbau:

```
js/core/    reine Rechenfunktionen (SI-Einheiten), durch Tests abgesichert
js/tools/   je Tool eine Datei (Oberfläche)
js/ui/      gemeinsame Bausteine (Eingabefelder, Dialog, Formatierung)
js/data/    Firmendaten: Speicherung, Import, Export
tests/      Referenzwerte (Moody-Diagramm, Tabellenwerte, Geometrie)
```

**Neues Tool hinzufügen:** Datei in `js/tools/` anlegen (`export function render(container)`), in `TOOLS` in `js/app.js` eintragen und in `sw.js` zur Dateiliste hinzufügen.

**Update ausrollen:** In `sw.js` die `VERSION` erhöhen. Die Geräte zeigen dann „Neue Version verfügbar“ an.

## Rechengrundlagen

- Luftdichte: ideales Gas, ρ = p / (R·T), R = 287,058 J/(kg·K); Viskosität nach Sutherland
- Gerade Leitung: Δp = λ · L/d<sub>h</sub> · ρ/2 · v², λ laminar 64/Re (Re < 2320), sonst Colebrook-White
- Rechteckkanal: d<sub>h</sub> = 2ab/(a+b) für die Reibung; d<sub>gl</sub> = 1,30·(ab)<sup>0,625</sup>/(a+b)<sup>0,25</sup> (Huebscher) zur Information
- Formteil: Δp = n · ζ · ρ/2 · v², mit v im angegebenen Querschnitt
- Komponente: Δp = n · Δp<sub>N</sub> · (V̇/V̇<sub>N</sub>)², ohne V̇<sub>N</sub> konstant

Die Ergebnisse sind Rechenhilfen und ersetzen keine Fachplanung.
