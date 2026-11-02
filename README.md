# Bored Dev Playground

La vitrine de mes petits projets : une page statique (HTML + CSS, sans build) qui renvoie vers chaque projet.

Thème clair / sombre automatique selon le système. Polices : Bricolage Grotesque et JetBrains Mono.

Pour la lancer en local :

```bash
python -m http.server 5180
```

Pour ajouter un projet : copier un bloc `<li class="card">` dans `index.html` et mettre son icône dans `assets/projects/`.
