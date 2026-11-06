// Flächen und Körper. Eingaben in einer beliebigen, aber einheitlichen Längeneinheit;
// Ergebnisse tragen ihre Dimension (1 = Länge, 2 = Fläche, 3 = Volumen), damit die
// Oberfläche korrekt umrechnen kann. Winkel in Grad.

const PI = Math.PI;
const rad = (g) => (g * PI) / 180;

const L = (key, label) => ({ key, label, typ: 'laenge' });
const W = (key, label) => ({ key, label, typ: 'winkel' });
const N = (key, label) => ({ key, label, typ: 'anzahl' });

const res = (label, wert, dim, haupt = false) => ({ label, wert, dim, haupt });

function pruefe(bedingung, meldung) {
  if (!bedingung) throw new Error(meldung);
}

export const FLAECHEN = [
  {
    id: 'rechteck', name: 'Rechteck', eingaben: [L('a', 'Länge a'), L('b', 'Breite b')],
    rechne: ({ a, b }) => [res('Fläche A', a * b, 2, true), res('Umfang U', 2 * (a + b), 1), res('Diagonale e', Math.hypot(a, b), 1)],
  },
  {
    id: 'quadrat', name: 'Quadrat', eingaben: [L('a', 'Seite a')],
    rechne: ({ a }) => [res('Fläche A', a * a, 2, true), res('Umfang U', 4 * a, 1), res('Diagonale e', a * Math.SQRT2, 1)],
  },
  {
    id: 'kreis', name: 'Kreis', eingaben: [L('d', 'Durchmesser d')],
    rechne: ({ d }) => [res('Fläche A', (PI * d * d) / 4, 2, true), res('Umfang U', PI * d, 1), res('Radius r', d / 2, 1)],
  },
  {
    id: 'kreisring', name: 'Kreisring', eingaben: [L('D', 'Außendurchmesser D'), L('d', 'Innendurchmesser d')],
    rechne: ({ D, d }) => {
      pruefe(d < D, 'Der Innendurchmesser muss kleiner als der Außendurchmesser sein.');
      return [res('Fläche A', (PI / 4) * (D * D - d * d), 2, true), res('Umfang außen', PI * D, 1), res('Umfang innen', PI * d, 1), res('Wandstärke s', (D - d) / 2, 1)];
    },
  },
  {
    id: 'ellipse', name: 'Ellipse', eingaben: [L('a', 'Achse a (gesamt)'), L('b', 'Achse b (gesamt)')],
    rechne: ({ a, b }) => {
      const x = a / 2, y = b / 2;
      const h = ((x - y) / (x + y)) ** 2;
      const U = PI * (x + y) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))); // Ramanujan
      return [res('Fläche A', PI * x * y, 2, true), res('Umfang U (Näherung)', U, 1)];
    },
  },
  {
    id: 'dreieck', name: 'Dreieck (g, h)', eingaben: [L('g', 'Grundseite g'), L('h', 'Höhe h')],
    rechne: ({ g, h }) => [res('Fläche A', (g * h) / 2, 2, true)],
  },
  {
    id: 'dreieck3', name: 'Dreieck (3 Seiten)', eingaben: [L('a', 'Seite a'), L('b', 'Seite b'), L('c', 'Seite c')],
    rechne: ({ a, b, c }) => {
      pruefe(a + b > c && a + c > b && b + c > a, 'Mit diesen Seitenlängen ist kein Dreieck möglich.');
      const s = (a + b + c) / 2;
      const A = Math.sqrt(s * (s - a) * (s - b) * (s - c)); // Heron
      return [res('Fläche A', A, 2, true), res('Umfang U', a + b + c, 1), res('Höhe auf a', (2 * A) / a, 1)];
    },
  },
  {
    id: 'trapez', name: 'Trapez', eingaben: [L('a', 'Grundseite a'), L('c', 'Gegenseite c'), L('h', 'Höhe h')],
    rechne: ({ a, c, h }) => [res('Fläche A', ((a + c) / 2) * h, 2, true), res('Mittellinie m', (a + c) / 2, 1)],
  },
  {
    id: 'parallelogramm', name: 'Parallelogramm', eingaben: [L('a', 'Seite a'), L('h', 'Höhe h')],
    rechne: ({ a, h }) => [res('Fläche A', a * h, 2, true)],
  },
  {
    id: 'kreisausschnitt', name: 'Kreisausschnitt', eingaben: [L('r', 'Radius r'), W('alpha', 'Winkel α')],
    rechne: ({ r, alpha }) => {
      pruefe(alpha <= 360, 'Der Winkel darf höchstens 360° betragen.');
      const b = r * rad(alpha);
      return [res('Fläche A', (r * b) / 2, 2, true), res('Bogenlänge b', b, 1), res('Umfang U', b + 2 * r, 1)];
    },
  },
  {
    id: 'kreisabschnitt', name: 'Kreisabschnitt', eingaben: [L('r', 'Radius r'), W('alpha', 'Mittelpunktswinkel α')],
    rechne: ({ r, alpha }) => {
      pruefe(alpha <= 360, 'Der Winkel darf höchstens 360° betragen.');
      const a = rad(alpha);
      return [
        res('Fläche A', (r * r * (a - Math.sin(a))) / 2, 2, true),
        res('Sehne s', 2 * r * Math.sin(a / 2), 1),
        res('Stichhöhe h', r * (1 - Math.cos(a / 2)), 1),
        res('Bogenlänge b', r * a, 1),
      ];
    },
  },
  {
    id: 'vieleck', name: 'Regelm. Vieleck', eingaben: [N('n', 'Anzahl Ecken n'), L('a', 'Seitenlänge a')],
    rechne: ({ n, a }) => {
      pruefe(Number.isInteger(n) && n >= 3, 'Die Eckenzahl muss eine ganze Zahl ≥ 3 sein.');
      const A = (n * a * a) / (4 * Math.tan(PI / n));
      return [res('Fläche A', A, 2, true), res('Umfang U', n * a, 1), res('Umkreisradius', a / (2 * Math.sin(PI / n)), 1), res('Inkreisradius', a / (2 * Math.tan(PI / n)), 1)];
    },
  },
];

export const KOERPER = [
  {
    id: 'wuerfel', name: 'Würfel', eingaben: [L('a', 'Kante a')],
    rechne: ({ a }) => [res('Volumen V', a ** 3, 3, true), res('Oberfläche O', 6 * a * a, 2), res('Raumdiagonale', a * Math.sqrt(3), 1)],
  },
  {
    id: 'quader', name: 'Quader', eingaben: [L('a', 'Länge a'), L('b', 'Breite b'), L('c', 'Höhe c')],
    rechne: ({ a, b, c }) => [res('Volumen V', a * b * c, 3, true), res('Oberfläche O', 2 * (a * b + a * c + b * c), 2), res('Raumdiagonale', Math.sqrt(a * a + b * b + c * c), 1)],
  },
  {
    id: 'zylinder', name: 'Zylinder', eingaben: [L('d', 'Durchmesser d'), L('h', 'Höhe / Länge h')],
    rechne: ({ d, h }) => {
      const G = (PI * d * d) / 4, M = PI * d * h;
      return [res('Volumen V', G * h, 3, true), res('Mantelfläche M', M, 2), res('Oberfläche O', 2 * G + M, 2), res('Grundfläche G', G, 2)];
    },
  },
  {
    id: 'hohlzylinder', name: 'Hohlzylinder', eingaben: [L('D', 'Außendurchmesser D'), L('d', 'Innendurchmesser d'), L('h', 'Höhe / Länge h')],
    rechne: ({ D, d, h }) => {
      pruefe(d < D, 'Der Innendurchmesser muss kleiner als der Außendurchmesser sein.');
      return [
        res('Volumen V (Material)', (PI / 4) * (D * D - d * d) * h, 3, true),
        res('Innenvolumen', (PI / 4) * d * d * h, 3),
        res('Mantel außen', PI * D * h, 2),
        res('Mantel innen', PI * d * h, 2),
      ];
    },
  },
  {
    id: 'kegel', name: 'Kegel', eingaben: [L('d', 'Durchmesser d'), L('h', 'Höhe h')],
    rechne: ({ d, h }) => {
      const r = d / 2, s = Math.hypot(r, h), M = PI * r * s;
      return [res('Volumen V', (PI * r * r * h) / 3, 3, true), res('Mantelfläche M', M, 2), res('Oberfläche O', M + PI * r * r, 2), res('Mantellinie s', s, 1)];
    },
  },
  {
    id: 'kegelstumpf', name: 'Kegelstumpf', eingaben: [L('D', 'Durchmesser unten D'), L('d', 'Durchmesser oben d'), L('h', 'Höhe h')],
    rechne: ({ D, d, h }) => {
      const R = D / 2, r = d / 2, s = Math.hypot(R - r, h), M = PI * (R + r) * s;
      return [
        res('Volumen V', ((PI * h) / 3) * (R * R + R * r + r * r), 3, true),
        res('Mantelfläche M', M, 2),
        res('Oberfläche O', M + PI * (R * R + r * r), 2),
        res('Mantellinie s', s, 1),
      ];
    },
  },
  {
    id: 'kugel', name: 'Kugel', eingaben: [L('d', 'Durchmesser d')],
    rechne: ({ d }) => [res('Volumen V', (PI * d ** 3) / 6, 3, true), res('Oberfläche O', PI * d * d, 2)],
  },
  {
    id: 'pyramide', name: 'Pyramide', eingaben: [L('a', 'Grundseite a'), L('b', 'Grundseite b'), L('h', 'Höhe h')],
    rechne: ({ a, b, h }) => {
      const ha = Math.hypot(b / 2, h), hb = Math.hypot(a / 2, h);
      const M = a * ha + b * hb;
      return [res('Volumen V', (a * b * h) / 3, 3, true), res('Mantelfläche M', M, 2), res('Oberfläche O', M + a * b, 2)];
    },
  },
  {
    id: 'pyramidenstumpf', name: 'Pyramidenstumpf / Übergang',
    eingaben: [L('a1', 'Unten Länge a₁'), L('b1', 'Unten Breite b₁'), L('a2', 'Oben Länge a₂'), L('b2', 'Oben Breite b₂'), L('h', 'Höhe h')],
    rechne: ({ a1, b1, a2, b2, h }) => {
      // Prismatoid-Formel: V = h/6 · (A1 + 4·Am + A2)
      const V = (h / 6) * (a1 * b1 + a2 * b2 + (a1 + a2) * (b1 + b2));
      const sa = Math.hypot((b1 - b2) / 2, h); // Höhe der Seitenflächen an a
      const sb = Math.hypot((a1 - a2) / 2, h);
      const M = (a1 + a2) * sa + (b1 + b2) * sb;
      return [res('Volumen V', V, 3, true), res('Mantelfläche M', M, 2), res('Oberfläche O', M + a1 * b1 + a2 * b2, 2)];
    },
  },
  {
    id: 'prisma', name: 'Prisma (Dreieck)', eingaben: [L('g', 'Grundseite g'), L('hd', 'Dreieckshöhe h'), L('l', 'Länge l')],
    rechne: ({ g, hd, l }) => [res('Volumen V', ((g * hd) / 2) * l, 3, true), res('Grundfläche G', (g * hd) / 2, 2)],
  },
];

export const FORMEN = [...FLAECHEN, ...KOERPER];

export function findeForm(id) {
  return FORMEN.find((f) => f.id === id);
}

/** Rechnet eine Form. Wirft bei ungültigen Eingaben einen Error mit Klartextmeldung. */
export function berechne(form, werte) {
  for (const e of form.eingaben) {
    const w = werte[e.key];
    pruefe(Number.isFinite(w), `Bitte „${e.label}“ eingeben.`);
    pruefe(w > 0, `„${e.label}“ muss größer als 0 sein.`);
  }
  return form.rechne(werte);
}
