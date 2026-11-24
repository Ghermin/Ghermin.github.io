// Vérifie que la vitrine est cohérente : la checklist « Ajouter un projet » du CLAUDE.md.
// Usage : node tools/check.mjs             (fichiers seulement, hors ligne)
//         node tools/check.mjs --en-ligne  (en plus : chaque page de projet répond et ramène au playground)
// Lancé par .github/workflows/verifier.yml à chaque push et chaque lundi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const HOME = 'https://ghermin.github.io/';
const FILTRES = ['windows', 'android', 'web', 'jeux'];
const BADGE_JOURS = 30;

const errors = [];
const fail = (msg) => errors.push(msg);

const html = read('index.html');
const css = read('style.css');
const sync = read('kit/sync.sh');
const build = read('brand/build.js');
const sitemap = read('sitemap.xml');

// ------------------------------------------------------------- cartes

const cards = [...html.matchAll(/<li class="card"([^>]*)>([\s\S]*?)<\/div>\s*<\/li>/g)].map((m) => {
  const body = m[2];
  const title = body.match(/<h2><a href="([^"]+)">([^<]+)<\/a><\/h2>/);
  return {
    name: title ? title[2] : '(sans titre)',
    url: title && title[1],
    p: (m[1].match(/data-p="([^"]*)"/) || [])[1],
    icon: (body.match(/<img class="icon" src="([^"]+)"/) || [])[1],
    open: (body.match(/<a class="primary" href="([^"]+)"/) || [])[1],
    code: (body.match(/<a href="https:\/\/github\.com\/Ghermin\/([\w.-]+)">Code<\/a>/) || [])[1],
    badges: [...body.matchAll(/<p class="badge"><time datetime="([^"]+)">([^<]+)<\/time><\/p>/g)].map((b) => ({ date: b[1], text: b[2] })),
  };
});

if (!cards.length) fail('index.html : aucune carte trouvée');

const syncRepos = new Set([...sync.matchAll(/^\s+([\w.-]+)\/[^\s]*playground\.css/gm)].map((m) => m[1]));
const targets = new Set([...build.matchAll(/^\s+'?([\w-]+)'?\(icon\)\s*\{/gm)].map((m) => m[1]));
const today = new Date(new Date().toISOString().slice(0, 10));

for (const c of cards) {
  const at = `carte « ${c.name} »`;
  if (!c.url) { fail(`${at} : titre sans lien`); continue; }
  if (!/^https:\/\/ghermin\.github\.io\/[\w.-]+\/$/.test(c.url)) fail(`${at} : adresse inattendue ${c.url}`);
  if (c.open !== c.url) fail(`${at} : « Ouvrir » (${c.open}) ne mène pas au même endroit que le titre`);

  // icône : SVG de brand/icons/, copie identique dans assets/projects/, cible dans build.js
  const icon = c.icon && c.icon.match(/^assets\/projects\/([\w-]+)\.svg$/);
  if (!icon) fail(`${at} : l'icône doit être assets/projects/<id>.svg (trouvé : ${c.icon})`);
  else {
    const id = icon[1];
    if (!exists(c.icon)) fail(`${at} : ${c.icon} manquant (node build.js ${id} dans brand/)`);
    if (!exists(`brand/icons/${id}.svg`)) fail(`${at} : brand/icons/${id}.svg manquant`);
    else if (exists(c.icon) && read(c.icon) !== read(`brand/icons/${id}.svg`)) {
      fail(`${at} : ${c.icon} diffère de brand/icons/${id}.svg (node build.js ${id} dans brand/)`);
    }
    if (!targets.has(id)) fail(`${at} : pas d'entrée « ${id} » dans TARGETS de brand/build.js`);
  }

  if (!c.code) fail(`${at} : lien « Code » vers github.com/Ghermin/… manquant`);
  else if (!syncRepos.has(c.code)) fail(`${at} : ${c.code} absent de kit/sync.sh`);

  const p = (c.p || '').split(/\s+/).filter(Boolean);
  if (!p.length) fail(`${at} : data-p vide (plateformes : ${FILTRES.join(', ')})`);
  for (const x of p) if (!FILTRES.includes(x)) fail(`${at} : plateforme inconnue « ${x} »`);
  c.plateformes = p;

  for (const b of c.badges) {
    const d = new Date(b.date);
    const age = Math.round((today - d) / 86400000);
    if (Number.isNaN(age)) fail(`${at} : date de badge illisible « ${b.date} »`);
    else if (age < 0) fail(`${at} : badge « ${b.text} » daté dans le futur (${b.date})`);
    else if (age > BADGE_JOURS) fail(`${at} : badge « ${b.text} » du ${b.date}, plus de ${BADGE_JOURS} jours : le retirer`);
  }
}

// ------------------------------------------------------------- compteurs et filtres

const count = (f) => {
  const m = html.match(new RegExp(`<span data-f="${f}">(\\d+) résultats?</span>`));
  return m ? Number(m[1]) : null;
};
const expect = (f, n) => {
  const shown = count(f);
  if (shown === null) fail(`index.html : compteur « ${f} » introuvable`);
  else if (shown !== n) fail(`index.html : le compteur « ${f} » dit ${shown}, il y a ${n} carte(s)`);
};
expect('tout', cards.length);
for (const f of FILTRES) {
  expect(f, cards.filter((c) => c.plateformes && c.plateformes.includes(f)).length);
  if (!html.includes(`id="f-${f}"`)) fail(`index.html : bouton de filtre #f-${f} manquant`);
  if (!css.includes(`#f-${f}:checked) .card:not([data-p~="${f}"])`)) fail(`style.css : règle qui masque les cartes hors « ${f} » manquante`);
  if (!css.includes(`#f-${f}:checked) .kicker [data-f="${f}"]`)) fail(`style.css : règle du compteur « ${f} » manquante`);
}

// ------------------------------------------------------------- sitemap, partage, 404

const inSitemap = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const wanted = [HOME, ...cards.map((c) => c.url).filter(Boolean)];
for (const u of wanted) if (!inSitemap.includes(u)) fail(`sitemap.xml : ${u} manquant`);
for (const u of inSitemap) if (!wanted.includes(u)) fail(`sitemap.xml : ${u} n'a plus de carte`);
if (!read('robots.txt').includes(`Sitemap: ${HOME}sitemap.xml`)) fail('robots.txt : ligne Sitemap manquante');

if (!exists('og.png')) fail('og.png manquant (node build.js --og dans brand/)');
if (!html.includes(`<meta property="og:image" content="${HOME}og.png">`)) fail('index.html : og:image manquant');

// La 404 est servie à n'importe quelle profondeur (/xyz/abc) : pas de chemin relatif.
const page404 = read('404.html');
for (const m of page404.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  if (!/^(\/|https:|#)/.test(m[1])) fail(`404.html : chemin relatif « ${m[1]} », il casserait sous /xyz/abc`);
}

// ------------------------------------------------------------- en ligne

if (process.argv.includes('--en-ligne')) {
  const get = async (url) => {
    for (let essai = 1; ; essai++) {
      try {
        const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
        return { status: r.status, text: await r.text() };
      } catch (e) {
        if (essai >= 3) return { status: 0, text: String(e) };
        await new Promise((ok) => setTimeout(ok, 2000 * essai));
      }
    }
  };
  await Promise.all(cards.filter((c) => c.url).map(async (c) => {
    const page = await get(c.url);
    if (page.status !== 200) return fail(`${c.url} : HTTP ${page.status}`);
    if (!page.text.includes('pg-strip')) fail(`${c.url} : pas de bandeau pg-strip`);
    if (!page.text.includes(HOME)) fail(`${c.url} : aucun lien vers ${HOME}`);
    if (c.code) {
      const repo = await get(`https://github.com/Ghermin/${c.code}`);
      if (repo.status !== 200) fail(`github.com/Ghermin/${c.code} : HTTP ${repo.status}`);
    }
  }));
}

// ------------------------------------------------------------- bilan

if (errors.length) {
  for (const e of errors) console.log(process.env.GITHUB_ACTIONS ? `::error::${e}` : `✗ ${e}`);
  console.log(`\n${errors.length} problème(s).`);
  process.exit(1);
}
console.log(`✓ ${cards.length} cartes cohérentes (icônes, kit, filtres, sitemap, badges${process.argv.includes('--en-ligne') ? ', pages en ligne' : ''}).`);
