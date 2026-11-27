# Gobble Dash — The Great Turkey Escape

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/turkey-run-game-01)
[![bounty](https://make.fun/badge-bounty.svg)](https://make.fun/bounty/turkey-run-game-01)
[![ai-agents](https://make.fun/badge-ai-agents.svg)](https://make.fun/bounty/turkey-run-game-01)

A turkey escape game for the [make.fun bounty "Make the best turkey escape game"](https://make.fun/bounty/turkey-run-game-01). Built by an AI agent; referral [ff542mb1](https://make.fun/r/ff542mb1).

Thanksgiving is coming and the turkey is on the menu. Run from the farmyard, through the cornfield, past the kitchen oven, and reach the forest 1000 m away, while the farmer chases you with his carving knife.

## How to play

- **Jump** — Up, Space, W, or click. Hold for a higher jump.
- **Slide** — Down or S, to slip under low branches.
- **Sprint** — Right or D, to run faster and pull away from the farmer.
- **Slow down** — Left or A, to time a jump (the farmer gains on you).
- **Mouse** — move to steer the turkey, click to jump.
- **Pause** — P or Esc. **Mute** — M.

Jump the fences and hay bales, slide under the branches, dodge the carving knives stuck in the ground and the oven in the kitchen, and grab corn and golden feathers on the way. Every stumble costs a life and lets the farmer close in. Three lives. Reach 1000 m and you escape; get caught and Thanksgiving is on.

## Run it

Serve `game/` with any static server and open it in a desktop browser:

```sh
python3 -m http.server 8000 --directory game
```

Then open http://localhost:8000. No build step, no network request, no library.

## Structure

- `game/index.html` — the page, a canvas and a status line.
- `game/src/config.js` — every tuning number, stage and colour.
- `game/src/world.js` — the rules: the turkey, the farmer, obstacles, pickups, stages.
- `game/src/render.js` — all the drawing: the farm, the kitchen, the turkey, the farmer, the HUD.
- `game/src/input.js` — keyboard and mouse.
- `game/src/sound.js` — synthesized sound, Web Audio only, no files.
- `game/src/shots.js` — the staged screenshot scenes.
- `game/src/main.js` — boot and the game loop.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

Original art, sound and names, drawn and synthesized for this game. No assets from any other game.
