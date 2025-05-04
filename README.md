# MicroMatch - Puzzle Duel

MicroMatch is a fast-paced puzzle duel game built on Linera Protocol microchains.

## Features
- Multiplayer puzzle duels
- Scoreboard with player vs opponent
- End-of-game dialog with final results
- Linera smart contract (placeholder)

## Local Preview
1. Unzip and go to `frontend/`
2. Open `index.html` to play

## Deployment
1. Install Linera CLI.
2. Run `scripts/deploy.sh` to build and deploy the contract.
3. Update `frontend/script.js` to connect real RPC calls with `app_id.json` and `service_id.json`.

## Live Demo
Host the `frontend/` directory on GitHub Pages:
```bash
# After pushing to GitHub
# Repo root contains frontend folder
# In GitHub settings, set Pages source to /frontend
```
Live link: `https://<username>.github.io/micromatch/`