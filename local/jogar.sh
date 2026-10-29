#!/bin/sh
# Abre a luta num servidor local (precisa dele para carregar sons e imagens).
cd "$(dirname "$0")"
( sleep 1; xdg-open http://127.0.0.1:8766/ >/dev/null 2>&1 ) &
exec python3 -m http.server 8766 --bind 127.0.0.1
