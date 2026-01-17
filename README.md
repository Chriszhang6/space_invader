# Space Invaders (HTML5 + Node.js)

A retro-inspired Space Invaders clone built with HTML5 Canvas. Levels are loaded from a Node.js backend and become progressively faster each wave.

## Requirements

- Node.js **latest LTS**

## Run

- Install dependencies: `npm install`
- Start server: `npm start`
- Open http://localhost:3000

## Gameplay

- Move: Arrow keys or A/D
- Fire: Space
- Pause: P
- Start/Restart: Enter

## Levels

Levels are served from `data/levels.json` via the `/api/levels` endpoint. Update values to tweak difficulty curves.

## Deploy to GitHub Pages (zero cost)

This repository now **automatically deploys the `public/` folder to the `gh-pages` branch** using GitHub Actions whenever you push to `main`. That means you can edit, commit and push — the site will update automatically.

How to use:
1. Commit and push the repository to GitHub:
   ```bash
   git add .
   git commit -m "chore: update site"
   git push origin main
   ```
2. GitHub Actions will run and publish `public/` to the `gh-pages` branch (this may take ~1 minute).
3. Configure GitHub Pages to serve from the `gh-pages` branch (Repository → Settings → Pages). Your site will be available at `https://<your-username>.github.io/<repo-name>/`.

Notes:
- Do NOT edit files in `docs/` directly; `public/` is the single source of truth for the site.
- If you want to deploy manually or locally, the `public/` folder is ready to be pushed to any static host.
- The GitHub Action uses the repository's `GITHUB_TOKEN` so no extra secrets are required.

