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

- Chaque page garde sa police (une seule, plus JetBrains Mono pour les détails) et ses couleurs, en redéfinissant `--pg-accent`, `--pg-accent-2`, `--pg-bg`… après le kit.
- Chaque projet en garde une copie pour fonctionner hors ligne. Après une modification du kit : `sh kit/sync.sh`, puis commiter dans chaque projet (et `npm run pages` pour le Blind Test).
