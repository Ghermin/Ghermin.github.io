// Génère toutes les icônes des projets à partir des SVG de brand/icons/.
// Usage : cd brand && npm install && npm run icons            (tout)
//         node build.js camtel averse                         (seulement ces icônes)
//         node build.js --sheet                               (planche de contrôle brand/sheet.png)
//
// Chaque SVG suit la même grille : carré 64, coins rx 16, dégradé diagonal à deux couleurs,
// et un <g id="glyph"> blanc fait uniquement de <path> (traits de 5, bouts ronds).
// C'est ce qui permet d'en tirer les icônes adaptatives Android (vector drawables).
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const BRAND = __dirname;
const PROJECTS = path.resolve(BRAND, '..', '..'); // dossier qui contient tous les projets
const PLAYGROUND = path.resolve(BRAND, '..');

// ---------------------------------------------------------------- lecture des SVG

function load(id) {
  const svg = fs.readFileSync(path.join(BRAND, 'icons', `${id}.svg`), 'utf8');
  const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]);
  const g = svg.match(/<g id="glyph"([^>]*)>([\s\S]*?)<\/g>/);
  if (stops.length !== 2 || !g) throw new Error(`${id}.svg : il faut 2 stops et un <g id="glyph">`);
  const defaults = attrs(g[1]);
  const inner = g[2].replace(/<!--[\s\S]*?-->/g, '').trim();
  const paths = [...inner.matchAll(/<path\b([^>]*)\/>/g)].map((m) => ({ ...defaults, ...attrs(m[1]) }));
  return { id, svg, c1: stops[0], c2: stops[1], gAttrs: g[1], inner, paths };
}

function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([\w-]+)="([^"]*)"/g)) if (m[1] !== 'id') out[m[1]] = m[2];
  return out;
}

// ---------------------------------------------------------------- variantes SVG

// shape : 'rounded' (coins rx 16, fond transparent autour), 'square' (plein cadre).
// scale : taille du dessin autour du centre (zone sûre des icônes masquables).
// pad   : marge transparente autour de l'icône arrondie (icônes Android anciennes).
function variant(icon, { shape = 'rounded', scale = 1, pad = 0, bg = true } = {}) {
  const k = (64 - 2 * pad) / 64;
  const glyph = `<g transform="translate(32 32) scale(${scale * k}) translate(-32 -32)"><g${icon.gAttrs}>${icon.inner}</g></g>`;
  const rect = shape === 'square'
    ? '<rect width="64" height="64" fill="url(#bg)"/>'
    : `<rect x="${pad}" y="${pad}" width="${64 - 2 * pad}" height="${64 - 2 * pad}" rx="${16 * k}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`
    + `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${icon.c1}"/><stop offset="1" stop-color="${icon.c2}"/></linearGradient></defs>`
    + (bg ? rect : '') + glyph + '</svg>';
}

function png(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size }, shapeRendering: 2 }).render();
}

// ---------------------------------------------------------------- .ico (BMP 32 bits sous 256, PNG à 256)

function ico(icon, sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256]) {
  const frames = sizes.map((s) => {
    const img = png(variant(icon), s);
    if (s >= 256) return { s, data: img.asPng() };
    const rgba = img.pixels;
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0);
    header.writeInt32LE(s, 4);
    header.writeInt32LE(s * 2, 8);
    header.writeUInt16LE(1, 12);
    header.writeUInt16LE(32, 14);
    header.writeUInt32LE(s * s * 4, 20);
    const xor = Buffer.alloc(s * s * 4);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4;
        const o = ((s - 1 - y) * s + x) * 4;
        xor[o] = rgba[i + 2]; xor[o + 1] = rgba[i + 1]; xor[o + 2] = rgba[i]; xor[o + 3] = rgba[i + 3];
      }
    }
    const andRow = Math.ceil(s / 32) * 4;
    const and = Buffer.alloc(andRow * s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (rgba[(y * s + x) * 4 + 3] === 0) and[(s - 1 - y) * andRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    return { s, data: Buffer.concat([header, xor, and]) };
  });
  const dir = Buffer.alloc(6 + 16 * frames.length);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(frames.length, 4);
  let offset = dir.length;
  frames.forEach((f, i) => {
    const e = 6 + 16 * i;
    dir.writeUInt8(f.s >= 256 ? 0 : f.s, e);
    dir.writeUInt8(f.s >= 256 ? 0 : f.s, e + 1);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(f.data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += f.data.length;
  });
  return Buffer.concat([dir, ...frames.map((f) => f.data)]);
}

// ---------------------------------------------------------------- Android (vector drawables)

const argb = (hex, alpha = 1) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return '#' + Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase() + full.toUpperCase();
};
const white = (c) => c && c !== 'none';

function vectorPaths(icon, indent) {
  return icon.paths.map((p) => {
    const op = parseFloat(p.opacity ?? '1');
    const a = [`android:pathData="${p.d}"`];
    if (white(p.fill)) {
      a.push(`android:fillColor="#FFFFFFFF"`);
      const fa = op * parseFloat(p['fill-opacity'] ?? '1');
      if (fa < 1) a.push(`android:fillAlpha="${+fa.toFixed(3)}"`);
    }
    if (white(p.stroke)) {
      a.push(`android:strokeColor="#FFFFFFFF"`, `android:strokeWidth="${p['stroke-width'] ?? 1}"`);
      const sa = op * parseFloat(p['stroke-opacity'] ?? '1');
      if (sa < 1) a.push(`android:strokeAlpha="${+sa.toFixed(3)}"`);
      if (p['stroke-linecap']) a.push(`android:strokeLineCap="${p['stroke-linecap']}"`);
      if (p['stroke-linejoin']) a.push(`android:strokeLineJoin="${p['stroke-linejoin']}"`);
    }
    return `${indent}<path\n${indent}    ${a.join(`\n${indent}    `)} />`;
  }).join('\n');
}

const gradient = (icon, size, indent) => `${indent}<aapt:attr name="android:fillColor">
${indent}    <gradient android:type="linear" android:startX="0" android:startY="0" android:endX="${size}" android:endY="${size}">
${indent}        <item android:offset="0" android:color="${argb(icon.c1)}" />
${indent}        <item android:offset="1" android:color="${argb(icon.c2)}" />
${indent}    </gradient>
${indent}</aapt:attr>`;

const HEAD = (size, aapt) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Généré par bored-dev-playground/brand/build.js, ne pas modifier à la main. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"${aapt ? '\n    xmlns:aapt="http://schemas.android.com/aapt"' : ''}
    android:width="${size}dp"
    android:height="${size}dp"
    android:viewportWidth="${size}"
    android:viewportHeight="${size}">`;

// Calque adaptatif : le carré 64 est posé sur les 72 dp visibles du canevas de 108 dp.
const fgGroup = (icon) => `    <group android:translateX="18" android:translateY="18" android:scaleX="1.125" android:scaleY="1.125">
${vectorPaths(icon, '        ')}
    </group>`;

function android(icon, res, { legacy = false, logo = false } = {}) {
  const w = (rel, txt) => write(path.join(res, rel), txt);
  w('drawable/ic_launcher_background.xml', `${HEAD(108, true)}
    <path android:pathData="M0,0h108v108h-108z">
${gradient(icon, 108, '        ')}
    </path>
</vector>
`);
  w('drawable/ic_launcher_foreground.xml', `${HEAD(108)}\n${fgGroup(icon)}\n</vector>\n`);
  w('drawable/ic_launcher_monochrome.xml', `${HEAD(108)}\n${fgGroup(icon)}\n</vector>\n`);
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
`;
  w('mipmap-anydpi-v26/ic_launcher.xml', adaptive);
  w('mipmap-anydpi-v26/ic_launcher_round.xml', adaptive);
  if (legacy) {
    for (const [dpi, s] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
      w(`mipmap-${dpi}/ic_launcher.png`, png(variant(icon, { pad: 2 }), s).asPng());
      w(`mipmap-${dpi}/ic_launcher_round.png`, png(roundSvg(icon), s).asPng());
    }
  }
  if (logo) {
    // Logo arrondi pour l'interface (une ImageView ne masque pas une icône adaptative).
    w('drawable/ic_logo.xml', `${HEAD(64, true)}
    <path android:pathData="M16,0h32a16,16 0,0 1,16 16v32a16,16 0,0 1,-16 16h-32a16,16 0,0 1,-16 -16v-32a16,16 0,0 1,16 -16z">
${gradient(icon, 64, '        ')}
    </path>
${vectorPaths(icon, '    ')}
</vector>
`);
  }
}

function roundSvg(icon) {
  return variant(icon, { shape: 'square', scale: 0.84 })
    .replace('<rect width="64" height="64"', '<circle cx="32" cy="32" r="30"');
}

// ---------------------------------------------------------------- écriture

const written = [];
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  written.push(path.relative(PROJECTS, file));
}

// Sorties web habituelles : favicon SVG + ICO, icône Apple, icônes de manifeste.
function web(icon, dir, names = {}) {
  const n = { svg: 'icon.svg', ico: 'favicon.ico', apple: 'apple-touch-icon.png', ...names };
  if (n.svg) write(path.join(dir, n.svg), icon.svg);
  if (n.ico) write(path.join(dir, n.ico), ico(icon, [16, 32, 48]));
  if (n.apple) write(path.join(dir, n.apple), png(variant(icon, { shape: 'square' }), 180).asPng());
  if (n.png32) write(path.join(dir, n.png32), png(variant(icon), 32).asPng());
  if (n.i192) write(path.join(dir, n.i192), png(variant(icon), 192).asPng());
  if (n.i512) write(path.join(dir, n.i512), png(variant(icon), 512).asPng());
  if (n.mask512) write(path.join(dir, n.mask512), png(variant(icon, { shape: 'square', scale: 0.84 }), 512).asPng());
  if (n.maskSvg) write(path.join(dir, n.maskSvg), variant(icon, { shape: 'square', scale: 0.84 }) + '\n');
}

const P = (...p) => path.join(PROJECTS, ...p);

// ---------------------------------------------------------------- où va chaque icône

const TARGETS = {
  playground(icon) {
    web(icon, PLAYGROUND, { svg: 'favicon.svg' });
  },
  averse(icon) {
    const root = P('perso-torrent');
    web(icon, path.join(root, 'docs'), { i192: 'icon-192.png', i512: 'icon-512.png' });
    write(path.join(root, 'ui', 'icon.svg'), icon.svg);
    write(path.join(root, 'windows', 'Averse', 'averse.ico'), ico(icon));
    android(icon, path.join(root, 'android', 'app', 'src', 'main', 'res'));
  },
  'impression-locale'(icon) {
    const root = P('printer-where');
    web(icon, path.join(root, 'docs'), { svg: 'favicon.svg' });
    android(icon, path.join(root, 'android', 'app', 'src', 'main', 'res'));
  },
  blindtest(icon) {
    const root = P('blindtest-de-fin-de-soiree');
    web(icon, path.join(root, 'public'), {
      svg: 'favicon.svg', ico: null, png32: 'favicon-32.png', i192: 'icon-192.png', i512: 'icon-512.png',
      mask512: 'icon-maskable-512.png',
    });
    write(path.join(root, 'public', 'shortcut-icon.png'), png(variant(icon), 512).asPng());
    android(icon, path.join(root, 'android', 'app', 'src', 'main', 'res'), { legacy: true, logo: true });
  },
  according(icon) {
    web(icon, P('according'), { svg: 'favicon.svg' });
  },
  gomme(icon) {
    web(icon, P('gomme'), { svg: 'favicon.svg' });
  },
  autowash(icon) {
    const root = P('autowash');
    write(path.join(root, 'assets', 'autowash.ico'), ico(icon));
    write(path.join(root, 'assets', 'autowash.png'), png(variant(icon), 256).asPng());
    web(icon, path.join(root, 'docs'), { svg: 'favicon.svg' });
  },
  camtel(icon) {
    const root = P('camtel');
    web(icon, path.join(root, 'docs'), { i192: 'icon-192.png', i512: 'icon-512.png' });
    write(path.join(root, 'windows', 'CamTel', 'camtel.ico'), ico(icon));
    android(icon, path.join(root, 'android', 'app', 'src', 'main', 'res'));
  },
  'no-noob-no-arnaque'(icon) {
    web(icon, P('no-noob-no-arnaque', 'public'), {
      ico: null, png32: 'favicon-32.png', i192: 'icon-192.png', i512: 'icon-512.png',
      mask512: 'icon-maskable-512.png', maskSvg: 'icon-maskable.svg',
    });
  },
  'la-quittance'(icon) {
    const root = P('la-quittance');
    web(icon, path.join(root, 'icons'), {
      ico: null, i192: 'icon-192.png', i512: 'icon-512.png', mask512: 'icon-maskable-512.png',
    });
    android(icon, path.join(root, 'android', 'app', 'src', 'main', 'res'));
  },
  'mots-fleches'(icon) {
    web(icon, P('mots-fleches', 'icons'), {
      i192: 'icon-192.png', i512: 'icon-512.png', mask512: 'icon-maskable-512.png',
    });
  },
};

// Les icônes des cartes du playground.
function cards(ids) {
  for (const id of ids) {
    if (id === 'playground') continue;
    write(path.join(PLAYGROUND, 'assets', 'projects', `${id}.svg`), load(id).svg);
  }
}

// Planche de contrôle : chaque icône en grand, en petit, en masque rond, sur clair et sombre.
function sheet(ids) {
  const cell = 150;
  const parts = ids.map((id, i) => {
    const icon = load(id);
    const x = i * cell + 20;
    const rounded = Buffer.from(variant(icon)).toString('base64');
    const round = Buffer.from(roundSvg(icon)).toString('base64');
    const mask = Buffer.from(variant(icon, { shape: 'square', scale: 0.84 })).toString('base64');
    return `<image x="${x}" y="20" width="110" height="110" href="data:image/svg+xml;base64,${rounded}"/>
      <image x="${x + 15}" y="150" width="80" height="80" href="data:image/svg+xml;base64,${round}"/>
      <clipPath id="c${i}"><path d="M${x + 15} ${270}h80v80h-80z" transform="translate(0 0)"/></clipPath>
      <g clip-path="url(#c${i})"><image x="${x + 15}" y="270" width="80" height="80" href="data:image/svg+xml;base64,${mask}"/></g>
      <image x="${x + 20}" y="380" width="32" height="32" href="data:image/svg+xml;base64,${rounded}"/>
      <image x="${x + 64}" y="388" width="16" height="16" href="data:image/svg+xml;base64,${rounded}"/>
      <image x="${x + 20}" y="440" width="32" height="32" href="data:image/svg+xml;base64,${rounded}"/>
      <image x="${x + 64}" y="448" width="16" height="16" href="data:image/svg+xml;base64,${rounded}"/>`;
  });
  const w = ids.length * cell + 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="500">
    <rect width="${w}" height="430" fill="#f1f1f4"/><rect y="425" width="${w}" height="75" fill="#202124"/>${parts.join('')}</svg>`;
  write(path.join(BRAND, 'sheet.png'), new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng());
}

// ---------------------------------------------------------------- main

const args = process.argv.slice(2);
const all = Object.keys(TARGETS);
const ids = args.filter((a) => !a.startsWith('--'));
const chosen = ids.length ? ids : all;
if (args.includes('--sheet')) {
  sheet(chosen);
} else {
  for (const id of chosen) {
    if (!TARGETS[id]) throw new Error(`icône inconnue : ${id}`);
    TARGETS[id](load(id));
  }
  cards(chosen);
}
console.log(written.map((f) => '  ' + f.replace(/\\/g, '/')).join('\n'));
console.log(`${written.length} fichiers écrits.`);
