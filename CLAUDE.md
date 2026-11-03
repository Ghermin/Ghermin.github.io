# Bored Dev Playground

La vitrine de tous les projets (https://ghermin.github.io/). Les projets sont dans les dossiers voisins (`../autowash`, `../camtel`…) et leurs pages GitHub suivent le kit `kit/playground.css`.

- **Modifier le kit** (`kit/playground.css`) touche toutes les pages des projets : vérifier que ça reste bon sur chacune, puis lancer `sh kit/sync.sh` et commiter dans chaque projet (Blind Test : `npm run pages` en plus ; La Quittance : augmenter `CACHE` dans `sw.js`).
- **Ajouter un projet** : une carte `<li class="card">` dans `index.html`, son icône dans `assets/projects/`, mettre à jour le compteur « N résultats », ajouter sa copie du kit dans `kit/sync.sh`, et donner à sa page le bandeau `pg-strip` et un `CLAUDE.md` comme les autres projets.
- Toutes les pages : thème clair / sombre automatique, responsive, 2 polices max (celle du projet + JetBrains Mono).
