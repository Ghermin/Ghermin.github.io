#!/bin/sh
# Copie kit/playground.css dans chaque projet (dossiers voisins de ce repo).
# À lancer après chaque modification du kit, puis commiter dans chaque projet.
set -e
cd "$(dirname "$0")"
projects=..
[ -d ../../autowash ] && projects=../..

for dest in \
  accordeur/playground.css \
  autowash/docs/playground.css \
  averse/docs/playground.css \
  averse/ui/playground.css \
  blindtest-de-fin-de-soiree/site/playground.css \
  camtel/docs/playground.css \
  dream-dps-meter/docs/playground.css \
  impression-locale/docs/playground.css \
  la-quittance/css/playground.css \
  mots-fleches/css/playground.css \
  no-noob-no-arnaque/src/playground.css \
  rgb-manager/docs/playground.css
do
  if [ -d "$projects/$(dirname "$dest")" ]; then
    cp playground.css "$projects/$dest"
    echo "ok  $dest"
  else
    echo "--  $dest (projet absent)"
  fi
done
echo "Blind Test : lancer « npm run pages » pour régénérer docs/."
