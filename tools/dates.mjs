// Écrit sous chaque carte de index.html la date de dernière mise à jour du projet
// (et sa version quand la dernière release en a une), en HTML statique : la page reste sans script.
//
// Usage : GITHUB_TOKEN=… node tools/dates.mjs     (sans jeton : 60 requêtes / heure, ça peut suffire)
// La CI (.github/workflows/dates.yml) le lance chaque jour et commite si une date a changé.
//
// Date retenue : la plus récente entre la dernière release (hors brouillons et préversions) et le
// dernier commit de la branche principale qui touche l'appli elle-même. Ne comptent pas : licence,
// README, CLAUDE.md, réglages GitHub, page de présentation (docs/, site/), copie du kit et robots.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const META = [
  /^(LICENSE|COPYING|README|CLAUDE|SECURITY|CONTRIBUTING|CHANGELOG)[^/]*$/i,
  /^\.(github|claude)\//,
  /^\.gitignore$/,
  /^(docs|site)\//,
  /(^|\/)playground\.css$/,
];
const touchesApp = (files) => files.some((f) => !META.some((re) => re.test(f.filename)));

async function gh(url) {
  const r = await fetch(`https://api.github.com/${url}`, {
    headers: { Accept: 'application/vnd.github+json', ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }) },
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${url} : HTTP ${r.status}`);
  return r.json();
}

async function lastUpdate(repo) {
  let date = null;
  let version = null;
  const release = await gh(`repos/${repo}/releases/latest`);
  if (release?.published_at) {
    date = release.published_at;
    if (/^v?\d/.test(release.tag_name)) version = release.tag_name.replace(/^(\d)/, 'v$1');
  }
  const commits = (await gh(`repos/${repo}/commits?per_page=40`)) ?? [];
  for (const c of commits) {
    if (c.author?.type === 'Bot' || /\[bot\]$/.test(c.commit.author?.name ?? '')) continue;
    if (date && c.commit.committer.date <= date) break; // plus ancien que la release : rien à gagner
    const full = await gh(`repos/${repo}/commits/${c.sha}`);
    if (full && touchesApp(full.files ?? [])) {
      date = c.commit.committer.date;
      break;
    }
  }
  return { date: date?.slice(0, 10) ?? null, version };
}

const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

let html = fs.readFileSync(INDEX, 'utf8');
const EOL = html.includes('\r\n') ? '\r\n' : '\n';
const cards = [...html.matchAll(/<li class="card"[^>]*>[\s\S]*?<\/div>\s*<\/li>/g)];
let changed = 0;
for (const [card] of cards) {
  const repo = card.match(/href="https:\/\/github\.com\/([\w.-]+\/[\w.-]+)"/)?.[1];
  if (!repo) continue;
  const { date, version } = await lastUpdate(repo);
  const old = card.match(/\r?\n[ \t]*<p class="maj">[^\r\n]*<\/p>/)?.[0] ?? '';
  let next = card.replace(old, '');
  if (date) {
    const indent = card.match(/\n([ \t]*)<ul class="tags"/)[1];
    const line = `${EOL}${indent}<p class="maj">mis à jour le <time datetime="${date}">${fmt.format(new Date(date))}</time>${version ? ` · ${version}` : ''}</p>`;
    next = next.replace(/(<ul class="tags"[^>]*>.*<\/ul>)/, `$1${line}`);
  }
  if (next !== card) {
    html = html.replace(card, next);
    changed++;
  }
  console.log(`${repo.padEnd(42)} ${date ?? '?'}${version ? ' ' + version : ''}`);
}
if (changed) fs.writeFileSync(INDEX, html);
console.log(changed ? `${changed} carte(s) mise(s) à jour.` : 'Aucune date n\'a changé.');
