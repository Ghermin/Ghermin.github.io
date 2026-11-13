# Bored Dev Playground

La vitrine de tous les projets (https://ghermin.github.io/). Les projets sont dans les dossiers voisins (`../autowash`, `../camtel`…) et leurs pages GitHub suivent le kit `kit/playground.css`.

- **Modifier le kit** (`kit/playground.css`) touche toutes les pages des projets : vérifier que ça reste bon sur chacune, puis lancer `sh kit/sync.sh` et commiter dans chaque projet (Blind Test : `npm run pages` en plus ; La Quittance et Mots fléchés : augmenter `CACHE` dans `sw.js`).
- **Ajouter un projet** : une carte `<li class="card">` dans `index.html`, son icône dans `brand/icons/` (générée ensuite dans `assets/projects/`), mettre à jour le compteur « N résultats », ajouter sa copie du kit dans `kit/sync.sh`, et donner à sa page le bandeau `pg-strip` et un `CLAUDE.md` comme les autres projets. L'appli elle-même (web, Android, Windows) porte un lien discret « un projet du bored dev playground » vers https://ghermin.github.io/ en pied de page (`pg-sig` du kit pour les pages web).
- **Icônes** : une par projet dans `brand/icons/`, même grille et même style (voir le README). Après une modification, `node build.js <id>` dans `brand/` régénère favicons, icônes Android et Windows dans le projet, puis commiter dans les deux repos. Un nouveau projet a besoin de son SVG et d'une entrée dans `TARGETS` de `brand/build.js`.
- Toutes les pages : thème clair / sombre automatique, responsive, 2 polices max (celle du projet + JetBrains Mono).
- **Infos perso** : seule identité publique autorisée, Ghermin. Rien d'autre dans les pages, cartes, icônes ni commits.
- **Captures d'écran** (pages des projets, cartes) : les regarder en entier avant de les publier. Retirer noms et pseudos, overlays (Steam, Discord, notifications), autres fenêtres, barre des tâches, chemins `C:\Users\...`, second écran ; recadrer, flouter fort, réenregistrer sans métadonnées.
