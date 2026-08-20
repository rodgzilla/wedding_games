# Hosting the Wordle game on GitHub Pages

The repo's GitHub remote is `rodgzilla/wedding_games`. The site currently
lives in `wordle_game/`, not the repo root, so pick one of the two options
below.

## Option A — simplest: move the site to the repo root or `/docs`

Works with GitHub Pages' built-in branch deploy, no extra config needed.

1. Either move everything from `wordle_game/` to the repo root, or rename
   `wordle_game/` to `docs/`.
2. Commit and push to `main`.
3. On GitHub: repo → **Settings → Pages** → under "Build and deployment"
   set Source = "Deploy from a branch", Branch = `main`, folder =
   `/ (root)` or `/docs` (matching whichever you chose).
4. Save. The site publishes at `https://rodgzilla.github.io/wedding_games/`
   within a minute or two.

Recommended if you don't need to keep the `wordle_game/` folder name.

## Option B — keep `wordle_game/` where it is, deploy via GitHub Actions

No restructuring required.

1. Create `.github/workflows/pages.yml` with a workflow that uploads
   `wordle_game/` as the Pages artifact and deploys it (standard
   `actions/upload-pages-artifact` + `actions/deploy-pages` pattern).
2. On GitHub: **Settings → Pages** → Source = "GitHub Actions".
3. Push to `main` — the workflow runs automatically and publishes at the
   same `https://rodgzilla.github.io/wedding_games/` URL.

Use this if you want to keep the current folder layout.
