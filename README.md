# Kaninfarmen

Et browserspil til Leonard: en kanin løber rundt på en gård, spiser gulerødder og undgår bonden.
Gården genereres på ny hver gang.

Built with Phaser 3 + TypeScript + Vite.

## Run

```bash
npm install
npm run dev        # http://localhost:8731
npm test           # generator tests (vitest)
npm run build      # type-check + production build to dist/
```

Useful URL parameters:

| Param | Effect |
|---|---|
| `?seed=kanin-42` | Play a specific farm (the seed is shown on the game-over screen). |
| `?debug=1` | Zoomed-out view of the whole farm, no fog of war. |
| `?canvas=1` | Force the Canvas renderer (used by the headless test driver). |

Headless smoke tests (need Google Chrome installed):

```bash
node tools/shot.mjs "http://localhost:8731/?seed=kanin-42&canvas=1" out.png click "until:s.bunny.tile.y<=44" key:ArrowLeft
node tools/touch.mjs
```

## How it plays

- The bunny **auto-runs**. Arrow keys / WASD / swipe / on-screen D-pad choose the next turn; the turn happens at the next opening. Space or tap = short sprint.
- Carrots on paths give 10 points, carrots in a carrot field 15. Eating carrots quickly builds a combo (x2, x3, x5).
- Running head-on into a fence costs a life. Turning late so you clip a fence makes the bunny **dizzy** (slow motion) and may summon the farmer behind you.
- Staying in a carrot field for a few seconds summons the farmer. He is slower than a healthy bunny but faster than a dizzy one. If he catches you: life −1.
- Pressing sideways on a path where no turn is possible switches lane, so you can grab carrots in the lane next to you.
- The minimap fills in as you explore.

## Project layout

```
src/
  config.ts          tuning constants (speeds, timers, points)
  i18n/da.ts         all Danish UI strings
  gen/               procedural farm generator (BSP plots + corridors, fences, gates, pickups)
  world/             tile ids, tilemap builder, fog of war, minimap, placeholder art
  entities/          Bunny (auto-run + turning + fence hits), Farmer (A* chase), Animal, Pickups
  systems/           input (keyboard/touch), pathfinder, event bus, synth audio
  scenes/            Boot, Menu, Game, Hud, GameOver
tests/               vitest for the generator; tests/dump.ts prints a farm as ASCII
tools/               headless Chrome drivers for screenshots and smoke tests
public/assets/       fonts and (later) sprite/tile atlases
assets-src/          raw downloaded/purchased art packs (git-ignored)
```

## Art

The game currently uses programmatic placeholder pixel art (`src/world/PlaceholderArt.ts`).
The plan is to swap in the "Pixel Farm RPG (16x16)" pack by exclusiveOlive (itch.io):
drop the unzipped pack into `assets-src/` and it will be packed into `public/assets/`.

Font: Press Start 2P (SIL OFL), see `public/assets/fonts/LICENSE.txt`.

## Deploy

Push to `main` on GitHub with the Netlify site connected; `netlify.toml` runs `npm run build` and publishes `dist/`.
