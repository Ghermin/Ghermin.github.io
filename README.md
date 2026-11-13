# Bored Dev Playground

La vitrine de mes petits projets : une page statique (HTML + CSS, sans build) qui renvoie vers chaque projet.

Thème clair / sombre automatique selon le système. Polices : Bricolage Grotesque et JetBrains Mono.

Pour la lancer en local :

```bash
python -m http.server 5180
```

Pour ajouter un projet : copier un bloc `<li class="card">` dans `index.html` et mettre son icône dans `assets/projects/`.

## Kit commun aux pages de projets

`kit/playground.css` est le design system partagé par toutes les pages GitHub des projets : couleurs neutres (clair / sombre automatique), cartes, boutons, puces, gabarit des pages vitrine, et le bandeau « bored dev playground » qui ramène ici.

- Deux polices pour tout le playground : Bricolage Grotesque (`--pg-font`) et JetBrains Mono (`--pg-mono`), chargées par chaque page avec le lien Google Fonts indiqué en tête du kit.
- Chaque page a ses couleurs, celles du dégradé de son icône, en redéfinissant `--pg-accent`, `--pg-accent-2` (le dégradé des boutons) et des neutres teintés (`--pg-bg`…) après le kit. Pas d'autre couleur décorative.
- Chaque projet en garde une copie pour fonctionner hors ligne. Après une modification du kit : `sh kit/sync.sh`, puis commiter dans chaque projet (et `npm run pages` pour le Blind Test).

## Icônes

Toutes les icônes (playground et projets) sortent de `brand/icons/*.svg` et suivent les mêmes règles, pour qu'on voie qu'elles vont ensemble sans se ressembler :

- carré de 64 aux coins arrondis (rx 16), dégradé en diagonale à deux couleurs, propre à chaque projet ;
- un dessin blanc au trait épais (5, bouts ronds), avec un seul détail en blanc à 55 % ;
- souvent un trait horizontal en bas, le « curseur » qui fait la bouche du logo du playground.

`brand/sheet.png` montre l'ensemble. Après une modification d'un SVG :

```bash
cd brand && npm install && node build.js            # toutes les icônes
node build.js camtel                                # une seule
node build.js --sheet                               # refait sheet.png
```

Le script écrit directement dans les projets voisins : favicons (SVG, ICO, PNG), icônes Apple et de manifeste (avec version masquable), `.ico` des applis Windows, et icônes adaptatives Android (fond, dessin et version monochrome pour les icônes à thème d'Android 13). Ensuite, commiter dans chaque projet touché. Le dessin du `<g id="glyph">` ne doit contenir que des `<path>` blancs : c'est ce qui permet de le convertir en vector drawable Android.
