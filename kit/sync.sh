#!/bin/sh
# Copie kit/playground.css dans chaque projet (dossiers voisins de ce repo).
# À lancer après chaque modification du kit, puis commiter dans chaque projet.
#
# Chaque ligne : <repo GitHub>/<chemin dans le repo>. Le dossier local est retrouvé par son
# remote (Ghermin/<repo>), quel que soit son nom (perso-torrent pour averse, according pour accordeur…).
# tools/check.mjs vérifie que chaque carte de index.html a sa ligne ici.
set -e
cd "$(dirname "$0")"
projects=..
[ -d ../../autowash ] && projects=../..

# Dossier local du repo $1, ou rien s'il n'est pas cloné.
local_dir() {
  for d in "$projects"/*/; do
    url=$(git -C "$d" remote get-url origin 2>/dev/null) || continue
    case "$url" in
      */Ghermin/"$1"|*/Ghermin/"$1".git|*:Ghermin/"$1"|*:Ghermin/"$1".git) echo "${d%/}"; return ;;
    esac
  done
}

for dest in \
  accordeur/playground.css \
  autowash/docs/playground.css \
  averse/docs/playground.css \
  averse/ui/playground.css \
  blindtest-de-fin-de-soiree/site/playground.css \
  camtel/docs/playground.css \
  dream-dps-meter/docs/playground.css \
  impression-locale/docs/playground.css \
  jus/docs/playground.css \
  la-quittance/css/playground.css \
  mots-fleches/css/playground.css \
  no-noob-no-arnaque/src/playground.css \
  rgb-manager/docs/playground.css
do
  repo=${dest%%/*}
  dir=$(local_dir "$repo")
  if [ -n "$dir" ] && [ -d "$dir/$(dirname "${dest#*/}")" ]; then
    cp playground.css "$dir/${dest#*/}"
    echo "ok  $dest  ($(basename "$dir"))"
  else
    echo "--  $dest (projet absent)"
  fi
done
echo "Blind Test : lancer « npm run pages » pour régénérer docs/."
