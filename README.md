# R6 Autobattler

Fan-made, non-commercial autobattler prototype using Rainbow Six Siege esports players. Not affiliated with Ubisoft.
Title data from [Liquipedia](https://liquipedia.net/rainbowsix) (CC-BY-SA 3.0).

## Layout
- `public/` - the game (static files). This folder is what gets published. Start page: `menu.html`.
- `tools/` - build scripts (Python). Run from the repo root, e.g. `python tools/build_pool.py`.
- `data/` - inputs for the build scripts. Never published.
- `functions/` - Cloudflare Pages Functions. For now just a block on private paths (see public/_routes.json).

## Run locally
    python -m http.server 8080 --directory public
Then open http://localhost:8080/menu.html

## Rebuild data
    python tools/build_rarity.py   # rarity.js from data/R6_Stats_primary_roles.csv + data/titles.json
    python tools/build_pool.py     # pool.js: the shop's player pool
    python tools/make_icons.py     # app icons

## Hosting
Cloudflare Pages, connected to this repo: https://r6-autobattler.pages.dev. `wrangler.jsonc` sets the output folder to `public/`, so data/ and tools/ are never published.
Build command: none. Deploy command: `npx wrangler deploy`. Every push to `main` deploys.
