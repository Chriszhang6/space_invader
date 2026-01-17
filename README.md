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

You can publish this game as a static site using GitHub Pages. The simplest way is to serve the files from the `docs/` folder on the `main` branch (this repository already contains a `docs/` copy of the site):

1. Commit and push the repository to GitHub:
   ```bash
   git add .
   git commit -m "chore: prepare docs for GitHub Pages"
   git push origin main
   ```
2. Open your repository on GitHub → Settings → Pages → Source → choose `main` branch and `/docs` folder → Save.
3. After a minute GitHub will publish your site at `https://<your-username>.github.io/<repo-name>/`.

Notes:
- The `docs/` folder contains the static site; it is already present and up-to-date with the public build. If you update files in `public/`, copy them into `docs/` and push again.
- If you prefer a deploy tool, you can use the `gh-pages` package instead to publish the `public/` folder automatically.

